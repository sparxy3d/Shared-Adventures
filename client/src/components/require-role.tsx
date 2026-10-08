import type { ReactNode } from "react";
import { Link, Redirect } from "wouter";
import { homeForRole, useAuth } from "@/hooks/use-auth";

/**
 * Client-side gate for role areas. It only decides what to render; the server guards
 * on /api/admin and /api/vendor are the real security.
 */
export function RequireRole({ role, children }: { role: "admin" | "vendor" | "customer" | "any"; children: ReactNode }) {
  const { user, isLoading, error, retry } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-40 w-full max-w-lg animate-pulse rounded-2xl bg-slate-200" role="status" aria-label="Loading account" />
      </div>
    );
  }
  if (error) return <div className="p-8 text-center" role="alert"><p>We couldn’t load your account.</p><button className="min-h-11 underline" onClick={() => retry()}>Retry</button></div>;
  if (!user) {
    const next = typeof window !== "undefined" ? encodeURIComponent(window.location.pathname + window.location.search) : "";
    return <Redirect to={`/login?next=${next}`} />;
  }
  if (role !== "any" && user.role !== role) return <div className="p-8 text-center"><h1 className="text-xl font-bold">This page is for {role === "customer" ? "members" : `${role}s`}</h1><Link className="inline-flex min-h-11 items-center underline" href={homeForRole(user.role)}>Go to your home</Link></div>;
  return <>{children}</>;
}
