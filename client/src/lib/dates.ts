// Local-date-safe YYYY-MM-DD (toISOString would shift the day in non-UTC zones).
export const toLocalDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
