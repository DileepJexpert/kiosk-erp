import { describe, it, expect } from "vitest";
import {
  calculateLoyaltyStampProgression,
  formatStampDisplay,
  generateWhatsAppPassbookMessage,
} from "@/server/services/loyalty.service";

describe("Digital WhatsApp Loyalty Stamp Calculations", () => {
  it("should increment stamps normally when below target", () => {
    // 0 to 1 stamp
    const step1 = calculateLoyaltyStampProgression(0, 5);
    expect(step1.newStamps).toBe(1);
    expect(step1.rewardEarned).toBe(false);
    expect(step1.extraReward).toBe(0);

    // 3 to 4 stamps
    const step4 = calculateLoyaltyStampProgression(3, 5);
    expect(step4.newStamps).toBe(4);
    expect(step4.rewardEarned).toBe(false);
    expect(step4.extraReward).toBe(0);
  });

  it("should trigger reward and reset stamps upon reaching 5th stamp", () => {
    // 4 to 5 stamps: '5 Chai par 1 Free'
    const step5 = calculateLoyaltyStampProgression(4, 5);
    expect(step5.newStamps).toBe(0); // resets cycle
    expect(step5.rewardEarned).toBe(true);
    expect(step5.extraReward).toBe(1);
  });

  it("should format visual stamp progress cleanly with emojis", () => {
    expect(formatStampDisplay(0, 5)).toBe("⚪⚪⚪⚪⚪");
    expect(formatStampDisplay(3, 5)).toBe("⭐⭐⭐⚪⚪");
    expect(formatStampDisplay(5, 5)).toBe("⭐⭐⭐⭐⭐");
  });

  it("should generate proper WhatsApp passbook URL and message without requiring an app", () => {
    const result = generateWhatsAppPassbookMessage({
      kioskName: "Cyber City Chai",
      phone: "9876543210",
      stampsCount: 3,
      freeChaisAvailable: 0,
      target: 5,
    });

    expect(result.message).toContain("Cyber City Chai");
    expect(result.message).toContain("⭐⭐⭐⚪⚪");
    expect(result.message).toContain("Buy 2 more chais");
    expect(result.url).toContain("https://wa.me/919876543210");
  });

  it("should highlight reward redemption instruction if free chai is available", () => {
    const result = generateWhatsAppPassbookMessage({
      kioskName: "Metro Kiosk",
      phone: "9988776655",
      stampsCount: 0,
      freeChaisAvailable: 1,
      target: 5,
    });

    expect(result.message).toContain("FREE Chai ready to claim");
    expect(result.message).toContain("FREECHAI0");
  });
});
