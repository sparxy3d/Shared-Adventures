import type { Experience } from "@shared/schema";
import { SUPPORTED_CITIES } from "@shared/catalog";
import { formatTime12h } from "./dates";

export type Session = { slotId: number; date: string; startTime: string; endTime: string; spotsLeft: number };
export type Activity = Experience & { vendorName?: string | null; nextSession?: Session | null };
export type DiscoveryChoices = { city: string; group: "1" | "2" | "3-5" | "6+"; time: "now" | "tonight" | "weekend" | "date"; date: string };

export function sriLankaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function sessionInstant(session: Session) {
  return Date.parse(`${session.date}T${session.startTime}:00+05:30`);
}
export function shortSessionTime(time: string) {
  return formatTime12h(time).replace(":00 ", " ");
}
export function sessionChip(session: Session | null | undefined, now = new Date()) {
  if (!session || session.spotsLeft <= 0) return null;
  const start = sessionInstant(session);
  if (!Number.isFinite(start) || start < now.getTime()) return null;
  const minutes = Math.ceil((start - now.getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? "Starts in 1 min" : `Starts in ${minutes} min`;
  const time = shortSessionTime(session.startTime);
  if (session.date === sriLankaToday(now)) return `${session.startTime >= "17:00" ? "Tonight" : "Today"} ${time}`;
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", weekday: "short" }).format(new Date(start));
  return `${weekday} ${time}`;
}
export function durationLabel(minutes: number | null | undefined) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} ${hours === 1 ? "hr" : "hrs"}${rest ? ` ${rest} min` : ""}`;
}
export function discoveryParams(choices: DiscoveryChoices, noWindow = false) {
  const params = new URLSearchParams({ group: choices.group });
  if (choices.city.trim()) params.set("city", choices.city.trim());
  if (!noWindow) {
    if (choices.time === "date") { if (choices.date) params.set("date", choices.date); }
    else params.set("time", choices.time);
  }
  return params;
}
export function ideasHeading(count: number, choices: DiscoveryChoices) {
  const people = choices.group === "1" ? "1 person" : `${choices.group === "3-5" ? "3–5" : choices.group} people`;
  let when = choices.time === "weekend" ? "this weekend" : choices.time === "tonight" ? "tonight" : "right now";
  if (choices.time === "date" && choices.date) {
    when = `on ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", weekday: "short", day: "numeric", month: "short" }).format(new Date(`${choices.date}T12:00:00+05:30`)).replace(",", "")}`;
  }
  return `${count} ${count === 1 ? "thing" : "things"} for ${people} ${when}${choices.city ? ` in ${choices.city}` : ""}`;
}
export function nearestCity(lat: number, lng: number) {
  const radians = (value: number) => value * Math.PI / 180;
  const distance = (city: typeof SUPPORTED_CITIES[number]) => {
    const a = Math.sin(radians(city.lat - lat) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(city.lat)) * Math.sin(radians(city.lng - lng) / 2) ** 2;
    return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  return [...SUPPORTED_CITIES].sort((a, b) => distance(a) - distance(b))[0].name;
}
