import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { RequireRole } from "@/components/require-role";
import { Button } from "@/components/ui/button";
import "@/components/stage-one.css";

export default function MemberLayout({ title, children }: { title: string; children: ReactNode }) {
  const [path] = useLocation();
  return <div className="stage-one min-h-screen bg-[#FFF8F1]"><Navbar /><RequireRole role="customer">
    <main className="mx-auto w-full max-w-[1200px] px-4 py-8">
      <nav className="mb-8 flex flex-wrap gap-2" aria-label="Member account">
        {[["/account/bookings", "My bookings"], ["/account/saved", "Bucket list"], ["/account/profile", "Profile"]].map(([href, label]) =>
          <Link key={href} href={href} className={`inline-flex min-h-11 items-center rounded-xl px-4 ${path === href ? "bg-[#FF6B24] text-[#171717] font-semibold" : "bg-white text-slate-700"}`} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <h1 className="mb-6 text-3xl font-bold text-[#171717]">{title}</h1>{children}
    </main>
  </RequireRole><Footer /></div>;
}

export function MemberLoading() {
  return <div role="status" aria-label="Loading" className="space-y-4">{[1, 2, 3].map(n => <div key={n} className="h-32 animate-pulse rounded-2xl bg-slate-200" />)}</div>;
}
export function MemberError({ retry, message = "We couldn’t load this page." }: { retry: () => void; message?: string }) {
  return <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6"><p>{message}</p><Button className="mt-4" onClick={retry}>Retry</Button></div>;
}
