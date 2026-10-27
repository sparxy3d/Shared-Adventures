import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";

const route = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };
const csvCell = (value: unknown) => {
  const raw = String(value ?? "");
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function registerOnboardingRoutes(app: Express) {
  app.get("/api/site-config", route(async (_req, res) => res.json(await storage.getSiteSettings())));
  app.get("/api/admin/site-settings", route(async (_req, res) => res.json(await storage.getSiteSettings())));
  app.patch("/api/admin/site-settings", route(async (req, res) => {
    const parsed = z.object({ showDemoContent: z.boolean().optional(), bookingsOpen: z.boolean().optional() })
      .strict().refine(value => Object.keys(value).length > 0).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Choose valid site settings" });
    res.json(await storage.updateSiteSettings(parsed.data));
  }));
  const attempts = new Map<string, { count: number; until: number }>();
  app.post("/api/experiences/:id/notify", route(async (req, res) => {
    const experienceId = z.coerce.number().int().positive().safeParse(req.params.id);
    const data = z.object({ email: z.string().trim().toLowerCase().email().max(254), name: z.string().trim().max(120).optional() }).strict().safeParse(req.body);
    if (!experienceId.success || !data.success) return res.status(400).json({ message: "Enter a valid email address" });
    const now = Date.now();
    // Bound both abuse and memory usage. No emails or signup data are logged.
    if (attempts.size > 5000) for (const [key, entry] of Array.from(attempts)) if (entry.until < now) attempts.delete(key);
    const key = req.ip ?? "unknown";
    const entry = attempts.get(key);
    if (entry && entry.until > now && entry.count >= 30) return res.status(429).json({ message: "Too many requests. Please try again in an hour." });
    attempts.set(key, entry && entry.until > now ? { ...entry, count: entry.count + 1 } : { count: 1, until: now + 3600_000 });
    if (!await storage.joinWaitingList(experienceId.data, data.data.email, data.data.name)) return res.status(404).json({ message: "This activity isn't available right now" });
    res.json({ ok: true });
  }));
  app.get("/api/admin/waiting-list", route(async (_req, res) => res.json(await storage.getWaitingList())));
  app.get("/api/admin/waiting-list/export", route(async (_req, res) => {
    const { entries } = await storage.getWaitingList();
    const csv = [
      ["Listing ID", "Listing", "Email", "Name", "Joined at (UTC)"],
      ...entries.map(entry => [entry.experienceId, entry.title, entry.email, entry.name, entry.createdAt.toISOString()]),
    ].map(row => row.map(csvCell).join(",")).join("\r\n");
    res.set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="free-spirit-waiting-list.csv"', "Cache-Control": "no-store" }).send(csv);
  }));
}
