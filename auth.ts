import NextAuth from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { postgrestAnonFetch } from "@/lib/postgrest-anon";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
  type AppRole,
} from "@/lib/tokens";

const POSTGREST_URL = process.env.POSTGREST_URL;

/**
 * Bug real encontrado en Checkpoint 3b: el access token dura 15 minutos pero la
 * sesion de NextAuth dura 24 horas -- sin esto, cualquier sesion de mas de 15 min
 * hacia que TODAS las llamadas a PostgREST fallaran con "JWT expired" (401) y
 * tumbaran la pagina completa (dashboard-data.ts no atrapaba ese error). Aqui se
 * verifica la expiracion en cada request y se rota el access+refresh token usando
 * el mismo flujo de /api/auth/refresh (verificar firma, chequear revoked_token,
 * emitir nuevos, revocar el anterior) -- pero inline en el callback jwt, que es
 * donde NextAuth realmente permite mutar el token de sesion persistido.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const refreshToken = token.refreshToken;
    if (!refreshToken) throw new Error("Sin refresh token en la sesion");

    const claims = await verifyRefreshToken(refreshToken);

    const revokedCheck = await fetch(
      `${POSTGREST_URL}/revoked_token?jti=eq.${claims.jti}&select=jti`,
      {
        headers: { Authorization: `Bearer ${refreshToken}`, "Accept-Profile": "auth" },
        cache: "no-store",
      }
    );
    if (!revokedCheck.ok) throw new Error("No se pudo verificar revocacion del refresh token");
    const revokedRows = (await revokedCheck.json()) as Array<{ jti: string }>;
    if (revokedRows.length > 0) throw new Error("Refresh token revocado");

    const newAccessToken = await signAccessToken(claims.user_id, (token.email as string) ?? "", claims.app_role);
    const { token: newRefreshToken } = await signRefreshToken(claims.user_id, claims.app_role);
    await revokeRefreshToken(refreshToken, "rotated");

    return {
      ...token,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshAccessTokenError" as const };
  }
}

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
      // "user" solo esta presente en el login inicial. El accessToken/refreshToken
      // viajan dentro del JWE encriptado propio de NextAuth, que nunca vio ni firma
      // PostgREST (ver lib/tokens.ts).
      if (user) {
        const appRole = user.role;
        const accessToken = await signAccessToken(user.id, user.email as string, appRole);
        const { token: refreshToken } = await signRefreshToken(user.id, appRole);
        token.accessToken = accessToken;
        token.refreshToken = refreshToken;
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
        token.appRole = appRole;
        token.userId = user.id;
        token.error = undefined;
        return token;
      }

      // Requests subsecuentes: el access token (15 min) vive mucho menos que la
      // sesion de NextAuth (24h) -- si ya vencio (con 30s de margen), rotarlo antes
      // de devolver el token, para que ninguna llamada a PostgREST reciba un JWT
      // expirado.
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 30_000) {
        return token;
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? "";
      session.refreshToken = token.refreshToken ?? "";
      session.user.id = token.userId ?? "";
      session.user.role = token.appRole ?? "gerencia";
      session.error = token.error;
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
