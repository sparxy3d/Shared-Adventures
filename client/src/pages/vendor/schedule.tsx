import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueries, useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { CalendarDays, Check, ChevronRight, Clock3, Plus, Save, Trash2, X } from "lucide-react";
import type { AvailabilitySlot, Experience } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatVendorTime, type VendorBooking } from "@/lib/vendor-bookings";
import {
  dateLabel, dateWeekday, monthTitle, readSavedPattern, savedPatternKey, shiftDate,
  sriLankaDateKey, storePattern, validPattern, weekdayLabel, type WeeklyPatternEntry,
  type VendorScheduleSlot,
} from "@/lib/vendor-schedule";
import "@/components/vendor-schedule-stage-five.css";

type DialogState =
  | { type: "pattern"; weekday: number; entry?: WeeklyPatternEntry }
  | { type: "date"; date: string }
  | { type: "remove"; slot: VendorScheduleSlot }
  | { type: "close-day"; date: string };

function errorCopy(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (/409|bookings|already|can't be deleted|cannot be deleted/i.test(message)) {
    return "This session has a booking. Requested and confirmed bookings must be handled with the member first; the session was not removed.";
  }
  try {
    const detail = message.slice(message.indexOf("{"));
    const parsed = JSON.parse(detail) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch { /* Use the useful generic message below. */ }
  return fallback;
}

function activeBookingSeats(slotId: number, bookings: VendorBooking[]) {
  return bookings.filter((booking) => booking.slotId === slotId && ["requested", "confirmed"].includes(booking.status))
    .reduce((total, booking) => total + (Number.isFinite(booking.qty) ? booking.qty : 0), 0);
}

function upcomingPattern(slots: VendorScheduleSlot[], today: string, bookings: VendorBooking[]): WeeklyPatternEntry[] {
  const entries = new Map<string, WeeklyPatternEntry>();
  slots.filter((slot) => slot.date >= today && slot.status === "open").forEach((slot) => {
    const entry = { weekday: dateWeekday(slot.date), startTime: slot.startTime.slice(0, 5), capacity: slot.capacity + activeBookingSeats(slot.id, bookings) };
    entries.set(`${entry.weekday}|${entry.startTime}`, entry);
  });
  return Array.from(entries.values()).sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
}

export default function VendorSchedule({ adminVendorId }: { adminVendorId?: number } = {}) {
  const { user } = useAuth();
  const adminMode = adminVendorId !== undefined;
  const vendorId = adminVendorId ?? user?.id ?? "vendor";
  const [selectedId, setSelectedId] = useState(() => new URLSearchParams(window.location.search).get("listing") ?? "");
  const [pattern, setPattern] = useState<WeeklyPatternEntry[]>([]);
  const [patternReady, setPatternReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inlineError, setInlineError] = useState("");
  const [statusNotice, setStatusNotice] = useState("");
  const [timeValue, setTimeValue] = useState("09:00");
  const [capacityValue, setCapacityValue] = useState("10");
  const [reasonValue, setReasonValue] = useState("");
  const [confirmedClose, setConfirmedClose] = useState(false);
  const [removeConfirmed, setRemoveConfirmed] = useState(false);
  const initializedKey = useRef("");
  const dialogLayer = useRef<HTMLDivElement>(null);

  const experiencesQuery = useQuery<Experience[]>({ queryKey: adminMode ? ["/api/admin/vendors", adminVendorId, "experiences"] : ["/api/vendor/experiences"] });
  const experiences = experiencesQuery.data ?? [];
  const slotQueries = useQueries({
    queries: experiences.map((experience) => ({
      queryKey: adminMode ? ["/api/admin/experiences", String(experience.id), "slots"] : ["/api/vendor/experiences", String(experience.id), "slots"],
      staleTime: 30_000,
    })) as UseQueryOptions<AvailabilitySlot[]>[],
  });
  const bookingsQuery = useQuery<VendorBooking[]>({ queryKey: adminMode ? ["/api/admin/vendors", adminVendorId, "bookings"] : ["/api/vendor/bookings"], staleTime: 30_000 });
  const allSlots = useMemo(() => slotQueries.flatMap((query, index) =>
    (query.data ?? []).map((slot) => ({ ...slot, experienceId: experiences[index]?.id } as VendorScheduleSlot))
  ), [experiences, slotQueries]);
  const selected = experiences.find((experience) => String(experience.id) === selectedId) ?? null;
  const selectedSlots = allSlots.filter((slot) => slot.experienceId === selected?.id).sort((a, b) =>
    a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
  );
  const today = sriLankaDateKey();
  const tomorrow = shiftDate(today, 1);
  const futureSlots = selectedSlots.filter((slot) => slot.date >= tomorrow);
  const bookings = bookingsQuery.data ?? [];
  const selectedSlotQuery = slotQueries[experiences.findIndex((experience) => experience.id === selected?.id)];
  const dates = useMemo(() => Array.from({ length: 60 }, (_, index) => shiftDate(tomorrow, index)), [tomorrow]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: adminMode ? ["/api/admin/vendors", adminVendorId, "experiences"] : ["/api/vendor/experiences"] });
    if (adminMode) await queryClient.invalidateQueries({ queryKey: ["/api/admin/experiences"] });
    await queryClient.invalidateQueries({ queryKey: adminMode ? ["/api/admin/vendors", adminVendorId, "bookings"] : ["/api/vendor/bookings"] });
  };
  const addSlot = useMutation({
    mutationFn: (value: { listingId: number; date: string; startTime: string; capacity: number }) =>
      apiRequest("POST", `${adminMode ? "/api/admin" : "/api/vendor"}/experiences/${value.listingId}/slots`, {
        date: value.date, startTime: value.startTime, capacity: value.capacity,
      }),
    onSuccess: refresh,
  });
  const deleteSlot = useMutation({
    mutationFn: (slotId: number) => apiRequest("DELETE", `${adminMode ? "/api/admin" : "/api/vendor"}/slots/${slotId}`),
    onSuccess: refresh,
  });
  const generate = useMutation({
    mutationFn: (value: { listingId: number; pattern: WeeklyPatternEntry[] }) =>
      apiRequest("POST", `${adminMode ? "/api/admin" : "/api/vendor"}/experiences/${value.listingId}/generate-sessions`, { pattern: value.pattern, days: 60 }),
    onSuccess: refresh,
  });
  const closeDay = useMutation({
    mutationFn: (value: { listingId: number; date: string; reason: string }) =>
      apiRequest("POST", `${adminMode ? "/api/admin" : "/api/vendor"}/experiences/${value.listingId}/close-day`, { date: value.date, reason: value.reason }),
    onSuccess: refresh,
  });

  useEffect(() => {
    if (!experiencesQuery.data?.length) return;
    const nextSelected = experiences.some((experience) => String(experience.id) === selectedId)
      ? selectedId
      : String(experiences[0].id);
    if (nextSelected !== selectedId) setSelectedId(nextSelected);
    const params = new URLSearchParams(window.location.search);
    params.set("listing", nextSelected);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  }, [experiencesQuery.data, experiences, selectedId]);

  useEffect(() => {
    if (!selected || selectedSlotQuery?.isLoading || selectedSlotQuery?.isError || bookingsQuery.isLoading || bookingsQuery.isError) return;
    const key = savedPatternKey(vendorId, selected.id);
    if (initializedKey.current === key) return;
    initializedKey.current = key;
    const localPattern = readSavedPattern(vendorId, selected.id);
    if (localPattern) {
      setPattern(localPattern.pattern);
      setSaved(true);
    } else {
      setPattern(upcomingPattern(selectedSlots, tomorrow, bookings));
      setSaved(false);
    }
    setPatternReady(true);
  }, [selected, selectedSlots, tomorrow, vendorId, selectedSlotQuery?.isLoading, bookingsQuery.isLoading, bookings]);

  useEffect(() => {
    setPatternReady(false);
    initializedKey.current = "";
  }, [selectedId]);

  useEffect(() => {
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = dialogLayer.current?.querySelector<HTMLElement>(
      ".v5-dialog button, .v5-dialog input, .v5-dialog textarea, .v5-dialog select"
    );
    first?.focus();
    function keepFocus(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setDialog(null);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(dialogLayer.current?.querySelectorAll<HTMLElement>(
        ".v5-dialog button:not(:disabled), .v5-dialog input:not(:disabled), .v5-dialog textarea:not(:disabled), .v5-dialog select:not(:disabled)"
      ) ?? []);
      if (!nodes.length) return;
      const firstNode = nodes[0];
      const lastNode = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === firstNode) {
        event.preventDefault();
        lastNode.focus();
      } else if (!event.shiftKey && document.activeElement === lastNode) {
        event.preventDefault();
        firstNode.focus();
      }
    }
    document.addEventListener("keydown", keepFocus);
    return () => {
      document.removeEventListener("keydown", keepFocus);
      previousFocus?.focus();
    };
  }, [dialog]);

  function chooseListing(id: string) {
    setSelectedId(id);
    const params = new URLSearchParams(window.location.search);
    params.set("listing", id);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}${window.location.hash}`);
  }

  function openPattern(weekday: number, entry?: WeeklyPatternEntry) {
    setTimeValue(entry?.startTime ?? "09:00");
    setCapacityValue(String(entry?.capacity ?? selected?.capacity ?? 1));
    setDialog({ type: "pattern", weekday, entry });
  }

  function savePatternEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog || dialog.type !== "pattern") return;
    const entry = { weekday: dialog.weekday, startTime: timeValue, capacity: Number(capacityValue) };
    if (!validPattern([entry])) return;
    const next = dialog.entry
      ? pattern.map((item) => item === dialog.entry ? entry : item)
      : [...pattern, entry];
    if (!validPattern(next)) {
      setInlineError("That weekday already has a session at this time. Choose a different time.");
      return;
    }
    setPattern(next.sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)));
    setSaved(false);
    setInlineError("");
    setDialog(null);
  }

  function saveLocalPattern() {
    if (!selected) return;
    try {
      storePattern(vendorId, selected.id, pattern);
      setSaved(true);
      setInlineError("");
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Could not save this pattern on this device.");
    }
  }

  async function generateSessions() {
    if (!selected || !pattern.length) return;
    setInlineError("");
    try {
      const response = await generate.mutateAsync({ listingId: selected.id, pattern });
      const body = await response.json() as { created?: number };
      setInlineError("");
      setStatusNotice(`${body.created ?? 0} sessions added from tomorrow for the next 60 days. Existing sessions were left unchanged.`);
    } catch (error) {
      setInlineError(errorCopy(error, "Could not generate sessions. Please try again."));
    }
  }

  async function addOneOff(event: FormEvent<HTMLFormElement>, date: string) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const time = String(form.get("startTime") ?? "");
    const capacity = Number(form.get("capacity"));
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) || !Number.isInteger(capacity) || capacity < 1 || capacity > 10000) return;
    setInlineError("");
    try {
      await addSlot.mutateAsync({ listingId: selected.id, date, startTime: time, capacity });
      setStatusNotice("One-off session added.");
      setDialog(null);
    } catch (error) {
      setInlineError(errorCopy(error, "Could not add this session. Please check the date and try again."));
    }
  }

  async function removeSession(slot: VendorScheduleSlot) {
    setInlineError("");
    try {
      await deleteSlot.mutateAsync(slot.id);
      setDialog(null);
      setRemoveConfirmed(false);
      setStatusNotice("Session removed.");
    } catch (error) {
      if (error instanceof Error && /409/.test(error.message)) void refresh();
      setInlineError(errorCopy(error, "Could not remove this session."));
    }
  }

  async function closeDate() {
    if (!selected || !dialog || dialog.type !== "close-day" || !confirmedClose || !reasonValue.trim()) return;
    setInlineError("");
    try {
      const response = await closeDay.mutateAsync({ listingId: selected.id, date: dialog.date, reason: reasonValue.trim() });
      const result = await response.json() as { removed?: number; kept?: number };
      setDialog(null);
      setReasonValue("");
      setConfirmedClose(false);
      if (result.kept) setStatusNotice(`${result.removed ?? 0} eligible session(s) removed. ${result.kept} other session(s) were kept by the server.`);
      else setStatusNotice(`${result.removed ?? 0} unbooked session(s) removed. No booked sessions were changed.`);
    } catch (error) {
      setInlineError(errorCopy(error, "Could not close this date."));
    }
  }

  const slotsLoading = slotQueries.some((query) => query.isLoading);
  const slotsFailed = slotQueries.some((query) => query.isError);
  const isLoading = experiencesQuery.isLoading || bookingsQuery.isLoading || slotsLoading;
  const calendarNodes: ReactNode[] = [];
  let previousMonth = "";
  dates.forEach((date) => {
    const month = date.slice(0, 7);
    if (month !== previousMonth) {
      calendarNodes.push(<div className="v5-month-label" key={`month-${month}`}>{monthTitle(month)}</div>);
      const firstDayOfMonthSegment = (dateWeekday(date) + 6) % 7;
      for (let index = 0; index < firstDayOfMonthSegment; index += 1) {
        calendarNodes.push(<div aria-hidden="true" key={`blank-${month}-${index}`} />);
      }
      previousMonth = month;
    }
    const daySlots = futureSlots.filter((slot) => slot.date === date);
    const seats = daySlots.reduce((sum, slot) => sum + activeBookingSeats(slot.id, bookings), 0);
    calendarNodes.push(
      <button key={date} type="button" className={`v5-date-card ${daySlots.length ? "is-busy" : "is-empty"}`} onClick={() => { setInlineError(""); setDialog({ type: "date", date }); }}>
        <span className="v5-date-num">{weekdayLabel(dateWeekday(date), true)}<small>{date.slice(8)}</small></span>
        <span className="v5-date-count">{daySlots.length ? `${daySlots.length} session${daySlots.length === 1 ? "" : "s"}` : "Open day"}</span>
        <span className="v5-date-title">{daySlots.length ? `${seats} booked` : "Tap to manage"}</span>
      </button>
    );
  });

  if (experiencesQuery.isLoading) return <div className="v5-page"><div className="v5-skeleton" /><div className="v5-skeleton" /></div>;
  if (experiencesQuery.isError) return <div className="v5-page"><div className="v5-inline-alert" role="alert">Your listings could not be loaded. <button onClick={() => experiencesQuery.refetch()}>Try again</button></div></div>;
  if (bookingsQuery.isError || slotsFailed) return <div className="v5-page"><div className="v5-inline-alert" role="alert">Schedule availability or booking details could not be loaded. No session changes are available until the data refreshes. <button onClick={() => { void bookingsQuery.refetch(); slotQueries.forEach((query) => void query.refetch()); }}>Retry</button></div></div>;
  if (!experiences.length) return <div className="v5-page"><header className="v5-heading"><div><p className="v5-eyebrow">Your operations</p><h1>Schedule</h1></div></header><div className="v5-empty"><h3>Start with a listing</h3><p>Add a listing before setting dates and sessions.</p></div></div>;

  return <main className="v5-page">
    <header className="v5-heading">
      <div><p className="v5-eyebrow">Sessions & availability</p><h1>Schedule</h1><p>Set a repeatable rhythm, then shape the next two months day by day.</p></div>
      <div className="v5-toolbar"><label className="sr-only" htmlFor="v5-listing">Choose listing</label>
        <select id="v5-listing" className="v5-select" value={selected?.id ?? ""} onChange={(event) => chooseListing(event.target.value)}>
          {experiences.map((experience) => <option key={experience.id} value={experience.id}>{experience.title}</option>)}
        </select>
      </div>
    </header>
    {inlineError && <div className="v5-inline-alert" role="alert">{inlineError}<button onClick={() => { setInlineError(""); void refresh(); }}>Retry</button></div>}
    {statusNotice && <div className="v5-inline-alert" role="status">{statusNotice}<button onClick={() => setStatusNotice("")}>Dismiss</button></div>}
    {isLoading && <><div className="v5-skeleton" /><div className="v5-skeleton" /></>}
    {!isLoading && (slotsFailed || bookingsQuery.isError) && <div className="v5-inline-alert" role="alert">Some schedule details could not be loaded. <button onClick={() => { void experiencesQuery.refetch(); void bookingsQuery.refetch(); slotQueries.forEach((query) => void query.refetch()); }}>Retry</button></div>}

    {selected && !isLoading && <>
      <section className="v5-panel" aria-labelledby="v5-pattern-heading">
        <div className="v5-panel-head"><div><p className="v5-eyebrow">Weekly pattern</p><h2 id="v5-pattern-heading">{selected.title}</h2><p className="v5-subtle">A local template you can reuse. Saving here never changes live sessions.</p></div><span className="v5-saved-label">{saved ? <><Check size={16} /> Pattern saved on this device</> : "Unsaved changes"}</span></div>
        {patternReady && <div className="v5-week-grid">{[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
          const entries = pattern.filter((entry) => entry.weekday === weekday).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return <div className="v5-weekday" key={weekday}>
            <div className="v5-weekday-head"><strong>{weekdayLabel(weekday, true)}</strong><button type="button" aria-label={`Add a ${weekdayLabel(weekday)} pattern time`} onClick={() => openPattern(weekday)}><Plus size={17} /></button></div>
            {entries.length ? entries.map((entry) => <div className="v5-chip" key={`${entry.weekday}|${entry.startTime}`}>
              <div><b>{formatVendorTime(entry.startTime)}</b><small>{entry.capacity} spots</small></div>
              <span className="v5-chip-actions">
                <button type="button" aria-label={`Edit ${weekdayLabel(weekday)} ${formatVendorTime(entry.startTime)}`} onClick={() => openPattern(weekday, entry)}><Clock3 size={15} /></button>
                <button type="button" aria-label={`Remove ${weekdayLabel(weekday)} ${formatVendorTime(entry.startTime)} from pattern`} onClick={() => { setPattern(pattern.filter((item) => item !== entry)); setSaved(false); }}><X size={15} /></button>
              </span>
            </div>) : <p className="v5-week-empty">No times</p>}
          </div>;
        })}</div>}
        <div className="v5-pattern-save"><p><strong>Pattern saved on this device</strong><br />This browser stores it for this vendor and listing only.</p><div className="v5-toolbar">
          <button className="v5-button v5-button-secondary" type="button" onClick={saveLocalPattern} disabled={!patternReady}><Save size={16} />Save pattern</button>
          <button className="v5-button" type="button" onClick={() => void generateSessions()} disabled={!pattern.length || generate.isPending}><CalendarDays size={16} />{generate.isPending ? "Adding sessions…" : "Generate next 60 days"}</button>
        </div></div>
        <p className="v5-subtle">Generation starts tomorrow in Sri Lanka time. It adds only missing listing/date/time sessions; existing sessions are never changed.</p>
        <p className="v5-subtle">Changes apply to future sessions only. Booked sessions are never removed automatically. Generating again can recreate removed, unbooked sessions from your pattern.</p>
      </section>

      <section className="v5-panel" aria-labelledby="v5-calendar-heading">
        <div className="v5-panel-head"><div><p className="v5-eyebrow">60-day outlook</p><h2 id="v5-calendar-heading">Upcoming dates</h2><p className="v5-subtle">Booked seats are calculated from real booking availability. Select a date to add a one-off session or close the day.</p></div></div>
        <div className="v5-calendar" aria-label="Calendar of the next 60 days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => <div className="v5-calendar-dow" key={label}>{label}</div>)}
          {calendarNodes}
        </div>
        <div className="v5-mobile-agenda" aria-label="Next 60 days">
          {dates.map((date) => {
            const daySlots = futureSlots.filter((slot) => slot.date === date);
            const seats = daySlots.reduce((sum, slot) => sum + activeBookingSeats(slot.id, bookings), 0);
            return <button type="button" className={`v5-agenda-day ${daySlots.length ? "is-busy" : ""}`} key={date} onClick={() => { setInlineError(""); setDialog({ type: "date", date }); }}>
              <span className="v5-agenda-date">{dateLabel(date, { weekday: "short", day: "numeric" })}</span>
              <span className="v5-agenda-copy"><strong>{daySlots.length ? `${daySlots.length} session${daySlots.length === 1 ? "" : "s"}` : "No sessions"}</strong><span>{daySlots.length ? `${seats} seats booked` : "Tap to manage date"}</span></span><ChevronRight className="v5-agenda-arrow" size={17} />
            </button>;
          })}
        </div>
      </section>

      <section className="v5-panel" aria-labelledby="v5-sessions-heading">
        <div className="v5-panel-head"><div><p className="v5-eyebrow">Live schedule</p><h2 id="v5-sessions-heading">Sessions in the next 60 days</h2></div><span className="v5-capacity-pill">{futureSlots.length} sessions</span></div>
        {futureSlots.length ? <div className="v5-slot-list">{futureSlots.map((slot) => {
          const related = bookings.filter((booking) => booking.slotId === slot.id);
          const blocked = related.some((booking) => ["requested", "confirmed"].includes(booking.status));
          const booked = activeBookingSeats(slot.id, bookings);
          return <article className="v5-slot-row" key={slot.id}>
            <div className="v5-slot-main"><strong>{dateLabel(slot.date, { weekday: "long", year: "numeric" })} · {formatVendorTime(slot.startTime)}</strong><span>{booked} booked of {slot.capacity + booked} spaces · {slot.status}</span>{blocked && <span>Requested/confirmed members are attached. Contact members before changing this session.</span>}</div>
            <div className="v5-slot-actions"><span className="v5-capacity-pill">{slot.capacity} left</span><button className="v5-button v5-button-danger" type="button" onClick={() => { setRemoveConfirmed(false); setDialog({ type: "remove", slot }); }} disabled={blocked} aria-label={`Remove session ${dateLabel(slot.date)} ${formatVendorTime(slot.startTime)}`}><Trash2 size={16} />Remove</button></div>
          </article>;
        })}</div> : <div className="v5-empty"><h3>No future sessions yet</h3><p>Use your weekly pattern to generate the next 60 days, or add a one-off date from the calendar.</p></div>}
      </section>
    </>}

    {dialog && <div ref={dialogLayer} className="v5-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
      {dialog.type === "pattern" && <form className="v5-dialog" role="dialog" aria-modal="true" aria-labelledby="v5-pattern-dialog-title" onSubmit={savePatternEntry}>
        <div className="v5-dialog-head"><div><h2 id="v5-pattern-dialog-title">{dialog.entry ? "Edit pattern time" : `Add ${weekdayLabel(dialog.weekday)} time`}</h2><p>Template only. It does not edit any booked session.</p></div><button className="v5-dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Close dialog"><X /></button></div>
         <div className="v5-form-grid"><div className="v5-field"><label htmlFor="v5-pattern-time">Start time</label><input id="v5-pattern-time" type="time" value={timeValue} onChange={(event) => setTimeValue(event.target.value)} required /></div><div className="v5-field"><label htmlFor="v5-pattern-capacity">Capacity</label><input id="v5-pattern-capacity" type="number" min="1" max="10000" value={capacityValue} onChange={(event) => setCapacityValue(event.target.value)} required /></div></div>
        <div className="v5-dialog-actions"><button className="v5-button v5-button-secondary" type="button" onClick={() => setDialog(null)}>Cancel</button><button className="v5-button" type="submit">{dialog.entry ? "Save time" : "Add time"}</button></div>
      </form>}
      {dialog.type === "date" && <div className="v5-dialog" role="dialog" aria-modal="true" aria-labelledby="v5-date-dialog-title">
        <div className="v5-dialog-head"><div><h2 id="v5-date-dialog-title">{dateLabel(dialog.date, { weekday: "long", year: "numeric" })}</h2><p>Add a one-off session or close the remaining unbooked sessions on this date.</p></div><button className="v5-dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Close dialog"><X /></button></div>
        <div className="v5-slot-list">{futureSlots.filter((slot) => slot.date === dialog.date).map((slot) => {
          const booked = activeBookingSeats(slot.id, bookings);
          const blocked = bookings.some((booking) => booking.slotId === slot.id && ["requested", "confirmed"].includes(booking.status));
          return <div className="v5-slot-row" key={slot.id}><div className="v5-slot-main"><strong>{formatVendorTime(slot.startTime)}</strong><span>{booked} booked · {slot.capacity} remaining ({slot.capacity + booked} capacity)</span></div><button type="button" className="v5-icon-button" aria-label={`Remove ${formatVendorTime(slot.startTime)} session`} disabled={blocked} title={blocked ? "Contact members with requested or confirmed bookings first" : "Remove unbooked session"} onClick={() => { setRemoveConfirmed(false); setDialog({ type: "remove", slot }); }}><Trash2 size={17} /></button></div>;
        })}</div>
        <form className="v5-form-grid" onSubmit={(event) => void addOneOff(event, dialog.date)} style={{ marginTop: 18 }}>
          <div className="v5-field"><label htmlFor="v5-oneoff-time">One-off start</label><input id="v5-oneoff-time" name="startTime" type="time" defaultValue="09:00" required /></div>
          <div className="v5-field"><label htmlFor="v5-oneoff-cap">Capacity</label><input id="v5-oneoff-cap" name="capacity" type="number" min="1" max="10000" defaultValue={selected?.capacity ?? 1} required /></div>
          <div className="v5-field-full"><button className="v5-button" type="submit" disabled={addSlot.isPending}><Plus size={16} />{addSlot.isPending ? "Adding…" : "Add one-off session"}</button></div>
        </form>
        <p className="v5-dialog-note">Closing a date removes only future open sessions without bookings. Requested and confirmed sessions stay in place.</p>
        <div className="v5-dialog-actions"><button type="button" className="v5-button v5-button-danger" onClick={() => { setReasonValue(""); setConfirmedClose(false); setDialog({ type: "close-day", date: dialog.date }); }}>Close this date</button><button className="v5-button v5-button-secondary" type="button" onClick={() => setDialog(null)}>Done</button></div>
      </div>}
      {dialog.type === "remove" && <div className="v5-dialog" role="dialog" aria-modal="true" aria-labelledby="v5-remove-dialog-title">
        <div className="v5-dialog-head"><div><h2 id="v5-remove-dialog-title">Remove this session?</h2><p>{dateLabel(dialog.slot.date, { weekday: "long", year: "numeric" })} at {formatVendorTime(dialog.slot.startTime)}</p></div><button className="v5-dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Close dialog"><X /></button></div>
        {bookings.some((booking) => booking.slotId === dialog.slot.id && ["requested", "confirmed"].includes(booking.status))
          ? <div className="v5-inline-alert">This session has a requested or confirmed booking. Contact the member first; cancellation is disabled here.</div>
          : <><p className="v5-dialog-note">Only this unbooked session will be deleted. Booked sessions are never deleted automatically. If the server finds a booking, the session will stay and the page will refresh.</p><label className="v5-check"><input type="checkbox" checked={removeConfirmed} onChange={(event) => setRemoveConfirmed(event.target.checked)} />I understand this permanently removes this unbooked session.</label></>}
        <div className="v5-dialog-actions"><button className="v5-button v5-button-secondary" type="button" onClick={() => setDialog(null)}>Keep session</button><button className="v5-button v5-button-danger" type="button" disabled={!removeConfirmed || deleteSlot.isPending || bookings.some((booking) => booking.slotId === dialog.slot.id && ["requested", "confirmed"].includes(booking.status))} onClick={() => void removeSession(dialog.slot)}><Trash2 size={16} />{deleteSlot.isPending ? "Removing…" : "Remove session"}</button></div>
      </div>}
      {dialog.type === "close-day" && <div className="v5-dialog" role="dialog" aria-modal="true" aria-labelledby="v5-close-dialog-title">
        <div className="v5-dialog-head"><div><h2 id="v5-close-dialog-title">Close {dateLabel(dialog.date, { weekday: "long", year: "numeric" })}?</h2><p>Only future, open sessions with no bookings will be removed.</p></div><button className="v5-dialog-close" type="button" onClick={() => setDialog(null)} aria-label="Close dialog"><X /></button></div>
        <p className="v5-dialog-note">Requested and confirmed sessions are kept for members. This action does not contact or cancel bookings.</p>
        <div className="v5-field" style={{ marginTop: 15 }}><label htmlFor="v5-close-reason">Reason</label><textarea id="v5-close-reason" value={reasonValue} onChange={(event) => setReasonValue(event.target.value)} maxLength={240} required placeholder="Why are you closing this date?" /></div>
        <label className="v5-check"><input type="checkbox" checked={confirmedClose} onChange={(event) => setConfirmedClose(event.target.checked)} />I confirm the unbooked sessions on this date can be removed.</label>
        <div className="v5-dialog-actions"><button className="v5-button v5-button-secondary" type="button" onClick={() => setDialog(null)}>Keep date open</button><button className="v5-button v5-button-danger" type="button" disabled={!reasonValue.trim() || !confirmedClose || closeDay.isPending} onClick={() => void closeDate()}>{closeDay.isPending ? "Closing…" : "Close date"}</button></div>
      </div>}
    </div>}
  </main>;
}
