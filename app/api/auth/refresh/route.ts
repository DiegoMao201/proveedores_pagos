import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@/lib/tokens";
import { revokeRefreshToken } from "@/auth";

export const runtime = "nodejs";

const POSTGREST_URL = process.env.POSTGREST_URL;

/**
 * Rota el refresh token: verifica firma/expiracion, consulta auth.revoked_token
 * (UNICO lugar de toda la app donde se hace esta consulta -- ver ADDENDUM D.4),
 * y si sigue vigente emite un access+refresh token nuevos, revocando el anterior.
 */
export async function POST() {
  const session = await auth();
  const refreshToken = session?.refreshToken;

  if (!refreshToken) {
    return NextResponse.json({ error: "No hay sesion activa" }, { status: 401 });
  }

  let claims;
  try {
    claims = await verifyRefreshToken(refreshToken);
  } catch {
    return NextResponse.json({ error: "Refresh token invalido o expirado" }, { status: 401 });
  }

  const revokedCheck = await fetch(
    `${POSTGREST_URL}/revoked_token?jti=eq.${claims.jti}&select=jti`,
    {
      headers: { Authorization: `Bearer ${refreshToken}`, "Accept-Profile": "auth" },
      cache: "no-store",
    }
  );

  if (!revokedCheck.ok) {
    return NextResponse.json({ error: "No se pudo verificar el estado del token" }, { status: 500 });
  }

  const revokedRows = (await revokedCheck.json()) as Array<{ jti: string }>;
  if (revokedRows.length > 0) {
    return NextResponse.json({ error: "Refresh token revocado" }, { status: 401 });
  }

  const newAccessToken = await signAccessToken(claims.user_id, "", claims.app_role);
  const { token: newRefreshToken } = await signRefreshToken(claims.user_id, claims.app_role);

  await revokeRefreshToken(refreshToken, "rotated");

  return NextResponse.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
}
