import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Edge Runtime (default de middleware). Solo decodifica el JWE de NextAuth
// (sin llamadas a Postgres/PostgREST) para saber si hay sesion y que rol tiene,
// y redirige. La revocacion real de refresh tokens vive en app/api/auth/refresh
// (Node runtime), NO aqui -- ver ADDENDUM seccion D.4.
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/api/auth");
  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
