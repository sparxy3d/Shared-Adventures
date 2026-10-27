import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export type AuthUser = Omit<User, "password"> & { mustChangePassword?: boolean };

/** Where each role lands after login. */
export function homeForRole(role: string | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "vendor") return "/vendor";
  return "/";
}

/**
 * The signed-in user, or null. One shared query (key "/api/auth/me"), so every page
 * sees the same answer. Invalidate "/api/auth/me" after login, logout or profile edits.
 */
export function useAuth() {
  const query = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as { code?: string } | null;
        if (res.status === 403 && payload?.code === "PASSWORD_CHANGE_REQUIRED" &&
            typeof window !== "undefined" && window.location.pathname !== "/set-password") {
          window.location.assign("/set-password");
        }
        throw new Error(`${res.status}: ${payload?.code ?? "Account could not be loaded"}`);
      }
      return res.json();
    },
  });
  const user = query.data ?? null;
  return {
    user,
    isLoading: query.isLoading,
    error: query.error,
    retry: query.refetch,
    isAdmin: user?.role === "admin",
    isVendor: user?.role === "vendor",
    isMember: user?.role === "customer",
  };
}
