import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { errorMessage, formatAdminDate, formatLkr, getJson, refreshAdmin } from "@/lib/admin";
import { AdminDialog } from "@/components/admin/dialog";
import { AdminTable, type AdminColumn } from "@/components/admin/table";
import { AdminError, AdminLoading } from "@/components/admin/states";
import { DECLINE_REASONS } from "@shared/catalog";
import { useToast } from "@/hooks/use-toast";

type Booking = { id: number; activityTitle?: string; experienceTitle?: string; vendorId?: number; vendorName?: string; memberName?: string; customerName?: string; groupSize?: number; qty?: number; totalAmount?: number; status: string; createdAt?: string; bookingDate?: string; startTime?: string; sessionStartAt?: string; experience?: { title?: string; vendor?: { id?: number; businessName?: string } }; customer?: { fullName?: string; email?: string }; vendor?: { id?: number; businessName?: string }; session?: { startsAt?: string; startAt?: string; startTime?: string }; };
type BookingAction = { row: Booking; status: string };
function bookingDateTime(row: Booking): string {
  const explicitStart = row.sessionStartAt ?? row.session?.startsAt ?? row.session?.startAt;
  const date = row.bookingDate ?? explicitStart;
  if (!date) return "—";
  const timestamp = row.bookingDate?.includes("T") ? row.bookingDate : explicitStart;
  const separatedTime = row.startTime ?? row.session?.startTime;
  if (timestamp && /T\d{2}:\d{2}/.test(timestamp) && /(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp) && !separatedTime) return formatAdminDate(timestamp, true);
  const embeddedTime = timestamp?.match(/T(\d{1,2}):(\d{2})/);
  const rawTime = separatedTime ?? (embeddedTime ? `${embeddedTime[1]}:${embeddedTime[2]}` : undefined);
  if (!rawTime) return formatAdminDate(date);
  const time = rawTime.trim().match(/^(\d{1,2}):(\d{2})/) ;
  if (!time) return formatAdminDate(date);
  const localDateTime = new Date(`${date.slice(0, 10)}T${time[1].padStart(2, "0")}:${time[2]}:00+05:30`);
  return formatAdminDate(localDateTime, true);
}
export function AdminBookings({ vendorId }: { vendorId?: number } = {}) {
  const { toast } = useToast();
  const initialFilter = new URLSearchParams(window.location.search).get("filter") ?? "all";
  const [filter, setFilter] = useState(initialFilter);
  const [vendorFilter, setVendorFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pending, setPending] = useState<BookingAction | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const endpoint = vendorId == null ? "/api/admin/bookings" : `/api/admin/vendors/${vendorId}/bookings`;
  const query = useQuery<Booking[]>({ queryKey: [endpoint], queryFn: () => getJson(endpoint) });
  const statsQuery = useQuery<{ weekStart?: string; weekEnd?: string }>({ queryKey: ["/api/admin/stats"], queryFn: () => getJson("/api/admin/stats") });
  const mutate = useMutation({
    mutationFn: async ({ row, status, declineReason, vendorNote }: { row: Booking; status: string; declineReason?: string; vendorNote?: string }) =>
      apiRequest("PATCH", `/api/admin/bookings/${row.id}`, { status, ...(declineReason ? { declineReason } : {}), ...(vendorNote ? { vendorNote } : {}) }),
    onSuccess: async (_, variables) => { await refreshAdmin(); setPending(null); setReason(""); setNote(""); toast({ title: `Booking ${variables.status}` }); },
  });
  const now = Date.now();
  const rows = (query.data ?? []).filter((row) => {
    const rowVendorId = row.vendorId ?? row.vendor?.id ?? row.experience?.vendor?.id;
    if (vendorId != null && rowVendorId != null && rowVendorId !== vendorId) return false;
    if (vendorId == null && vendorFilter !== "all" && String(rowVendorId ?? "") !== vendorFilter) return false;
    const bookingDay = (row.bookingDate ?? row.sessionStartAt ?? row.session?.startsAt ?? row.session?.startAt ?? "").slice(0, 10);
    if (dateFrom && bookingDay < dateFrom) return false;
    if (dateTo && bookingDay > dateTo) return false;
    if (filter === "older-than-24h") return row.status === "requested" && now - new Date(row.createdAt ?? row.bookingDate ?? 0).getTime() > 24 * 60 * 60 * 1000;
    if (filter === "this-week") {
      const scheduledDate = (row.bookingDate ?? "").slice(0, 10);
      const start = statsQuery.data?.weekStart?.slice(0, 10);
      const end = statsQuery.data?.weekEnd?.slice(0, 10);
      return (row.status === "requested" || row.status === "confirmed") && !!start && !!end && scheduledDate >= start && scheduledDate <= end;
    }
    return filter === "all" || row.status === filter;
  });
  const columns: AdminColumn<Booking>[] = [
    { key: "activityTitle", label: "Activity / session", sortValue: (row) => row.activityTitle ?? row.experienceTitle ?? row.experience?.title ?? "", render: (row) => <><div className="ad-cell-title">{row.activityTitle ?? row.experienceTitle ?? row.experience?.title ?? "Booking"}</div><div className="ad-cell-sub">{bookingDateTime(row)}</div></> },
    { key: "vendorName", label: "Vendor", sortValue: (row) => row.vendorName ?? row.vendor?.businessName ?? row.experience?.vendor?.businessName ?? "", render: (row) => row.vendorName ?? row.vendor?.businessName ?? row.experience?.vendor?.businessName ?? "—" },
    { key: "memberName", label: "Member", sortValue: (row) => row.memberName ?? row.customerName ?? row.customer?.fullName ?? "", render: (row) => row.memberName ?? row.customerName ?? row.customer?.fullName ?? row.customer?.email ?? "—" },
    { key: "groupSize", label: "Group", sortValue: (row) => row.groupSize ?? row.qty ?? 0, render: (row) => row.groupSize ?? row.qty ?? "—" },
    { key: "totalAmount", label: "Total", sortValue: (row) => Number(row.totalAmount ?? 0), render: (row) => formatLkr(row.totalAmount) },
    { key: "age", label: "Request age", sortValue: (row) => row.createdAt ?? "", render: (row) => {
      if (!row.createdAt) return "—";
      const hours = Math.max(0, Math.floor((now - new Date(row.createdAt).getTime()) / 3600000));
      return hours >= 24 && row.status === "requested" ? <span className="ad-badge warm">{Math.floor(hours / 24)}d waiting</span> : formatAdminDate(row.createdAt, true);
    } },
    { key: "status", label: "Status", render: (row) => <span className={`ad-badge ${row.status === "confirmed" || row.status === "completed" ? "green" : row.status === "declined" || row.status === "cancelled" ? "red" : "warm"}`}>{row.status}</span> },
    { key: "actions", label: "Actions", render: (row) => <div className="ad-row-actions">{row.status === "requested" && <><button className="ad-button secondary" style={{ minHeight: 36, padding: "0 10px" }} onClick={() => setPending({ row, status: "confirmed" })}>Confirm</button><button className="ad-icon-button" aria-label="Decline booking" title="Decline" onClick={() => setPending({ row, status: "declined" })}>×</button></>}{row.status === "confirmed" && <button className="ad-button secondary" style={{ minHeight: 36, padding: "0 10px" }} onClick={() => setPending({ row, status: "cancelled" })}>Cancel</button>}</div> },
  ];
  const vendorOptions = Array.from(new Map<string, { id?: number; name?: string }>((query.data ?? []).map((row) => {
    const id = row.vendorId ?? row.vendor?.id ?? row.experience?.vendor?.id;
    const name = row.vendorName ?? row.vendor?.businessName ?? row.experience?.vendor?.businessName;
    return [String(id ?? name), { id, name }] as [string, { id?: number; name?: string }];
  })).values());
  if (query.isLoading || (filter === "this-week" && statsQuery.isLoading)) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Reservation desk</p><h1>{vendorId == null ? "Bookings" : "Vendor bookings"}</h1></div></div><AdminLoading /></main>;
  if (query.isError) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Reservation desk</p><h1>Bookings</h1></div></div><AdminError retry={() => query.refetch()} /></main>;
  if (filter === "this-week" && statsQuery.isError) return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Reservation desk</p><h1>Bookings</h1></div></div><AdminError retry={() => statsQuery.refetch()} /></main>;
  const filters = [["all", "All"], ["requested", "Requested"], ["confirmed", "Confirmed"], ["declined", "Declined"], ["cancelled", "Cancelled"], ["older-than-24h", "Older than 24h"], ["this-week", "This week"]];
  return <main className="ad-content"><div className="ad-page-head"><div><p className="ad-eyebrow">Reservation desk</p><h1>{vendorId == null ? "Bookings" : "Vendor bookings"}</h1><p>Respond to requests and keep every group in the loop.</p></div></div>
    <section className="ad-section ad-card"><div className="ad-section-head"><h2>Booking activity</h2><span className="ad-badge">{rows.length} records</span></div>
      <AdminTable rows={rows} columns={columns} searchText={(row) => Object.values(row).join(" ")} filterControls={<>
        <div className="ad-filter-chips">{filters.map(([value, label]) => <button key={value} className={`ad-chip ${filter === value ? "selected" : ""}`} onClick={() => setFilter(value)}>{label}</button>)}</div>
        <div className="ad-filter-chips">
          {vendorId == null && <select className="ad-select" aria-label="Filter by vendor" value={vendorFilter} onChange={(event) => setVendorFilter(event.target.value)} style={{ width: 160 }}><option value="all">All vendors</option>{vendorOptions.map((vendor) => <option key={String(vendor.id ?? vendor.name)} value={String(vendor.id ?? "")}>{vendor.name ?? `Vendor ${vendor.id}`}</option>)}</select>}
          <label className="ad-mobile-field" style={{ display: "flex", alignItems: "center", gap: 6 }}><span>From</span><input className="ad-input" aria-label="Bookings from date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} style={{ minHeight: 38, width: 145 }} /></label>
          <label className="ad-mobile-field" style={{ display: "flex", alignItems: "center", gap: 6 }}><span>To</span><input className="ad-input" aria-label="Bookings through date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} style={{ minHeight: 38, width: 145 }} /></label>
        </div>
      </>} />
      {mutate.isError && <p className="ad-form-error" role="alert">{errorMessage(mutate.error)}</p>}
      {!rows.length && <div className="ad-state" style={{ padding: "24px 12px" }}><div className="ad-state-mark"><span style={{ fontSize: 18 }}>·</span></div><h2>{(query.data ?? []).length ? "No bookings match these filters" : "No bookings yet"}</h2><p>{(query.data ?? []).length ? "Clear the filters to return to the full booking activity." : "New requests and confirmed sessions will appear here."}</p><button className="ad-button secondary" onClick={() => { setFilter("all"); setVendorFilter("all"); setDateFrom(""); setDateTo(""); }}>{(query.data ?? []).length ? "Clear filters" : "Show all bookings"}</button></div>}
    </section>
    {pending && <AdminDialog title={pending.status === "confirmed" ? "Confirm this booking?" : pending.status === "declined" ? "Decline this request?" : "Cancel this booking?"} onClose={() => { setPending(null); setReason(""); setNote(""); }}>
      <p style={{ color: "#70817a", fontSize: 13, lineHeight: 1.6 }}>{pending.status === "confirmed" ? "The member and vendor will see this booking as confirmed." : "This change will be visible to the member and vendor."}</p>
      {pending.status === "declined" && <><div className="ad-field"><label htmlFor="booking-reason">Reason *</label><select className="ad-select" id="booking-reason" value={reason} onChange={(event) => setReason(event.target.value)}><option value="">Choose a reason</option>{DECLINE_REASONS.map((item) => <option key={item}>{item}</option>)}</select></div><div className="ad-field"><label htmlFor="booking-note">Note to vendor (optional)</label><textarea id="booking-note" className="ad-textarea" value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} /></div></>}
      {mutate.isError && <p className="ad-form-error" role="alert">{errorMessage(mutate.error)}</p>}
      <div className="ad-dialog-actions"><button className="ad-button secondary" onClick={() => setPending(null)}>Go back</button><button className={`ad-button ${pending.status === "confirmed" ? "" : "danger"}`} disabled={mutate.isPending || (pending.status === "declined" && !reason)} onClick={() => mutate.mutate({ row: pending.row, status: pending.status, ...(reason ? { declineReason: reason, vendorNote: note } : {}) })}>{mutate.isPending ? "Saving…" : pending.status === "confirmed" ? "Confirm booking" : pending.status === "declined" ? "Decline request" : "Cancel booking"}</button></div>
    </AdminDialog>}
  </main>;
}
export default AdminBookings;
