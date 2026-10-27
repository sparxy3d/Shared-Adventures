import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Image, ListChecks, Plus, Store, Users, LoaderCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/currency";
import { formatVendorDate, formatVendorTime, receivedTime, type VendorBooking } from "@/lib/vendor-bookings";
import VendorBookingActions from "@/components/vendor-booking-actions";
import { apiRequest } from "@/lib/queryClient";

interface DashboardData {
  vendor: { businessName: string; verificationStatus: string; takingBookings: boolean };
  commission?: { rate: number; introductory: boolean; introductoryEndsAt: string | null; overridden: boolean };
  accountStatus: string;
  listings: { total: number; published: number };
  pendingRequests: VendorBooking[];
  next7Days: VendorBooking[];
  stats: { monthly?: Array<{ month: string; bookings: number; confirmed: number; value: number }> };
  checklist?: { listing?: boolean; schedule?: boolean; photos?: boolean; review?: boolean };
  month?: { requests: number; confirmed: number; value: number };
}

function fullTotal(b: VendorBooking) {
  if (b.totalAmount == null || b.currencyCode !== "LKR") return "Total unavailable";
  return b.totalAmount === 0 ? "LKR 0" : formatPrice(b.totalAmount, "LKR");
}
function shortName(name: string) { return name.trim().split(/\s+/)[0] || "Member"; }

