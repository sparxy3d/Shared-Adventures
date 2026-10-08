import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CalendarDays, Clock3, Search, Users, X, Mail, Phone, MessageSquareText, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/currency";
import { formatVendorDate, formatVendorTime, receivedTime, vendorBookingIsPast as isPast, type VendorBooking } from "@/lib/vendor-bookings";
import VendorBookingActions from "@/components/vendor-booking-actions";

type Tab = "requests" | "upcoming" | "past" | "closed";
const tabLabels: Record<Tab, string> = { requests: "Requests", upcoming: "Upcoming", past: "Past", closed: "Declined & cancelled" };
const statusNames: Record<string, string> = { requested: "Requested", confirmed: "Confirmed", declined: "Declined", cancelled: "Cancelled", completed: "Completed" };

function dateKey(date: string) { return date.slice(0, 10); }
function belongs(tab: Tab, booking: VendorBooking) {
  if (tab === "requests") return booking.status === "requested";
  if (tab === "upcoming") return booking.status === "confirmed" && !isPast(booking);
  if (tab === "past") return booking.status === "completed" || (booking.status === "confirmed" && isPast(booking));
  return booking.status === "declined" || booking.status === "cancelled";
}
function sameSession(a: VendorBooking, b: VendorBooking) {
  if (a.slotId != null && b.slotId != null) return a.id !== b.id && a.slotId === b.slotId;
  return a.id !== b.id && a.experienceId === b.experienceId && dateKey(a.bookingDate) === dateKey(b.bookingDate) && a.startTime === b.startTime;
}

