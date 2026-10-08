export interface WeeklyPatternEntry {
  weekday: number;
  startTime: string;
  capacity: number;
}

export interface SavedWeeklyPattern {
  version: 1;
  label: "Pattern saved on this device";
  pattern: WeeklyPatternEntry[];
}

export interface VendorScheduleSlot {
  id: number;
  experienceId: number;
  date: string;
  startTime: string;
  endTime?: string;
  capacity: number;
  status: string;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function validPattern(value: unknown): value is WeeklyPatternEntry[] {
  return Array.isArray(value) && value.every((entry) =>
    !!entry && typeof entry === "object" &&
    Number.isInteger((entry as WeeklyPatternEntry).weekday) &&
    (entry as WeeklyPatternEntry).weekday >= 0 && (entry as WeeklyPatternEntry).weekday <= 6 &&
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test((entry as WeeklyPatternEntry).startTime) &&
    Number.isInteger((entry as WeeklyPatternEntry).capacity) &&
    (entry as WeeklyPatternEntry).capacity > 0 && (entry as WeeklyPatternEntry).capacity <= 10000
  ) && new Set(value.map((entry) => `${entry.weekday}|${entry.startTime}`)).size === value.length;
}

export function savedPatternKey(vendorId: number | string, listingId: number | string) {
  return `vendor/${vendorId}/listing/${listingId}`;
}

export function readSavedPattern(vendorId: number | string, listingId: number | string): SavedWeeklyPattern | null {
  try {
    const raw = localStorage.getItem(savedPatternKey(vendorId, listingId));
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const record = value as Partial<SavedWeeklyPattern>;
    return record.version === 1 && record.label === "Pattern saved on this device" && validPattern(record.pattern)
      ? { version: 1, label: "Pattern saved on this device", pattern: record.pattern }
      : null;
  } catch {
    return null;
  }
}

export function storePattern(vendorId: number | string, listingId: number | string, pattern: WeeklyPatternEntry[]) {
  if (!validPattern(pattern)) throw new Error("Check each weekday, time and capacity. A day cannot have the same time twice.");
  const value: SavedWeeklyPattern = { version: 1, label: "Pattern saved on this device", pattern };
  localStorage.setItem(savedPatternKey(vendorId, listingId), JSON.stringify(value));
}

export function sriLankaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function shiftDate(date: string, amount: number) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + amount, 12));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}-${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

export function dateWeekday(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = {}) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC", day: "numeric", month: "short", ...options,
  }).format(new Date(Date.UTC(year, month - 1, day, 12))).replace(/,/g, "");
}

export function weekdayLabel(weekday: number, short = false) {
  return (short ? SHORT_WEEKDAYS : WEEKDAYS)[weekday] ?? "";
}

export function monthKeyInSriLanka(timestamp: string | null | undefined) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo", year: "numeric", month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : null;
}

export function dateKeyInSriLanka(timestamp: string | null | undefined) {
  if (!timestamp) return null;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function recentMonthKeys(now = new Date()) {
  const key = monthKeyInSriLanka(now.toISOString()) ?? "1970-01";
  const [year, month] = key.split("-").map(Number);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - (5 - index), 1, 12));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

export function monthTitle(key: string, includeYear = true) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-LK", { timeZone: "UTC", month: "long", ...(includeYear ? { year: "numeric" as const } : {}) })
    .format(new Date(Date.UTC(year, month - 1, 1, 12)));
}

export function calendarWeeksInMonth(key: string) {
  const [year, month] = key.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const result: Array<{ start: number; end: number; label: string }> = [];
  let day = 1;
  while (day <= lastDay) {
    const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    const weekStart = day - mondayOffset;
    const weekEnd = Math.min(lastDay, weekStart + 6);
    const start = Math.max(1, weekStart);
    result.push({ start, end: weekEnd, label: `${start}–${weekEnd}` });
    day = weekEnd + 1;
  }
  return result;
}

export function weekBucketIndex(date: string, key: string) {
  const [year, month] = key.split("-").map(Number);
  const day = Number(date.slice(8, 10));
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  const mondayOffset = (weekday + 6) % 7;
  const mondayDate = day - mondayOffset;
  const first = new Date(Date.UTC(year, month - 1, 1, 12));
  const firstMonday = 1 - ((first.getUTCDay() + 6) % 7);
  return Math.max(0, Math.floor((mondayDate - firstMonday) / 7));
}
