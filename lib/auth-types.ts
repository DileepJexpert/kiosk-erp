import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface User {
    phone?: string;
    role?: UserRole;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      phone: string;
      role: UserRole;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    phone: string;
    role: UserRole;
  }
}
