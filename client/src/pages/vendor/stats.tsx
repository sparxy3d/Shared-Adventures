import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart3, CalendarDays } from "lucide-react";
import type { Experience } from "@shared/schema";
import { AdminTable, type AdminColumn } from "@/components/admin/table";
import { formatPrice } from "@/lib/currency";
import type { VendorBooking } from "@/lib/vendor-bookings";
import {
  calendarWeeksInMonth, dateKeyInSriLanka, monthKeyInSriLanka, monthTitle,
  recentMonthKeys, weekBucketIndex,
} from "@/lib/vendor-schedule";
import "@/components/vendor-schedule-stage-five.css";

interface MonthStats {
  requests: number | null;
  confirmed: number | null;
  value: number | null;
  valueUnavailable: boolean;
}

function isConfirmed(status: string) {
  return status === "confirmed" || status === "completed";
}

function money(value: number | null, unavailable: boolean) {
  if (unavailable || value === null) return "Unavailable";
  return value === 0 ? "LKR 0" : formatPrice(value, "LKR");
}

function monthStats(bookings: VendorBooking[], month: string, hasUnknownTimestamp: boolean): MonthStats {
  const cohort = bookings.filter((booking) => monthKeyInSriLanka(booking.createdAt) === month);
  const confirmed = cohort.filter((booking) => isConfirmed(booking.status));
  const valueUnavailable = confirmed.some((booking) =>
    booking.totalAmount == null || !Number.isFinite(booking.totalAmount) || booking.currencyCode !== "LKR"
  );
  const value = valueUnavailable ? null : confirmed.reduce((total, booking) => total + (booking.totalAmount ?? 0), 0);
  return {
    requests: hasUnknownTimestamp ? null : cohort.length,
    confirmed: hasUnknownTimestamp ? null : confirmed.length,
    value: hasUnknownTimestamp ? null : value,
    valueUnavailable: hasUnknownTimestamp || valueUnavailable,
  };
}

