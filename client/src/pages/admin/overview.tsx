import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertTriangle, ArrowUpRight, CalendarDays, ClipboardCheck, Store, Users, MessagesSquare, PanelsTopLeft } from "lucide-react";
import { getJson, formatAdminDate } from "@/lib/admin";
import { AdminError, AdminLoading } from "@/components/admin/states";
import { AdminTable, type AdminColumn } from "@/components/admin/table";

type AttentionItem = { id: number; businessName?: string; title?: string; activityTitle?: string; memberName?: string; vendorName?: string; createdAt?: string; approvedAt?: string; bookingDate?: string; listingTitle?: string; experience?: { title?: string }; vendor?: { businessName?: string }; customer?: { fullName?: string } };
type AttentionRow = AttentionItem & { kind: "Old request" | "Approved · not live" | "No upcoming sessions"; detail: string; href: string; date?: string };
type AdminStats = {
  applicationsWaiting?: number; pendingApplications?: number; liveVendors?: number; publishedListings?: number; members?: number;
  bookingsThisWeek?: number; unansweredOver24h?: number; weekStart?: string; weekEnd?: string;
  attention?: { requests?: AttentionItem[]; vendors?: AttentionItem[]; listings?: AttentionItem[] };
};
type PricingStatus = { usdToLkrRate: number | null; exchangeRateUpdatedAt: string | null };
function metric(value: unknown) { return typeof value === "number" ? new Intl.NumberFormat("en-LK").format(value) : "—"; }

