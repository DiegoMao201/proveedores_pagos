import { AppRole, Sede } from "@/lib/tokens";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken: string;
    error?: "RefreshAccessTokenError";
    user: {
      id: string;
      email: string;
      role: AppRole;
      sede?: Sede | null;
      name?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    role: AppRole;
    sede?: Sede | null;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    appRole?: AppRole;
    sede?: Sede | null;
    userId?: string;
    error?: "RefreshAccessTokenError";
  }
}
