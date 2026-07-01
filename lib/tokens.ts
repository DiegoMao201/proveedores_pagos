import { SignJWT, jwtVerify } from "jose";

// crypto.randomUUID() es parte de la Web Crypto API global -- disponible tanto
// en Node.js 18+ como en Edge Runtime, a diferencia de `import { randomUUID }
// from "crypto"` (modulo de Node, no soportado en Edge -- el middleware corre
// en Edge Runtime por defecto). Encontrado por el propio warning de build.

export type AppRole = "admin" | "tesoreria" | "contabilidad" | "gerencia";

export interface AccessTokenClaims {
  role: "web_authenticated";
  app_role: AppRole;
  user_id: string;
  email: string;
}

export interface RefreshTokenClaims {
  role: "web_authenticated";
  app_role: AppRole;
  user_id: string;
  jti: string;
}

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 24 * 60 * 60;

function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET no esta configurado (debe ser igual a PGRST_JWT_SECRET)");
  }
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(userId: string, email: string, appRole: AppRole): Promise<string> {
  return new SignJWT({ role: "web_authenticated", app_role: appRole, user_id: userId, email } satisfies AccessTokenClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

export async function signRefreshToken(userId: string, appRole: AppRole): Promise<{ token: string; jti: string }> {
  const jti = crypto.randomUUID();
  const token = await new SignJWT({ role: "web_authenticated", app_role: appRole, user_id: userId, jti } satisfies RefreshTokenClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(getSecretKey());
  return { token, jti };
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as unknown as AccessTokenClaims;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
  const { payload } = await jwtVerify(token, getSecretKey());
  return payload as unknown as RefreshTokenClaims;
}
