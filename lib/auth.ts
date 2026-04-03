import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const phone = credentials?.phone as string;
        const otp = credentials?.otp as string;

        if (!phone || !otp) return null;

        // Verify OTP
        const isValid = await verifyOTP(phone, otp);
        if (!isValid) return null;

        // Find user by phone
        const user = await db.user.findUnique({
          where: { phone },
          select: { id: true, name: true, phone: true, role: true, isActive: true },
        });

        if (!user || !user.isActive) return null;

        return {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.phone = (user as any).phone;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).phone = token.phone as string;
        (session.user as any).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  // Mock OTP mode for development
  if (process.env.MOCK_OTP_ENABLED === "true") {
    return otp.length === 6 && /^\d+$/.test(otp);
  }

  // Production: Verify with MSG91
  try {
    const response = await fetch(
      `https://api.msg91.com/api/v5/otp/verify?otp=${otp}&mobile=91${phone}`,
      {
        method: "GET",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY || "",
        },
      }
    );
    const data = await response.json();
    return data.type === "success";
  } catch {
    return false;
  }
}

export async function sendOTP(phone: string): Promise<boolean> {
  if (process.env.MOCK_OTP_ENABLED === "true") {
    console.log(`[MOCK OTP] Sending OTP to ${phone} - use any 6-digit code`);
    return true;
  }

  try {
    const response = await fetch(
      `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=91${phone}`,
      {
        method: "POST",
        headers: {
          authkey: process.env.MSG91_AUTH_KEY || "",
          "Content-Type": "application/json",
        },
      }
    );
    const data = await response.json();
    return data.type === "success";
  } catch {
    return false;
  }
}
