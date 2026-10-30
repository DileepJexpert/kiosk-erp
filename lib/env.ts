import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(1, "NEXTAUTH_SECRET is required"),
  MOCK_OTP_ENABLED: z.enum(["true", "false"]).optional().default("false"),
  MSG91_AUTH_KEY: z.string().optional(),
  MSG91_TEMPLATE_ID: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_TEXT_MODEL: z.string().optional().default("claude-haiku-4-5-20251001"),
  CLAUDE_VISION_MODEL: z.string().optional().default("claude-sonnet-4-6"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  OPENWEATHERMAP_API_KEY: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_SECRET_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, string | undefined> = process.env): Env {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    const errorDetails = parsed.error.flatten().fieldErrors;
    // During Next.js build phase or test environments, warn instead of hard crashing
    const isBuildPhase =
      process.env.NEXT_PHASE?.includes("build") ||
      process.env.npm_lifecycle_event === "build";

    if (rawEnv.NODE_ENV === "production" && !isBuildPhase) {
      throw new Error(`Environment validation failed: ${JSON.stringify(errorDetails)}`);
    }

    return rawEnv as unknown as Env;
  }

  const data = parsed.data;

  // Strict Production Security: Never allow MOCK_OTP_ENABLED in production
  if (data.NODE_ENV === "production" && data.MOCK_OTP_ENABLED === "true") {
    data.MOCK_OTP_ENABLED = "false";
  }

  return data;
}

export const env = validateEnv();
