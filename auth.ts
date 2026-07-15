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
  type Sede,
} from "@/lib/tokens";

const POSTGREST_URL = process.env.POSTGREST_URL;

/**
 * Bug real encontrado en Checkpoint 3b: el access token dura 15 minutos pero la
 * sesion de NextAuth dura 24 horas -- sin esto, cualquier sesion de mas de 15 min
 * hacia que TODAS las llamadas a PostgREST fallaran con "JWT expired" (401) y
 * tumbaran la pagina completa (dashboard-data.ts no atrapaba ese error).
 *
 * Segundo bug real encontrado al VERIFICAR EMPIRICAMENTE el primer fix (no
 * bastaba con que compilara): las paginas hacen varios fetch en paralelo
 * (Promise.all en dashboard-data.ts), y cada uno de lib/postgrest.ts llama a
 * auth() por su cuenta. Con 4-5 llamadas concurrentes dentro del MISMO request,
 * la primera en terminar rotaba Y REVOCABA el refresh token viejo -- las demas,
 * que arrancaron con esa misma copia (todavia expirada) del token antes de que
 * la primera terminara, se encontraban el refresh token ya revocado y fallaban
 * en cascada ("Refresh token revocado" x9 en los logs). Rotar el refresh token
 * en cada renovacion silenciosa era el problema: la solucion es NO rotarlo aqui
 * -- solo emitir un access token nuevo y conservar el mismo refresh token hasta
 * que expire de verdad (24h) o el usuario cierre sesion. Sin revocacion de por
 * medio, las llamadas concurrentes ya no pueden invalidarse entre si.
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

    const newAccessToken = await signAccessToken(claims.user_id, (token.email as string) ?? "", claims.app_role, claims.sede);

    return {
      ...token,
      accessToken: newAccessToken,
      accessTokenExpires: Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000,
      error: undefined,
    };
  } catch (err) {
    // No silenciar: un refresh fallido sin rastro es indetectable en produccion.
    console.error("[auth] refreshAccessToken failed:", err instanceof Error ? err.message : err);
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
  full_name: string | null;
  sede: Sede | null;
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
          `/v_login_lookup?email=eq.${encodeURIComponent(email)}&select=id,email,password_hash,role,active,full_name,sede`,
          {},
          "auth"
        );
        if (!res.ok) return null;

        const rows = (await res.json()) as LoginLookupRow[];
        const user = rows[0];
        if (!user || !user.active) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role, name: user.full_name ?? undefined, sede: user.sede };
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
        const sede = user.sede;
        const accessToken = await signAccessToken(user.id, user.email as string, appRole, sede);
        const { token: refreshToken } = await signRefreshToken(user.id, appRole, sede);
        token.accessToken = accessToken;
        token.refreshToken = refreshToken;
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000;
        token.appRole = appRole;
        token.sede = sede;
        token.userId = user.id;
        token.name = user.name;
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

      // Bug real encontrado al verificar empiricamente el fix anterior: este
      // callback jwt corre DOS VECES por request -- una en proxy.ts (middleware,
      // Edge Runtime, solo necesita saber si hay sesion) y otra en los Server
      // Components (Node runtime, donde SI se usa el accessToken contra
      // PostgREST). Si el refresh (que revoca el refresh token viejo) corria en
      // ambos, el segundo intento fallaba porque el primero ya habia revocado el
      // token que el segundo todavia tenia en su copia del JWT. En Edge basta con
      // que exista una sesion (proxy.ts solo chequea "!!req.auth"), asi que ahi se
      // deja el token tal cual (sin refrescar) y el refresh real ocurre una sola
      // vez, del lado de Node.
      if (process.env.NEXT_RUNTIME === "edge") {
        return token;
      }
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? "";
      session.refreshToken = token.refreshToken ?? "";
      session.user.id = token.userId ?? "";
      session.user.role = token.appRole ?? "gerencia";
      session.user.sede = token.sede ?? null;
      session.user.name = token.name ?? null;
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
