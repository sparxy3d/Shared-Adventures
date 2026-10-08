import { addDays, dayOfWeekOf } from "./time";

export type WeeklySession = { weekday: number; startTime: string; capacity: number };

/** Tomorrow onwards; never depends on the host/browser timezone. */
export function sessionPlan(today: string, days: number, pattern: WeeklySession[], duration: number) {
  const sessions: Array<{ date: string; startTime: string; endTime: string; capacity: number }> = [];
  const keys = new Set<string>();
  for (let offset = 1; offset <= days; offset++) {
    const date = addDays(today, offset);
    for (const entry of pattern) {
      if (entry.weekday !== dayOfWeekOf(date)) continue;
      const key = `${date}/${entry.startTime}`;
      if (keys.has(key)) continue;
      keys.add(key);
      const [hour, minute] = entry.startTime.split(":").map(Number);
      const end = (hour * 60 + minute + duration) % 1440;
      sessions.push({ date, startTime: entry.startTime,
        endTime: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
        capacity: entry.capacity });
    }
  }
  return sessions;
}
