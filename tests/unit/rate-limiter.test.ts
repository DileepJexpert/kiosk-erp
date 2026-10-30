import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRateLimiter } from "@/lib/rate-limiter";

describe("MemoryRateLimiter", () => {
  let limiter: MemoryRateLimiter;

  beforeEach(() => {
    limiter = new MemoryRateLimiter({ windowMs: 1000, maxRequests: 3 });
  });

  it("should allow requests under the limit", () => {
    const res1 = limiter.check("user-1");
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check("user-1");
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check("user-1");
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it("should block requests exceeding the limit", () => {
    limiter.check("user-2");
    limiter.check("user-2");
    limiter.check("user-2");

    const blocked = limiter.check("user-2");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInMs).toBeGreaterThan(0);
  });

  it("should track different keys separately", () => {
    limiter.check("key-a");
    limiter.check("key-a");
    limiter.check("key-a");

    expect(limiter.check("key-a").allowed).toBe(false);
    expect(limiter.check("key-b").allowed).toBe(true);
  });

  it("should reset properly when requested", () => {
    limiter.check("key-reset");
    limiter.check("key-reset");
    limiter.check("key-reset");
    expect(limiter.check("key-reset").allowed).toBe(false);

    limiter.reset("key-reset");
    expect(limiter.check("key-reset").allowed).toBe(true);
  });
});
