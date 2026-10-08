import type { ReactNode } from "react";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/**
 * Client-side gate for role areas. It only decides what to render; the server guards
 * on /api/admin and /api/vendor are the real security.
 */
export function RequireRole({ role, children }: { role: "admin" | "vendor" | "customer" | "any"; children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }
  if (!user) {
    const next = typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : "";
    return <Redirect to={`/login?next=${next}`} />;
  }
  if (role !== "any" && user.role !== role) return <Redirect to="/" />;
  return <>{children}</>;
}
