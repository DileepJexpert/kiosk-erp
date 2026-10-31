export interface StampProgressionResult {
  nextStamps: number;
  rewardEarned: boolean;
  newStamps: number;
  extraReward: number;
}

export function calculateLoyaltyStampProgression(
  currentStamps: number,
  targetStamps = 5
): StampProgressionResult {
  const nextStamps = currentStamps + 1;
  const rewardEarned = nextStamps >= targetStamps;
  const newStamps = rewardEarned ? nextStamps % targetStamps : nextStamps;
  const extraReward = rewardEarned ? 1 : 0;

  return {
    nextStamps,
    rewardEarned,
    newStamps,
    extraReward,
  };
}

export function formatStampDisplay(stamps: number, target = 5): string {
  const safeStamps = Math.max(0, Math.min(stamps, target));
  return "⭐".repeat(safeStamps) + "⚪".repeat(target - safeStamps);
}

export function generateWhatsAppPassbookMessage(options: {
  kioskName?: string;
  phone: string;
  stampsCount: number;
  freeChaisAvailable: number;
  target?: number;
}): { message: string; url: string } {
  const target = options.target || 5;
  const starIcons = formatStampDisplay(options.stampsCount, target);

  const message =
    `☕ *${options.kioskName || "Kiosk Chai Club"} — Digital Stamp Passbook* ☕\n\n` +
    `Customer Phone: ${options.phone}\n` +
    `Your Progress: [${starIcons}] (${options.stampsCount}/${target} Chais)\n` +
    (options.freeChaisAvailable > 0
      ? `🎁 *You have ${options.freeChaisAvailable} FREE Chai ready to claim! Show code: FREECHAI${options.stampsCount} at the counter!*\n\n`
      : `⚡ Buy ${target - options.stampsCount} more chais to get your next FREE cup!\n\n`) +
    `No app download required. Thank you for your daily visits!`;

  const encoded = encodeURIComponent(message);
  return {
    message,
    url: `https://wa.me/91${options.phone}?text=${encoded}`,
  };
}
