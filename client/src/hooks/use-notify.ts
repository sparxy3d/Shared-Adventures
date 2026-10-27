import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type NotifyDetails = { email: string; name?: string };

export function useNotify(experienceId: number) {
  return useMutation({
    mutationFn: async (details: NotifyDetails) => {
      const response = await apiRequest("POST", `/api/experiences/${experienceId}/notify`, details);
      return response.json() as Promise<{ ok: true }>;
    },
  });
}
