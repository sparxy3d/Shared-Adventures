// Local-date-safe YYYY-MM-DD (toISOString would shift the day in non-UTC zones).
export const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "2026-08-05" -> "Wednesday, 5 Aug" (noon anchor avoids timezone day-shift).
export const formatDayHeading = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short" }).format(
    new Date(`${iso}T12:00:00`)
  );

// "14:00" -> "2:00 PM"
export const formatTime12h = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
};
