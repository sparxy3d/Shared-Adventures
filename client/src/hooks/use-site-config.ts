import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type SiteConfig = { showDemoContent: boolean; bookingsOpen: boolean };

export function useSiteConfig() {
  return useQuery<SiteConfig>({
    queryKey: ["/api/site-config"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/site-config");
      return response.json();
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
