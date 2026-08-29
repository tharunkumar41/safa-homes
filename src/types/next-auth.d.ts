import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string | null; // optional, so AdapterUser doesn't require it
  }
  
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}