import { useQuery } from "@tanstack/react-query";
import { validExchangeRate } from "@/lib/pricing";

export type PricingConfig = { usdToLkrRate: number | null };

export function usePricingConfig() {
  const query = useQuery<PricingConfig>({
    queryKey: ["/api/pricing-config"],
    queryFn: async () => {
      const response = await fetch("/api/pricing-config", { credentials: "include" });
      if (!response.ok) throw new Error("Pricing configuration could not be loaded");
      return response.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const rawRate = query.data?.usdToLkrRate;
  return {
    ...query,
    usdToLkrRate: !query.isError && validExchangeRate(rawRate) ? rawRate : null,
  };
}