export default function VendorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery<DashboardData>({
    queryKey: ["/api/vendor/dashboard"], staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true,
  });
  const availabilityMutation = useMutation({
    mutationFn: (takingBookings: boolean) => apiRequest("PATCH", "/api/vendor/taking-bookings", { takingBookings }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/vendor/profile"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/vendor/dashboard"] }),
      ]);
    },
  });
  const data = query.data;
  const pending = [...(data?.pendingRequests ?? [])].sort((a, b) => (a.createdAt ?? "9999").localeCompare(b.createdAt ?? "9999"));
  const monthKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
  const monthStat = data?.stats?.monthly?.find((item) => item.month === monthKey);
  const month = data?.month ?? (monthStat ? { requests: monthStat.bookings, confirmed: monthStat.confirmed, value: monthStat.value } : null);
  const grouped = Object.values((data?.next7Days ?? []).reduce<Record<string, VendorBooking[]>>((acc, booking) => {
    const key = `${booking.bookingDate}|${booking.slotId ?? `${booking.experienceId}|${booking.startTime ?? ""}`}`;
    (acc[key] ??= []).push(booking); return acc;
  }, {})).sort((a, b) => (a[0].bookingDate + a[0].startTime).localeCompare(b[0].bookingDate + b[0].startTime));
  const dayGroups = grouped.reduce<Array<{ date: string; sessions: VendorBooking[][] }>>((days, session) => {
    const date = session[0].bookingDate;
    const lastDay = days[days.length - 1];
    if (lastDay?.date === date) lastDay.sessions.push(session);
    else days.push({ date, sessions: [session] });
    return days;
  }, []);
  const statusText: Record<string, string> = { approved: "Approved, not live yet", live: "Live", paused: "Paused", pending: "Under review", contacted: "Under review", rejected: "Needs attention" };
  const checklist = data?.checklist ?? { listing: (data?.listings?.total ?? 0) > 0, schedule: false, photos: false, review: data?.accountStatus === "approved" || data?.accountStatus === "live" };
  const steps = [
    { key: "listing", text: "Add your first listing", href: "/vendor/experiences/new", icon: Store, done: !!checklist.listing },
    { key: "schedule", text: "Set your weekly schedule", href: "/vendor/schedule", icon: CalendarDays, done: !!checklist.schedule },
    { key: "photos", text: "Add photos", href: "/vendor/experiences", icon: Image, done: !!checklist.photos },
    { key: "review", text: "Admin review", href: "/vendor/profile", icon: ListChecks, done: !!checklist.review },
  ];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const takingBookings = data?.vendor.takingBookings !== false;
  const commissionEndDate = data?.commission?.introductoryEndsAt
    ? new Intl.DateTimeFormat("en-LK", { dateStyle: "long", timeZone: "Asia/Colombo" }).format(new Date(data.commission.introductoryEndsAt))
    : null;

  if (query.isLoading) return <div className="v-page"><div className="v-skeleton v-skel-hero" /><div className="v-skeleton v-skel-panel" /><div className="v-skeleton v-skel-panel" /></div>;
  if (query.isError || !data) return <div className="v-page"><div className="v-error" role="alert"><h1>We couldn’t load your dashboard</h1><p>{query.error instanceof Error ? query.error.message : "Please try again."}</p><button className="v-button v-button-primary" onClick={() => query.refetch()}>Retry</button></div></div>;

  return <div className="v-page">
    <header className="v-dashboard-head"><div><p className="v-eyebrow">{greeting}{user?.fullName ? `, ${shortName(user.fullName)}` : ""}</p><h1>{data.vendor.businessName}</h1><p className="v-head-sub">A clear view of what’s happening with your sessions.</p></div><span className={`v-status v-status-${data.accountStatus}`}><i />{statusText[data.accountStatus] ?? data.accountStatus}</span></header>
    {data.commission && <section className="v-panel v-commission-summary" aria-label="Commission rate">
      <div className="v-commission-mark" aria-hidden="true">%</div>
      <div><p className="v-eyebrow">Your commission</p><h2>{data.commission.rate}% <span>{data.commission.introductory ? "introductory rate" : data.commission.overridden ? "vendor rate" : "standard rate"}</span></h2>
        <p className="v-muted">{data.commission.introductory ? `Your introductory rate ends ${commissionEndDate ?? "on a date not recorded"}.` : data.commission.overridden ? "A custom rate has been set for your account." : "Applied when a new booking is requested."}</p>
      </div>
    </section>}
    <section className={`v-panel v-taking-bookings ${takingBookings ? "is-taking-bookings" : "is-not-taking-bookings"}`} aria-labelledby="taking-bookings-title">
      <div><p className="v-eyebrow">Availability</p><h2 id="taking-bookings-title">{takingBookings ? "Taking bookings" : "Not taking bookings"}</h2>
        <p className="v-muted">{takingBookings ? "Your published experiences can receive new booking requests." : "Your experiences stay visible, but guests cannot send new requests."}</p></div>
      <button type="button" role="switch" aria-checked={takingBookings} aria-label="Taking bookings"
        className="v-booking-switch" disabled={availabilityMutation.isPending}
        onClick={() => availabilityMutation.mutate(!takingBookings)} data-testid="switch-taking-bookings">
        <span className="v-booking-switch-thumb">{availabilityMutation.isPending ? <LoaderCircle size={14} className="v-switch-pending" aria-hidden="true" /> : null}</span>
      </button>
      {availabilityMutation.isError && <div className="v-booking-switch-error" role="alert">
        <span>Availability could not be updated. Please try again.</span>
        <button type="button" onClick={() => { availabilityMutation.reset(); availabilityMutation.mutate(!takingBookings); }}>Retry</button>
      </div>}
      <span className="sr-only" aria-live="polite">{availabilityMutation.isPending ? "Saving booking availability" : ""}</span>
    </section>
    {data.accountStatus !== "live" && <section className="v-panel v-checklist">
      <div className="v-panel-heading"><div><p className="v-eyebrow">Your setup</p><h2>Get ready to welcome a group</h2></div><span className="v-step-count">{steps.filter((s) => s.done).length} of {steps.length}</span></div>
      <div className="v-checklist-grid">{steps.map(({ key, text, href, icon: Icon, done }) => <Link key={key} href={href} className={`v-check-step ${done ? "is-done" : ""}`}><span className="v-check-icon">{done ? <CheckCircle2 size={20} /> : <Icon size={19} />}</span><span>{text}</span>{done ? <CheckCircle2 className="v-check-mark" size={17} /> : <ArrowRight className="v-step-arrow" size={17} />}</Link>)}</div>
      {data.accountStatus === "pending" && <p className="v-muted v-review-note">Your business is in review. We’ll update this checklist as each step is complete.</p>}
    </section>}
    <div className="v-dashboard-columns">
      <section className="v-panel v-requests"><div className="v-panel-heading"><div><p className="v-eyebrow">Needs your reply</p><h2>Booking requests <span className="v-count">{pending.length}</span></h2></div><Link className="v-text-link" href="/vendor/bookings">All bookings <ArrowRight size={15} /></Link></div>
        {pending.length ? <div className="v-request-list">{pending.slice(0, 5).map((booking) => <article className="v-request" key={booking.id}>
          <div className="v-request-top"><div><span className="v-member">{shortName(booking.customer.fullName)} <span>requested</span></span><h3>{booking.experience.title}</h3></div><span className="v-received">Received {receivedTime(booking.createdAt)}</span></div>
          <div className="v-request-meta"><span><CalendarDays size={15} />{formatVendorDate(booking.bookingDate, { weekday: "short" })}, {formatVendorTime(booking.startTime)}</span><span><Users size={15} />{booking.qty} {booking.qty === 1 ? "person" : "people"}</span><strong>{fullTotal(booking)}</strong></div>
          <VendorBookingActions booking={booking} compact />
        </article>)}</div> : <div className="v-empty"><span className="v-empty-icon"><CheckCircle2 size={23} /></span><h3>You’re all caught up</h3><p>New booking requests will show up here.</p><Link className="v-text-link" href="/vendor/bookings">View all bookings <ArrowRight size={15} /></Link></div>}
      </section>
      <aside className="v-side-stack">
        <section className="v-panel v-week"><div className="v-panel-heading"><div><p className="v-eyebrow">Coming up</p><h2>Next 7 days</h2></div><CalendarDays className="v-heading-icon" size={20} /></div>
          {dayGroups.length ? <div className="v-week-list">{dayGroups.map(({ date, sessions }) => <div className="v-week-day" key={date}>
            <h3 className="v-week-day-heading">{formatVendorDate(date, { weekday: "long", month: "long", day: "numeric" })}</h3>
            {sessions.map((items) => { const b = items[0]; return <div className="v-week-item" key={`${date}-${b.slotId ?? `${b.experienceId}-${b.startTime ?? ""}`}`}><div className="v-date-rail"><strong>{formatVendorDate(b.bookingDate, { weekday: "short" }).slice(0, 3)}</strong><span>{b.bookingDate.slice(8, 10)}</span></div><div className="v-week-copy"><strong>{b.experience.title}</strong><span>{formatVendorTime(b.startTime)} · {items.reduce((n, row) => n + row.qty, 0)} booked</span></div><div className="v-spots">{b.spotsLeft == null ? "Not set" : b.spotsLeft}<small>spots left</small></div></div>; })}
          </div>)}</div> : <div className="v-empty v-empty-small"><Clock3 size={22} /><p>No sessions booked in the next week.</p><Link className="v-text-link" href="/vendor/schedule">Manage schedule <ArrowRight size={15} /></Link></div>}
        </section>
        <section className="v-panel v-month"><div className="v-panel-heading"><div><p className="v-eyebrow">This month</p><h2>At a glance</h2></div></div>
          {month ? <div className="v-month-grid"><div><span>Requests</span><strong>{month.requests}</strong></div><div><span>Confirmed</span><strong>{month.confirmed}</strong></div><div className="v-month-value"><span>Confirmed booking value</span><strong>{month.value === 0 ? "LKR 0" : formatPrice(month.value, "LKR")}</strong></div></div> : <p className="v-muted">Monthly totals aren’t available yet.</p>}
          <Link href="/vendor/stats" className="v-text-link v-month-link">See stats <ArrowRight size={15} /></Link>
        </section>
      </aside>
    </div>
    <div className="v-quick-links"><Link href="/vendor/experiences/new"><Plus size={18} />Create a listing</Link><Link href="/vendor/schedule"><CalendarDays size={18} />Manage schedule</Link></div>
  </div>;
}
