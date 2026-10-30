interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
}

interface RequestRecord {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter {
  private records = new Map<string, RequestRecord>();
  private windowMs: number;
  private maxRequests: number;

  constructor(options: RateLimiterOptions = { windowMs: 60 * 1000, maxRequests: 5 }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
  }

  public check(key: string): { allowed: boolean; remaining: number; resetInMs: number } {
    const now = Date.now();
    const record = this.records.get(key);

    if (!record || now > record.resetAt) {
      this.records.set(key, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, remaining: this.maxRequests - 1, resetInMs: this.windowMs };
    }

    if (record.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, resetInMs: Math.max(0, record.resetAt - now) };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  public reset(key: string): void {
    this.records.delete(key);
  }

  public clear(): void {
    this.records.clear();
  }
}

// Global OTP rate limiter: 5 attempts per 10 minutes per phone/IP
export const otpRateLimiter = new MemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
});