export default function VendorBookings() {
  const [tab, setTab] = useState<Tab>("requests");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const detailRef = useRef<HTMLElement>(null);
  const closeDetailRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (selectedId === null) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    closeDetailRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedId(null);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(detailRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? []).filter((element) => element.getAttribute("aria-hidden") !== "true" && element.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        detailRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !detailRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !detailRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    const keepFocusInside = (event: FocusEvent) => {
      if (detailRef.current && !detailRef.current.contains(event.target as Node)) closeDetailRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("focusin", keepFocusInside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("focusin", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [selectedId]);
  const query = useQuery<VendorBooking[]>({
    queryKey: ["/api/vendor/bookings"], staleTime: 0, refetchInterval: 30_000, refetchOnWindowFocus: true,
  });
  const bookings = query.data ?? [];
  const filtered = useMemo(() => bookings.filter((booking) => belongs(tab, booking) &&
    `${booking.customer.fullName} ${booking.experience.title}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => tab === "requests" ? (a.createdAt ?? "9999").localeCompare(b.createdAt ?? "9999") : (a.bookingDate + a.startTime).localeCompare(b.bookingDate + b.startTime)), [bookings, tab, search]);
  const selected = bookings.find((b) => b.id === selectedId) ?? null;
  const count = (key: Tab) => bookings.filter((b) => belongs(key, b)).length;
  const amount = (b: VendorBooking) => b.totalAmount == null || (b.currencyCode && b.currencyCode !== "LKR") ? "Total unavailable" : b.totalAmount === 0 ? "LKR 0" : formatPrice(b.totalAmount, "LKR");

  return <div className="v-page v-bookings-page">
    <header className="v-page-heading"><div><p className="v-eyebrow">Your sessions, in one place</p><h1>Bookings</h1><p>Review requests and keep your upcoming groups moving.</p></div></header>
    <div className="v-booking-controls"><div className="v-tabs" role="tablist" aria-label="Booking status">{(Object.keys(tabLabels) as Tab[]).map((key) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{tabLabels[key]}<span>{query.isLoading ? "…" : query.isError ? "—" : count(key)}</span></button>)}</div><label className="v-search"><Search size={17} /><span className="sr-only">Search member or activity</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search member or activity" /></label></div>
    {query.isLoading ? <div className="v-booking-skeletons">{[0, 1, 2].map((n) => <div className="v-skeleton v-skel-row" key={n} />)}</div>
      : query.isError ? <div className="v-error" role="alert"><h2>We couldn’t load bookings</h2><p>{query.error instanceof Error ? query.error.message : "Try again in a moment."}</p><button className="v-button v-button-primary" onClick={() => query.refetch()}>Retry</button></div>
      : filtered.length ? <>
        <div className="v-table-wrap"><table className="v-booking-table"><thead><tr><th>Session</th><th>Member</th><th>Group</th><th>Total</th><th>Status</th><th>Received</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((b) => <tr key={b.id} data-testid={`vendor-booking-row-${b.id}`}>
          <td><button className="v-session-button" onClick={() => setSelectedId(b.id)}><strong>{b.experience.title}</strong><span>{formatVendorDate(b.bookingDate, { weekday: "short" })} · {formatVendorTime(b.startTime)}</span></button></td>
          <td><button className="v-member-button" onClick={() => setSelectedId(b.id)}>{b.customer.fullName}</button></td><td>{b.qty} {b.qty === 1 ? "person" : "people"}</td><td className="v-total-cell">{amount(b)}</td><td><span className={`v-booking-status status-${b.status}`}>{statusNames[b.status] ?? b.status}</span></td><td className="v-muted">{receivedTime(b.createdAt)}</td><td><button className="v-open-detail" aria-label={`View ${b.customer.fullName} booking details`} onClick={() => setSelectedId(b.id)}><ArrowRight size={17} /></button></td>
        </tr>)}</tbody></table></div>
        <div className="v-booking-cards">{filtered.map((b) => <article className="v-booking-card" key={b.id} data-testid={`vendor-booking-card-${b.id}`}>
          <div className="v-card-head"><span className={`v-booking-status status-${b.status}`}>{statusNames[b.status] ?? b.status}</span><button aria-label="Open booking details" onClick={() => setSelectedId(b.id)}><ArrowRight size={18} /></button></div>
          <button className="v-card-session" onClick={() => setSelectedId(b.id)}><strong>{b.experience.title}</strong><span><CalendarDays size={15} />{formatVendorDate(b.bookingDate, { weekday: "short" })} · {formatVendorTime(b.startTime)}</span></button>
          <div className="v-card-person"><span>{b.customer.fullName}</span><small>{b.qty} {b.qty === 1 ? "person" : "people"} · {amount(b)}</small></div>
          <p className="v-card-received">Received {receivedTime(b.createdAt)}</p>
          {b.status === "requested" || b.status === "confirmed" ? <VendorBookingActions booking={b} compact /> : null}
        </article>)}</div>
      </> : <div className="v-empty v-bookings-empty"><span className="v-empty-icon"><CalendarDays size={23} /></span><h2>{search ? "No matching bookings" : tab === "requests" ? "No requests waiting" : `No ${tabLabels[tab].toLowerCase()} bookings`}</h2><p>{search ? "Try another name or activity." : tab === "requests" ? "New requests from members will appear here." : "There’s nothing in this view yet."}</p>{search ? <button className="v-button v-button-quiet" onClick={() => setSearch("")}>Clear search</button> : <Link className="v-button v-button-quiet" href="/vendor">Back to dashboard</Link>}</div>}
    {selected && <div className="v-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}><section ref={detailRef} tabIndex={-1} className="v-detail-modal" role="dialog" aria-modal="true" aria-labelledby="v-detail-title">
      <div className="v-detail-heading"><div><p className="v-eyebrow">Booking details</p><h2 id="v-detail-title">{selected.experience.title}</h2></div><button ref={closeDetailRef} className="v-close-detail" aria-label="Close details" onClick={() => setSelectedId(null)}><X size={20} /></button></div>
      <span className={`v-booking-status status-${selected.status}`}>{statusNames[selected.status] ?? selected.status}</span>
      <div className="v-detail-facts"><p><CalendarDays size={17} /><span><strong>{formatVendorDate(selected.bookingDate)}</strong><small>{formatVendorTime(selected.startTime)}</small></span></p><p><Users size={17} /><span><strong>{selected.qty} {selected.qty === 1 ? "person" : "people"}</strong><small>Total · {amount(selected)}</small></span></p><p><Clock3 size={17} /><span><strong>Request received</strong><small>{receivedTime(selected.createdAt)}</small></span></p></div>
      <div className="v-detail-member"><h3>Member</h3><strong>{selected.customer.fullName}</strong>
        {selected.status === "confirmed" ? <div className="v-contact">{selected.customer.email && <a href={`mailto:${selected.customer.email}`}><Mail size={16} />{selected.customer.email}</a>}{selected.customer.phone && <a href={`tel:${selected.customer.phone}`}><Phone size={16} />{selected.customer.phone}</a>}</div> : <p className="v-muted">Contact details are available once this booking is confirmed.</p>}
      </div>
      {selected.customerNote && <div className="v-detail-note"><h3><MessageSquareText size={17} />Member note</h3><p>{selected.customerNote}</p></div>}
      {selected.vendorNote && <div className="v-detail-note"><h3>Your note</h3><p>{selected.vendorNote}</p></div>}
      {bookings.some((b) => sameSession(selected, b)) && <div className="v-other-bookings"><h3>Other bookings for this session</h3>{bookings.filter((b) => sameSession(selected, b)).map((b) => <div key={b.id}><span>{b.customer.fullName}</span><span>{b.qty} {b.qty === 1 ? "person" : "people"} · {statusNames[b.status] ?? b.status}</span></div>)}</div>}
      <VendorBookingActions booking={selected} />
    </section></div>}
  </div>;
}
