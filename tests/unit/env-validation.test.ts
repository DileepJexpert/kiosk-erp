import { describe, it, expect } from "vitest";
import { validateEnv, envSchema } from "@/lib/env";

describe("Environment Validation", () => {
  it("should validate a complete valid production configuration", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXTAUTH_URL: "https://kiosk-erp.example.com",
      NEXTAUTH_SECRET: "secure-secret-key-32-characters-min",
      MOCK_OTP_ENABLED: "false",
    };

    const valid = validateEnv(raw);
    expect(valid.NODE_ENV).toBe("production");
    expect(valid.MOCK_OTP_ENABLED).toBe("false");
    expect(valid.PORT).toBe(3000);
  });

  it("should force MOCK_OTP_ENABLED to false if set to true in production", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXTAUTH_URL: "https://kiosk-erp.example.com",
      NEXTAUTH_SECRET: "secure-secret-key-32-characters-min",
      MOCK_OTP_ENABLED: "true",
    };

    const valid = validateEnv(raw);
    expect(valid.MOCK_OTP_ENABLED).toBe("false");
  });

  it("should reject missing DATABASE_URL in production", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "",
      NEXTAUTH_SECRET: "secure-secret-key-32-characters-min",
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });

  it("should reject missing NEXTAUTH_SECRET in production", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXTAUTH_SECRET: "",
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });
});
