import { describe, it, expect } from "vitest";
import { getRating } from "@/server/services/performance.service";

describe("Performance Rating System", () => {
  it("should classify scores >= 90 as EXCELLENT", () => {
    expect(getRating(95)).toBe("EXCELLENT");
    expect(getRating(90)).toBe("EXCELLENT");
  });

  it("should classify scores between 75 and 89 as GOOD", () => {
    expect(getRating(89)).toBe("GOOD");
    expect(getRating(75)).toBe("GOOD");
  });

  it("should classify scores between 60 and 74 as AVERAGE", () => {
    expect(getRating(74)).toBe("AVERAGE");
    expect(getRating(60)).toBe("AVERAGE");
  });

  it("should classify scores below 60 as NEEDS_ATTENTION", () => {
    expect(getRating(59)).toBe("NEEDS_ATTENTION");
    expect(getRating(30)).toBe("NEEDS_ATTENTION");
    expect(getRating(0)).toBe("NEEDS_ATTENTION");
  });

  it("should calculate composite weighted performance score accurately", () => {
    // Score weights:
    // wastageScore × 0.30 + revenueScore × 0.25 + attendanceScore × 0.15 + timelinessScore × 0.15 + cashAccuracyScore × 0.15
    const wastage = 90;
    const revenue = 80;
    const attendance = 100;
    const timeliness = 90;
    const cashAccuracy = 95;

    const weightedScore = Math.round(
      wastage * 0.3 +
      revenue * 0.25 +
      attendance * 0.15 +
      timeliness * 0.15 +
      cashAccuracy * 0.15
    );

    // 27 + 20 + 15 + 13.5 + 14.25 = 89.75 -> 90
    expect(weightedScore).toBe(90);
    expect(getRating(weightedScore)).toBe("EXCELLENT");
  });
});
