export type PricingInput = {
  residentCount: number;
  visitorCount: number;
  priceAmount: number;
  visitorPriceUsd: number | null;
  usdToLkrRate: number | null;
};

/** Integer-dollar price multiplied by a six-decimal rate, then rounded once in LKR. */
export function calculatePricing(input: PricingInput) {
  const { residentCount, visitorCount, priceAmount, visitorPriceUsd, usdToLkrRate } = input;
  if (![residentCount, visitorCount, priceAmount].every(n => Number.isSafeInteger(n) && n >= 0)
    || (visitorPriceUsd !== null && (!Number.isSafeInteger(visitorPriceUsd) || visitorPriceUsd < 0))) {
    throw new Error("Use whole non-negative prices and group counts");
  }
  if (visitorCount > 0 && visitorPriceUsd !== null
    && (usdToLkrRate === null || !Number.isFinite(usdToLkrRate) || usdToLkrRate <= 0)) {
    throw new Error("Visitor bookings are unavailable until the exchange rate is set");
  }
  const residentSubtotal = residentCount * priceAmount;
  const rateMicros = BigInt(Math.round((usdToLkrRate ?? 0) * 1_000_000));
  const visitorSubtotal = visitorPriceUsd === null ? visitorCount * priceAmount
    : Number((BigInt(visitorCount) * BigInt(visitorPriceUsd) * rateMicros + BigInt(500_000)) / BigInt(1_000_000));
  const totalAmount = residentSubtotal + visitorSubtotal;
  if (!Number.isSafeInteger(totalAmount) || totalAmount > 2_147_483_647) {
    throw new Error("This booking total is too large");
  }
  return { totalAmount, residentSubtotal, visitorSubtotal };
}

export function commissionForVendor(
  vendor: { firstListingPublishedAt: Date | string | null; commissionOverrideRate: number | string | null },
  settings: { introductoryRate: number | string; standardRate: number | string; introductoryMonths: number },
  now = new Date(),
) {
  const start = vendor.firstListingPublishedAt ? new Date(vendor.firstListingPublishedAt) : null;
  let end: Date | null = null;
  if (start) {
    end = new Date(start);
    const day = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + settings.introductoryMonths);
    const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(day, lastDay));
  }
  const overridden = vendor.commissionOverrideRate !== null;
  const introductory = !overridden && !!start && !!end && now >= start && now < end;
  return {
    rate: Number(overridden ? vendor.commissionOverrideRate : introductory ? settings.introductoryRate : settings.standardRate),
    introductory, introductoryEndsAt: end?.toISOString() ?? null, overridden,
  };
}
