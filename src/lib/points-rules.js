// Shared, browser-safe rules. Money is supplied in cents; rewards are whole USD points.
export const MIN_POINTS_REDEMPTION = 5000
export const POINTS_REDEMPTION_STEP = 1000

export function purchaseRewardPoints(amountPaidCents) {
  if (!Number.isSafeInteger(amountPaidCents) || amountPaidCents < 0) {
    throw new Error('A valid paid amount is required to calculate purchase points.')
  }
  return Math.floor(amountPaidCents / 100)
}

export function isValidPointsSelection(points) {
  return Number.isSafeInteger(points) && (points === 0
    || (points >= MIN_POINTS_REDEMPTION && points % POINTS_REDEMPTION_STEP === 0))
}

export function pointsSelectionOptions(balance) {
  if (!Number.isSafeInteger(balance) || balance < MIN_POINTS_REDEMPTION) return []
  const count = Math.floor((balance - MIN_POINTS_REDEMPTION) / POINTS_REDEMPTION_STEP) + 1
  return Array.from({ length: count }, (_, index) => MIN_POINTS_REDEMPTION + index * POINTS_REDEMPTION_STEP)
}

export function pointsDiscountForBalance(balance, priceCents, requestedPoints, conversionPercent) {
  const empty = { eligible: false, discountPercent: 0, discountCents: 0, pointsToUse: 0 }
  if (!isValidPointsSelection(requestedPoints) || requestedPoints === 0
    || !Number.isSafeInteger(balance) || balance < MIN_POINTS_REDEMPTION
    || !Number.isSafeInteger(priceCents) || priceCents <= 0
    || !Number.isFinite(conversionPercent) || conversionPercent <= 0 || conversionPercent > 100) return empty

  const pointsToUse = Math.min(requestedPoints, Math.floor(balance / POINTS_REDEMPTION_STEP) * POINTS_REDEMPTION_STEP)
  // Points represent whole dollars. Convert the selected points to a dollar
  // discount, then cents: points * (rate / 100) * 100. Never discount past zero.
  const discountPercent = conversionPercent
  return {
    eligible: true,
    discountPercent,
    discountCents: Math.min(priceCents, Math.floor(pointsToUse * conversionPercent)),
    pointsToUse,
  }
}
