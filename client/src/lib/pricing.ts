import { calculatePricing } from "@shared/pricing";

export { calculatePricing };

export function validExchangeRate(rate: number | null | undefined): rate is number {
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0;
}

export function formatLkr(amount: number): string {
  return `LKR ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(amount))}`;
}

export function formatUsd(amount: number): string {
  return `USD ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)}`;
}

export function effectiveVisitorPriceLkr(
  priceAmount: number | null,
  visitorPriceUsd: number | null | undefined,
  rate: number | null | undefined,
): number | null {
  if (visitorPriceUsd != null && validExchangeRate(rate)) {
    try {
      return calculatePricing({
        residentCount: 0,
        visitorCount: 1,
        priceAmount: priceAmount ?? 0,
        visitorPriceUsd,
        usdToLkrRate: rate,
      }).visitorSubtotal;
    } catch {
      return priceAmount;
    }
  }
  return priceAmount;
}
