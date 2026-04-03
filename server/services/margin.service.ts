export function calculateWastage(dispatched: number, sold: number, returned: number): number {
  return dispatched - sold - returned;
}

export function isWithinMargin(wasted: number, dailyMargin: number): boolean {
  return wasted <= dailyMargin;
}

export function calculateChargeableLoss(wasted: number, dailyMargin: number): number {
  return Math.max(0, wasted - dailyMargin);
}

export function calculateLossAmount(chargeableLoss: number, costPrice: number): number {
  return chargeableLoss * costPrice;
}