export default function Overview() {
  const query = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"], queryFn: () => getJson("/api/admin/stats") });
  const pricingQuery = useQuery<PricingStatus>({ queryKey: ["/api/admin/pricing-settings"], queryFn: () => getJson("/api/admin/pricing-settings") });
  const [attentionFilter, setAttentionFilter] = useState("all");
  if (query.isLoading) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Your operations desk</p><h1>Overview</h1></div></div><AdminLoading rows={4} /></main>;
  if (query.isError || !query.data) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Your operations desk</p><h1>Overview</h1></div></div><AdminError retry={() => query.refetch()} /></main>;
  const data = query.data;
  const tiles = [
    { label: "Applications waiting", value: data.applicationsWaiting ?? data.pendingApplications, icon: ClipboardCheck, href: "/admin/applications?filter=waiting", note: "New and contacted applications" },
    { label: "Live vendors", value: data.liveVendors, icon: Store, href: "/admin/vendors?filter=live", note: "Approved with a published listing" },
    { label: "Published listings", value: data.publishedListings, icon: PanelsTopLeft, href: "/admin/listings?filter=published", note: "Visible to members" },
    { label: "Members", value: data.members, icon: Users, href: "/admin/members?filter=real", note: "Signed-in customer accounts" },
    { label: "Bookings this week", value: data.bookingsThisWeek, icon: CalendarDays, href: "/admin/bookings?filter=this-week", note: data.weekStart && data.weekEnd ? `${formatAdminDate(data.weekStart)} – ${formatAdminDate(data.weekEnd)} · Sri Lanka` : "Monday through Sunday · Sri Lanka" },
    { label: "Unanswered · 24h+", value: data.unansweredOver24h, icon: MessagesSquare, href: "/admin/bookings?filter=older-than-24h", note: "Requests still waiting for a reply" },
  ];
  const attentionItems: AttentionRow[] = [
    ...(data.attention?.requests ?? []).map((item) => ({ ...item, kind: "Old request" as const, detail: item.activityTitle ?? item.experience?.title ?? item.title ?? item.memberName ?? item.customer?.fullName ?? "Booking request", href: "/admin/bookings?filter=older-than-24h", date: item.createdAt })),
    ...(data.attention?.vendors ?? []).map((item) => ({ ...item, kind: "Approved · not live" as const, detail: item.businessName ?? item.vendorName ?? "Vendor", href: "/admin/vendors?filter=approved-not-live", date: item.approvedAt })),
    ...(data.attention?.listings ?? []).map((item) => ({ ...item, kind: "No upcoming sessions" as const, detail: item.listingTitle ?? item.title ?? "Published listing", href: "/admin/listings?filter=no-sessions", date: undefined })),
  ];
  const visibleAttention = attentionItems.filter((item) => attentionFilter === "all" || item.kind === attentionFilter);
  const exchangeUpdatedAt = pricingQuery.data?.exchangeRateUpdatedAt ? Date.parse(pricingQuery.data.exchangeRateUpdatedAt) : null;
  const exchangeStale = !!pricingQuery.data && (pricingQuery.data.usdToLkrRate == null || exchangeUpdatedAt == null || Date.now() - exchangeUpdatedAt > 7 * 24 * 60 * 60 * 1000);
  const attentionColumns: AdminColumn<AttentionRow>[] = [
    { key: "detail", label: "Needs attention", sortValue: (row) => row.detail, render: (row) => <><div className="ad-cell-title">{row.detail}</div><div className="ad-cell-sub">{row.vendorName ?? row.vendor?.businessName ?? row.businessName ?? row.memberName ?? row.customer?.fullName ?? "Review details"}</div></> },
    { key: "kind", label: "Follow-up", sortValue: (row) => row.kind, render: (row) => <span className={`ad-badge ${row.kind === "Old request" ? "warm" : "blue"}`}>{row.kind}</span> },
    { key: "date", label: "Date", sortValue: (row) => row.date ?? "", render: (row) => formatAdminDate(row.date) },
    { key: "actions", label: "Action", render: (row) => <Link className="ad-icon-button" href={row.href} aria-label={`Open ${row.detail}`}><ArrowUpRight size={15} /></Link> },
  ];
  return <main className="ad-content">
    <div className="ad-page-head"><div><p className="ad-eyebrow">Your operations desk</p><h1>Overview</h1><p>A clear view of what needs a hand today.</p></div><Link className="ad-button secondary" href="/admin/settings">Go-live settings <ArrowUpRight size={15} /></Link></div>
    {exchangeStale && <div className="ad-banner ad-exchange-warning" role="status"><strong>{pricingQuery.data?.usdToLkrRate == null ? "Visitor exchange rate is not set." : "Visitor exchange rate is over 7 days old."}</strong> Visitor prices may be unavailable or out of date. <Link href="/admin/settings">Review pricing settings</Link></div>}
    <section className="ad-stat-grid" aria-label="Admin metrics">{tiles.map(({ label, value, icon: Icon, href, note }) => <Link key={label} className="ad-stat ad-card" href={href}><div className="ad-stat-label"><Icon size={14} />{label}</div><div className="ad-stat-value">{metric(value)}</div><div className="ad-stat-note">{note}</div></Link>)}</section>
    <section className="ad-section ad-card">
      <div className="ad-section-head"><div><p className="ad-eyebrow">Needs attention</p><h2>Follow up before it drifts</h2></div><span className="ad-badge warm"><AlertTriangle size={12} style={{ marginRight: 4 }} />{attentionItems.length} items</span></div>
      <AdminTable rows={visibleAttention} columns={attentionColumns} searchText={(row) => `${row.kind} ${row.detail} ${row.vendorName ?? row.vendor?.businessName ?? ""} ${row.memberName ?? row.customer?.fullName ?? ""}`} filterControls={<div className="ad-filter-chips">{[["all", "All"], ["Old request", "Old requests"], ["Approved · not live", "Approved · not live"], ["No upcoming sessions", "No upcoming sessions"]].map(([value, label]) => <button key={value} className={`ad-chip ${attentionFilter === value ? "selected" : ""}`} onClick={() => setAttentionFilter(value)}>{label}</button>)}</div>} />
      {!visibleAttention.length && <div className="ad-state" style={{ padding: "25px 12px" }}><div className="ad-state-mark"><ClipboardCheck size={18} /></div><h2>{attentionItems.length ? "No follow-ups in this view" : "Nothing waiting on you"}</h2><p>{attentionItems.length ? "Choose another follow-up type to review the remaining items." : "Older requests, approved vendors not yet live and published listings without upcoming sessions will appear here."}</p><button className="ad-button secondary" onClick={() => attentionItems.length ? setAttentionFilter("all") : query.refetch()}>{attentionItems.length ? "Show all follow-ups" : "Refresh overview"}</button></div>}
    </section>
    <div className="ad-banner" style={{ marginTop: 15 }}><strong>Demo environment is ON.</strong> Use Settings for the current go-live configuration and support details. <Link href="/admin/settings" style={{ color: "inherit", fontWeight: 700 }}>Review settings →</Link></div>
  </main>;
}
