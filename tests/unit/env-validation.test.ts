import { describe, it, expect } from "vitest";
import { validateEnv, envSchema } from "@/lib/env";

describe("Environment Validation", () => {
  it("should validate a complete valid production configuration with SMS provider", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXTAUTH_URL: "https://kiosk-erp.example.com",
      NEXTAUTH_SECRET: "secure-secret-key-32-characters-min",
      MSG91_AUTH_KEY: "real-msg91-auth-key",
      MOCK_OTP_ENABLED: "false",
    };

    const valid = validateEnv(raw);
    expect(valid.NODE_ENV).toBe("production");
    expect(valid.MOCK_OTP_ENABLED).toBe("false");
    expect(valid.PORT).toBe(3000);
  });

  it("should automatically enable mock OTP when no SMS provider is set for zero-cost operation", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      NEXTAUTH_URL: "https://kiosk-erp.example.com",
      NEXTAUTH_SECRET: "secure-secret-key-32-characters-min",
    };

    const valid = validateEnv(raw);
    expect(valid.MOCK_OTP_ENABLED).toBe("true");
  });

  it("should supply default fallback secrets if omitted", () => {
    const raw = {
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    };

    const valid = validateEnv(raw);
    expect(valid.AUTH_SECRET).toBeDefined();
    expect(valid.NEXTAUTH_SECRET).toBeDefined();
  });

  it("should reject missing DATABASE_URL in production", () => {
    const raw = {
      NODE_ENV: "production",
      DATABASE_URL: "",
      NEXTAUTH_SECRET: "secure-secret-key-32-characters-min",
    };

    expect(() => validateEnv(raw)).toThrowError(/Environment validation failed/);
  });
});
