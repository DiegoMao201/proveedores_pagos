import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { postgrestAnonFetch } from "@/lib/postgrest-anon";
import { signAccessToken, signRefreshToken, verifyRefreshToken, type AppRole } from "@/lib/tokens";

const POSTGREST_URL = process.env.POSTGREST_URL;

/** Revoca un refresh token insertando su jti en auth.revoked_token, autenticado
 * como el propio usuario (via el refresh token todavia valido como bearer). */
async function revokeRefreshToken(refreshToken: string, reason: string): Promise<void> {
  try {
    const claims = await verifyRefreshToken(refreshToken);
    await fetch(`${POSTGREST_URL}/revoked_token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
        "Content-Type": "application/json",
        "Content-Profile": "auth",
      },
      body: JSON.stringify({ jti: claims.jti, user_id: claims.user_id, reason }),
    });
  } catch {
    // Token ya invalido/expirado: no hay nada que revocar.
  }
}

interface LoginLookupRow {
  id: string;
  email: string;
  password_hash: string;
  role: AppRole;
  active: boolean;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const res = await postgrestAnonFetch(
          `/v_login_lookup?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash,role,active`,
          {},
          "auth"
        );
        if (!res.ok) return null;

        const rows = (await res.json()) as LoginLookupRow[];
        const user = rows[0];
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Solo se ejecuta con "user" presente en el login inicial. En requests
      // subsecuentes, NextAuth reutiliza el token ya emitido (nuestro
      // accessToken/refreshToken viajan dentro del JWE encriptado propio de
      // NextAuth, que nunca vio ni firma PostgREST -- ver lib/tokens.ts).
      if (user) {
        const appRole = user.role;
        const accessToken = await signAccessToken(user.id, user.email as string, appRole);
        const { token: refreshToken } = await signRefreshToken(user.id, appRole);
        token.accessToken = accessToken;
        token.refreshToken = refreshToken;
        token.appRole = appRole;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? "";
      session.refreshToken = token.refreshToken ?? "";
      session.user.id = token.userId ?? "";
      session.user.role = token.appRole ?? "gerencia";
      return session;
    },
  },
  events: {
    async signOut(message) {
      // NextAuth v5 pasa { token } cuando la sesion usa estrategia "jwt".
      const token = "token" in message ? message.token : undefined;
      if (token?.refreshToken) {
        await revokeRefreshToken(token.refreshToken, "logout");
      }
    },
  },
});

export { revokeRefreshToken };
