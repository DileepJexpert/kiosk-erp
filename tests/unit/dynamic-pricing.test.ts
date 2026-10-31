import { describe, it, expect } from "vitest";
import {
  isRuleActiveAtTime,
  calculateAdjustedPrice,
} from "@/server/services/dynamic-pricing.service";

describe("Automated Dynamic Pricing Engine", () => {
  describe("isRuleActiveAtTime", () => {
    it("should return false when rule is toggled off", () => {
      const active = isRuleActiveAtTime({
        name: "Inactive Test",
        adjustmentType: "PERCENTAGE",
        adjustmentValue: -15,
        startTime: "14:00",
        endTime: "18:00",
        daysOfWeek: [1, 2, 3, 4, 5],
        isActive: false,
      });

      expect(active).toBe(false);
    });

    it("should activate during the scheduled time window on valid day of week", () => {
      // Wednesday 15:30 (Day 3)
      const wednesdayAfternoon = new Date("2026-10-28T15:30:00");

      const active = isRuleActiveAtTime(
        {
          name: "Happy Hour 3-5 PM",
          adjustmentType: "PERCENTAGE",
          adjustmentValue: -20,
          startTime: "15:00",
          endTime: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
          isActive: true,
        },
        wednesdayAfternoon
      );

      expect(active).toBe(true);
    });

    it("should reject outside scheduled time window", () => {
      // Wednesday 17:30 (Day 3) - outside 15:00-17:00
      const wednesdayEvening = new Date("2026-10-28T17:30:00");

      const active = isRuleActiveAtTime(
        {
          name: "Happy Hour 3-5 PM",
          adjustmentType: "PERCENTAGE",
          adjustmentValue: -20,
          startTime: "15:00",
          endTime: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          isActive: true,
        },
        wednesdayEvening
      );

      expect(active).toBe(false);
    });

    it("should reject on unconfigured day of week even within time window", () => {
      // Sunday 16:00 (Day 0) - Rule only applies Mon-Fri
      const sundayAfternoon = new Date("2026-10-25T16:00:00");

      const active = isRuleActiveAtTime(
        {
          name: "Weekday Rush Discount",
          adjustmentType: "PERCENTAGE",
          adjustmentValue: -10,
          startTime: "15:00",
          endTime: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5],
          isActive: true,
        },
        sundayAfternoon
      );

      expect(active).toBe(false);
    });
  });

  describe("calculateAdjustedPrice", () => {
    it("should apply percentage discount correctly", () => {
      // ₹100 item with -20% happy hour -> ₹80
      const price = calculateAdjustedPrice(100, "PERCENTAGE", -20);
      expect(price).toBe(80);
    });

    it("should apply percentage surge pricing correctly", () => {
      // ₹50 chai with +10% rain/weather surge -> ₹55
      const price = calculateAdjustedPrice(50, "PERCENTAGE", 10);
      expect(price).toBe(55);
    });

    it("should apply fixed rupee adjustments correctly", () => {
      // ₹60 snack with -₹5 flat discount -> ₹55
      const discounted = calculateAdjustedPrice(60, "FIXED_AMOUNT", -5);
      expect(discounted).toBe(55);

      // ₹60 snack with +₹10 surge -> ₹70
      const surged = calculateAdjustedPrice(60, "FIXED_AMOUNT", 10);
      expect(surged).toBe(70);
    });

    it("should never produce a negative price", () => {
      const price = calculateAdjustedPrice(30, "FIXED_AMOUNT", -50);
      expect(price).toBe(0);
    });
  });
});
