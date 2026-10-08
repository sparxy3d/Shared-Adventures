// Business time is Sri Lanka (Asia/Colombo, UTC+05:30, no DST).
// The server runs in UTC, so never use getHours()/toISOString() for "today" or "now".

const OFFSET_MINUTES = 5 * 60 + 30;

function shifted(d: Date = new Date()): Date {
  return new Date(d.getTime() + OFFSET_MINUTES * 60_000);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in Colombo as YYYY-MM-DD. */
export function colomboToday(d: Date = new Date()): string {
  const s = shifted(d);
  return `${s.getUTCFullYear()}-${pad(s.getUTCMonth() + 1)}-${pad(s.getUTCDate())}`;
}

/** Current time of day in Colombo as HH:MM. */
export function colomboNowHHMM(d: Date = new Date()): string {
  const s = shifted(d);
  return `${pad(s.getUTCHours())}:${pad(s.getUTCMinutes())}`;
}

/** Day of week in Colombo, 0 = Sunday. */
export function colomboDayOfWeek(d: Date = new Date()): number {
  return shifted(d).getUTCDay();
}

/** Add days to a YYYY-MM-DD string. */
export function addDays(dateStr: string, days: number): string {
  const [y, m, day] = dateStr.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, day + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Weekday (0 = Sunday) of a YYYY-MM-DD string. */
export function dayOfWeekOf(dateStr: string): number {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay();
}

/** HH:MM plus minutes, capped at 23:59. */
export function addMinutesHHMM(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Normalise "9:00" to "09:00". */
export function normaliseHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${pad(h)}:${pad(m)}`;
}
