import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, CalendarDays, ClipboardList, BarChart3, Store, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import "./vendor-stage-four.css";

const links = [
  { label: "Dashboard", href: "/vendor", icon: LayoutDashboard },
  { label: "Bookings", href: "/vendor/bookings", icon: ClipboardList },
  { label: "Listings", href: "/vendor/experiences", icon: Store },
  { label: "Schedule", href: "/vendor/schedule", icon: CalendarDays },
  { label: "Stats", href: "/vendor/stats", icon: BarChart3 },
  { label: "Business profile", href: "/vendor/profile", icon: Store },
];

export default function VendorShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const vendorQuery = useQuery<{ businessName: string }>({ queryKey: ["/api/vendor/profile"] });
  const [path] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const client = useQueryClient();
  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.assign("/login");
    },
  });
  const businessName = vendorQuery.data?.businessName || user?.fullName || "Your business";
  const active = (href: string) => href === "/vendor" ? path === href : path.startsWith(href);
  const logoutButton = <button className="vs-logout" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut size={17} />{logout.isPending ? "Signing out…" : "Log out"}</button>;

  return <div className="vendor-app">
    <aside className="vs-sidebar" aria-label="Vendor navigation">
      <Link href="/vendor" className="vs-brand"><span className="vs-mark">f.</span><span>free spirit</span><b>Vendor</b></Link>
      <nav className="vs-links">
        {links.map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={`vs-link ${active(href) ? "is-active" : ""}`} aria-current={active(href) ? "page" : undefined}><Icon size={19} strokeWidth={1.8} />{label}</Link>)}
      </nav>
      <div className="vs-bottom"><div className="vs-business"><span className="vs-business-mark">{businessName.slice(0, 1).toUpperCase()}</span><span><strong>{businessName}</strong><small>Vendor account</small></span></div>{logoutButton}</div>
    </aside>
    <header className="vs-mobile-head">
      <Link href="/vendor" className="vs-brand"><span className="vs-mark">f.</span><span>free spirit</span><b>Vendor</b></Link>
      <button className="vs-more-trigger" aria-expanded={moreOpen} onClick={() => setMoreOpen(!moreOpen)}>{moreOpen ? <X size={20} /> : <Menu size={20} />}<span>More</span></button>
      {moreOpen && <div className="vs-more-menu">{links.filter((l) => ["Stats", "Business profile"].includes(l.label)).map((l) => <Link key={l.href} href={l.href} onClick={() => setMoreOpen(false)}>{l.label}</Link>)}{logoutButton}</div>}
    </header>
    <main className="vs-main">
      {vendorQuery.isError && <div className="v-inline-error" role="alert">Couldn’t load your business. <button onClick={() => vendorQuery.refetch()}>Retry</button></div>}
      {children}
    </main>
    <nav className="vs-mobile-nav" aria-label="Vendor navigation">
      {links.filter((l) => ["Dashboard", "Bookings", "Listings", "Schedule"].includes(l.label)).map(({ label, href, icon: Icon }) => <Link key={href} href={href} className={active(href) ? "is-active" : ""} aria-current={active(href) ? "page" : undefined}><Icon size={20} /><span>{label === "Dashboard" ? "Home" : label}</span></Link>)}
      <button onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen}><ChevronDown size={20} /><span>More</span></button>
    </nav>
    {logout.isError && <div className="vs-logout-error" role="alert">Couldn’t log out. <button onClick={() => logout.mutate()}>Try again</button></div>}
  </div>;
}
