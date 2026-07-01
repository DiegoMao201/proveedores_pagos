import { AppRole } from "@/lib/tokens";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: AppRole;
    };
  }

  interface User {
    id: string;
    email: string;
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    appRole?: AppRole;
    userId?: string;
  }
}