export default function VendorStats({ adminVendorId }: { adminVendorId?: number } = {}) {
  const adminMode = adminVendorId !== undefined;
  const [selectedMonth, setSelectedMonth] = useState(() => recentMonthKeys()[5]);
  const [listingStatusFilter, setListingStatusFilter] = useState("all");
  const bookingsQuery = useQuery<VendorBooking[]>({ queryKey: adminMode ? ["/api/admin/vendors", adminVendorId, "bookings"] : ["/api/vendor/bookings"], staleTime: 30_000 });
  const experiencesQuery = useQuery<Experience[]>({ queryKey: adminMode ? ["/api/admin/vendors", adminVendorId, "experiences"] : ["/api/vendor/experiences"], staleTime: 30_000 });
  const bookings = bookingsQuery.data ?? [];
  const experiences = experiencesQuery.data ?? [];
  const months = useMemo(() => recentMonthKeys(), []);
  const hasUnknownTimestamp = bookings.some((booking) => !monthKeyInSriLanka(booking.createdAt));
  const selectedStats = monthStats(bookings, selectedMonth, hasUnknownTimestamp);
  const weeks = calendarWeeksInMonth(selectedMonth);
  const weekValues = weeks.map((_, weekIndex) => {
    if (hasUnknownTimestamp) return null;
    return bookings.filter((booking) => {
      if (!isConfirmed(booking.status) || monthKeyInSriLanka(booking.createdAt) !== selectedMonth) return false;
      const receivedDate = dateKeyInSriLanka(booking.createdAt);
      return !!receivedDate && weekBucketIndex(receivedDate, selectedMonth) === weekIndex;
    }).length;
  });
  const maxValue = Math.max(1, ...weekValues.filter((value): value is number => value !== null));
  const listingStats = experiences.map((experience) => {
    const own = bookings.filter((booking) => booking.experienceId === experience.id);
    const missingDate = own.some((booking) => !monthKeyInSriLanka(booking.createdAt));
    const cohort = own.filter((booking) => monthKeyInSriLanka(booking.createdAt) === selectedMonth);
    const confirmed = cohort.filter((booking) => isConfirmed(booking.status));
    const unknownAmount = confirmed.some((booking) =>
      booking.totalAmount == null || !Number.isFinite(booking.totalAmount) || booking.currencyCode !== "LKR"
    );
    const confirmedValue = unknownAmount ? null : confirmed.reduce((sum, booking) => sum + (booking.totalAmount ?? 0), 0);
    return {
      experience, requests: hasUnknownTimestamp || missingDate ? null : cohort.length,
      confirmed: hasUnknownTimestamp || missingDate ? null : confirmed.length,
      value: hasUnknownTimestamp || missingDate ? null : confirmedValue,
      valueUnavailable: hasUnknownTimestamp || missingDate || unknownAmount,
    };
  });
  type ListingStat = (typeof listingStats)[number];
  const listingColumns: AdminColumn<ListingStat>[] = [
    { key: "listing", label: "Listing", sortValue: (row) => row.experience.title, render: (row) => <strong>{row.experience.title}</strong> },
    { key: "status", label: "Status", sortValue: (row) => row.experience.status, render: (row) => <span className="v5-table-status">{row.experience.status}</span> },
    { key: "requests", label: "Requests", sortValue: (row) => row.requests ?? -1, render: (row) => row.requests ?? "Unavailable" },
    { key: "confirmed", label: "Confirmed / completed", sortValue: (row) => row.confirmed ?? -1, render: (row) => row.confirmed ?? "Unavailable" },
    { key: "value", label: "Value", sortValue: (row) => row.value ?? -1, render: (row) => money(row.value, row.valueUnavailable) },
  ];
  const adminListingRows = adminMode && listingStatusFilter !== "all"
    ? listingStats.filter((row) => row.experience.status === listingStatusFilter)
    : listingStats;
  const loading = bookingsQuery.isLoading || experiencesQuery.isLoading;
  const exportCsv = () => {
    const cell = (value: unknown) => {
      let text = String(value ?? "");
      if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replace(/"/g, '""')}"`;
    };
    const rows = [
      ["Received at", "Listing", "Member", "Status", "Quantity", "Total LKR"],
      ...bookings.map((booking) => [
        booking.createdAt ?? "",
        booking.experience?.title ?? "",
        booking.customer?.fullName ?? "",
        booking.status,
        booking.qty,
        booking.totalAmount == null ? "" : booking.totalAmount,
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vendor-${adminVendorId}-booking-stats-${selectedMonth}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <main className="v5-page"><div className="v5-skeleton" /><div className="v5-stats-top"><div className="v5-skeleton" /><div className="v5-skeleton" /><div className="v5-skeleton" /></div><div className="v5-skeleton" /></main>;
  if (bookingsQuery.isError || experiencesQuery.isError) return <main className="v5-page">
    <div className="v5-inline-alert" role="alert">Stats could not be loaded. Your booking history is unchanged.
      <button onClick={() => { void bookingsQuery.refetch(); void experiencesQuery.refetch(); }}>Retry</button>
    </div>
  </main>;

  return <main className="v5-page">
    <header className="v5-heading">
      <div><p className="v5-eyebrow">Booking activity</p><h1>Stats</h1><p>Requests are grouped by when they arrived, in Sri Lanka time.</p></div>
      <div className="v5-toolbar">{adminMode&&<button className="v5-button v5-button-secondary" type="button" onClick={exportCsv}>Export CSV</button>}<label className="sr-only" htmlFor="v5-stats-month">Choose a month</label>
        <select className="v5-select v5-month-picker" id="v5-stats-month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
          {months.map((month) => <option key={month} value={month}>{monthTitle(month)}</option>)}
        </select>
      </div>
    </header>
    {hasUnknownTimestamp && <div className="v5-inline-alert" role="status">Some booking received timestamps are missing. Monthly and weekly request cohorts are unavailable rather than estimated.</div>}
    <section className="v5-stats-top" aria-label={`Booking summary for ${monthTitle(selectedMonth)}`}>
      <div className="v5-stat"><span>Requests received</span><strong>{selectedStats.requests ?? "Unavailable"}</strong><small>{monthTitle(selectedMonth)} · Sri Lanka time</small></div>
      <div className="v5-stat"><span>Confirmed & completed</span><strong>{selectedStats.confirmed ?? "Unavailable"}</strong><small>Requests received this month</small></div>
      <div className="v5-stat"><span>Confirmed booking value</span><strong>{money(selectedStats.value, selectedStats.valueUnavailable)}</strong><small>Whole LKR · no currency conversion</small></div>
    </section>

    <div className="v5-stats-grid">
      <section className="v5-panel" aria-labelledby="v5-weekly-title">
        <div className="v5-panel-head"><div><p className="v5-eyebrow">Weekly pulse</p><h2 id="v5-weekly-title">Confirmed bookings per week</h2><p className="v5-subtle">Monday–Sunday weeks, clipped to {monthTitle(selectedMonth)}.</p></div><BarChart3 size={20} aria-hidden="true" /></div>
        {hasUnknownTimestamp ? <div className="v5-empty"><h3>Weekly cohorts unavailable</h3><p>Received timestamps are missing, so a complete week-by-week count cannot be shown.</p></div> : weeks.length ? <figure className="v5-chart" aria-labelledby="v5-weekly-title" aria-describedby="v5-chart-caption">
          <div className="v5-chart-wrap" role="img" aria-label={`${monthTitle(selectedMonth)} weekly confirmed booking counts: ${weekValues.map((value, index) => `week ${index + 1}: ${value}`).join(", ")}`}>
            {weekValues.map((value, index) => <div className="v5-bar-col" key={`${selectedMonth}-${index}`} aria-hidden="true">
              <span className="v5-bar-value">{value}</span>
              <div className="v5-bar" style={{ height: `${((value ?? 0) / maxValue) * 145}px` }} />
              <span className="v5-bar-label">{weeks[index].label}</span>
            </div>)}
          </div>
           <figcaption className="v5-chart-caption" id="v5-chart-caption">Confirmed and completed bookings by received week in {monthTitle(selectedMonth)}. Week ranges begin Monday and include only dates within this month.</figcaption>
           <div className="sr-only"><table><caption>Weekly confirmed booking counts for {monthTitle(selectedMonth)}</caption><thead><tr><th>Week dates</th><th>Confirmed bookings</th></tr></thead><tbody>{weeks.map((week, index) => <tr key={week.label}><td>{week.label}</td><td>{weekValues[index]}</td></tr>)}</tbody></table></div>
        </figure> : <div className="v5-empty"><h3>No weekly buckets</h3><p>No calendar dates are available for this period.</p></div>}
      </section>

      <section className="v5-panel" aria-labelledby="v5-month-history-title">
        <div className="v5-panel-head"><div><p className="v5-eyebrow">Six-month view</p><h2 id="v5-month-history-title">Received request cohorts</h2><p className="v5-subtle">Bookings counted by received timestamp in Sri Lanka time.</p></div><CalendarDays size={20} aria-hidden="true" /></div>
        <div className="v5-table-wrap"><table className="v5-table">
          <thead><tr><th>Month</th><th>Requests</th><th>Confirmed / completed</th><th>Value</th></tr></thead>
          <tbody>{months.map((month) => {
            const stats = monthStats(bookings, month, hasUnknownTimestamp);
            return <tr key={month}><td><strong>{monthTitle(month)}</strong></td><td>{stats.requests ?? "Unavailable"}</td><td>{stats.confirmed ?? "Unavailable"}</td><td>{money(stats.value, stats.valueUnavailable)}</td></tr>;
          })}</tbody>
        </table></div>
      </section>
    </div>

    <section className="v5-panel" aria-labelledby="v5-listing-stats-title">
      <div className="v5-panel-head"><div><p className="v5-eyebrow">Listing breakdown</p><h2 id="v5-listing-stats-title">Activity by listing</h2><p className="v5-subtle">{monthTitle(selectedMonth)} · includes listings with no bookings.</p></div></div>
      {adminMode ? listingStats.length ? <AdminTable
        rows={adminListingRows}
        columns={listingColumns}
        searchText={(row) => `${row.experience.title} ${row.experience.status} ${row.experience.category} ${row.experience.city ?? ""}`}
        filterControls={<div className="ad-filter-chips" aria-label="Filter listing stats by status">{[["all","All"],["draft","Draft"],["published","Published"],["unpublished","Unpublished"]].map(([value,label]) => <button key={value} type="button" className={`ad-chip${listingStatusFilter === value ? " selected" : ""}`} aria-pressed={listingStatusFilter === value} onClick={() => setListingStatusFilter(value)}>{label}</button>)}</div>}
      /> : <div className="v5-empty"><p>No listings to compare yet.</p></div> : listingStats.length ? <div className="v5-table-wrap"><table className="v5-table">
        <thead><tr><th>Listing</th><th>Status</th><th>Requests</th><th>Confirmed / completed</th><th>Value</th></tr></thead>
        <tbody>{listingStats.map(({ experience, requests, confirmed, value, valueUnavailable }) => <tr key={experience.id}>
          <td><strong>{experience.title}</strong></td><td><span className="v5-table-status">{experience.status}</span></td><td>{requests ?? "Unavailable"}</td><td>{confirmed ?? "Unavailable"}</td><td>{money(value, valueUnavailable)}</td>
        </tr>)}</tbody>
      </table></div> : <div className="v5-empty"><p>No listings to compare yet.</p><Link className="v5-button" href="/vendor/listings/new">Add your first listing</Link></div>}
      <p className="v5-chart-caption">Amounts are stored and shown as whole LKR. Missing booking amounts or non-LKR totals are marked unavailable.</p>
    </section>

    {selectedStats.requests===0&&<div className="v5-empty"><p>No requests received this month yet.</p><Link className="v5-button" href="/vendor/schedule">Set your schedule</Link></div>}
    <p className="v5-chart-caption">Page views coming soon.</p>
  </main>;
}
