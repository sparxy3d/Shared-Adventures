import { useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import BrandLogo from "@/components/brand-logo";
import { Activity, ClipboardList, LayoutDashboard, LogOut, Menu, Settings2, Store, Users, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getJson, errorMessage } from "@/lib/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Overview from "./overview";
import Applications from "./applications";
import Vendors from "./vendors";
import Bookings from "./bookings";
import Members from "./members";
import Settings from "./settings";
import VendorDetail from "./vendor-detail";
import AdminListings from "./listings";
import "./../../components/admin/admin.css";

type Application = { verificationStatus: string };
const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Applications", href: "/admin/applications", icon: ClipboardList, count: true },
  { label: "Vendors", href: "/admin/vendors", icon: Store },
  { label: "Listings", href: "/admin/listings", icon: Activity },
  { label: "Bookings", href: "/admin/bookings", icon: ClipboardList },
  { label: "Members", href: "/admin/members", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
];

export default function AdminConsole() {
  const [path] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const applicationQuery = useQuery<Application[]>({ queryKey: ["/api/admin/vendors"], queryFn: () => getJson("/api/admin/vendors") });
  const newApplications = applicationQuery.data?.filter((vendor) => vendor.verificationStatus === "pending").length ?? 0;
  const logout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.assign("/login");
    },
  });
  const activeLabel = navigation.find((item) => item.href === path)?.label ?? (path.includes("/vendors/") ? "Vendor details" : "Admin");
  const links = (mobile = false) => <nav className={mobile ? "ad-mobile-drawer" : "ad-nav"} aria-label="Admin navigation">
    {!mobile && <div className="ad-nav-label">Workspace</div>}
    {navigation.map(({ label, href, icon: Icon, count }) => {
      const active = href === "/admin" ? path === href : path === href || path.startsWith(href + "/");
      return <Link key={href} href={href} className={`ad-nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
        <Icon aria-hidden="true" /><span>{label}</span>{count && newApplications > 0 ? <span className="ad-nav-count">{newApplications}</span> : null}
      </Link>;
    })}
  </nav>;
  return <div className="admin-app">
    <div className="ad-layout">
      <aside className="ad-sidebar" aria-label="Admin sidebar">
        <Link href="/" className="ad-logo"><BrandLogo /><span className="ad-admin-tag">Admin</span></Link>
        {links()}
        <div className="ad-side-foot">Sri Lanka<br />Free Spirit operations</div>
      </aside>
      <div className="ad-main">
        <header className="ad-mobile-top">
          <Link href="/" className="ad-logo" style={{ padding: 0 }}><BrandLogo /><span className="ad-admin-tag">Admin</span></Link>
          <button className="ad-mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          {menuOpen && links(true)}
        </header>
        <div className="ad-topbar"><div className="ad-crumb">Operations <span aria-hidden="true">/</span> <strong>{activeLabel}</strong></div><div className="ad-user-chip"><span>{user?.fullName ?? "Administrator"}</span><span className="ad-avatar">{(user?.fullName ?? "A").slice(0, 1).toUpperCase()}</span><button className="ad-button secondary" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut size={15} />{logout.isPending ? "Signing out…" : "Log out"}</button></div></div>
        {logout.isError && <div className="ad-form-error" role="alert" style={{ margin: "10px clamp(18px,4vw,54px) 0" }}>{errorMessage(logout.error)} <button className="ad-button secondary" onClick={() => logout.mutate()}>Try again</button></div>}
        <Switch>
          <Route path="/admin"><Overview /></Route>
          <Route path="/admin/applications"><Applications /></Route>
          <Route path="/admin/vendors"><Vendors /></Route>
          <Route path="/admin/vendors/:id"><VendorDetail /></Route>
          <Route path="/admin/listings"><AdminListings /></Route>
          <Route path="/admin/bookings"><Bookings /></Route>
          <Route path="/admin/members"><Members /></Route>
          <Route path="/admin/settings"><Settings /></Route>
          <Route><Overview /></Route>
        </Switch>
      </div>
    </div>
  </div>;
}
