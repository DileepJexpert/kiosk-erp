export interface DynamicRuleInput {
  name: string;
  adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT";
  adjustmentValue: number;
  startTime: string; // "HH:MM"
  endTime: string;   // "HH:MM"
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  isActive: boolean;
}

export function isRuleActiveAtTime(rule: DynamicRuleInput, date: Date = new Date()): boolean {
  if (!rule.isActive) return false;

  const dayOfWeek = date.getDay();
  if (rule.daysOfWeek && rule.daysOfWeek.length > 0 && !rule.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const currentTime = `${hours}:${minutes}`;

  if (rule.startTime <= rule.endTime) {
    // Normal same-day window e.g. 14:00 to 18:00
    return currentTime >= rule.startTime && currentTime <= rule.endTime;
  } else {
    // Overnight window e.g. 22:00 to 02:00
    return currentTime >= rule.startTime || currentTime <= rule.endTime;
  }
}

export function calculateAdjustedPrice(
  basePrice: number,
  adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT",
  adjustmentValue: number
): number {
  if (adjustmentType === "PERCENTAGE") {
    // e.g. -20 for 20% discount, +10 for 10% surge
    const factor = 1 + adjustmentValue / 100;
    return Math.max(0, Math.round(basePrice * factor * 100) / 100);
  } else {
    // Fixed rupee adjustment e.g. -5 for Rs 5 off, +10 for Rs 10 surge
    return Math.max(0, basePrice + adjustmentValue);
  }
}
