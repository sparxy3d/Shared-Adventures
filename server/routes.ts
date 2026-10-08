import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage, stripPassword } from "./storage";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import pgSession from "connect-pg-simple";
import { z } from "zod";
import { pool } from "./db";
import type { User, Vendor } from "@shared/schema";
import {
  CATEGORY_VALUES, EXPERIENCE_IMAGES, IDEAL_FOR_TAGS, ROLES, DISABLED_PREFIX, isDisabledRole,
} from "@shared/catalog";
import { colomboToday, colomboNowHHMM, normaliseHHMM, addMinutesHHMM } from "./time";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return hashedBuf.length === suppliedBuf.length && timingSafeEqual(hashedBuf, suppliedBuf);
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

declare global {
  namespace Express {
    interface Locals {
      user?: User;
      vendor?: Vendor;
    }
  }
}

// ---------------------------------------------------------------------------
// Guards. Identity always comes from the server-side session, never the request.
// ---------------------------------------------------------------------------

async function loadUser(req: Request, res: Response): Promise<User | undefined> {
  if (res.locals.user) return res.locals.user;
  if (!req.session.userId) return undefined;
  const user = await storage.getUser(req.session.userId);
  if (!user || isDisabledRole(user.role)) return undefined;
  res.locals.user = user;
  return user;
}

function requireRole(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await loadUser(req, res);
      if (!user) return res.status(401).json({ message: "Please log in" });
      if (roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ message: "You don't have access to this" });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

const requireAuth = requireRole();
const requireAdmin = requireRole("admin");

/** Vendor role plus the vendor's business record, attached as res.locals.vendor. */
async function requireVendor(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await loadUser(req, res);
    if (!user) return res.status(401).json({ message: "Please log in" });
    if (user.role !== "vendor") return res.status(403).json({ message: "Vendor access only" });
    const vendor = await storage.getVendorByOwner(user.id);
    if (!vendor) return res.status(403).json({ message: "No business is linked to this vendor login" });
    res.locals.vendor = vendor;
    next();
  } catch (err) {
    next(err);
  }
}

// Simple in-memory login limiter: 10 attempts per 15 minutes per IP + email.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
function loginLimited(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 10;
}

// ---------------------------------------------------------------------------
// Validation schemas. Only the fields a role may set are accepted.
// ---------------------------------------------------------------------------

const id = (v: string | string[] | undefined) => {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

const hhmm = z.string().regex(/^\d{1,2}:\d{2}$/, "Use HH:MM").transform(normaliseHHMM);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Use at least 8 characters").max(200),
  fullName: z.string().trim().min(1).max(120),
  phone: optionalText(40),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  phone: optionalText(40),
});

const vendorProfileSchema = z.object({
  businessName: z.string().trim().min(1).max(120).optional(),
  description: optionalText(4000),
  logoUrl: optionalText(500),
  region: optionalText(120),
  city: optionalText(120),
  address: optionalText(300),
  contactEmail: z.string().trim().email().max(200).optional().nullable(),
  contactPhone: optionalText(40),
});

const applicationSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(120),
  contactEmail: z.string().trim().email().max(200),
  contactPhone: z.string().trim().min(5).max(40),
  city: z.string().trim().min(1).max(120),
  activityTypes: z.array(z.enum(CATEGORY_VALUES)).min(1),
  capacity: z.coerce.number().int().min(1).max(10000).optional().nullable(),
  typicalPrice: z.coerce.number().int().min(0).max(10_000_000).optional().nullable(),
  description: optionalText(2000),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "Please accept the vendor terms" }) }),
});

const experienceSchema = z.object({
  title: z.string().trim().min(1).max(160),
  category: z.enum(CATEGORY_VALUES),
  description: optionalText(5000),
  locationText: optionalText(300),
  region: optionalText(120),
  city: optionalText(120),
  durationMinutes: z.coerce.number().int().min(0).max(24 * 60).optional().nullable(),
  priceAmount: z.coerce.number().int().min(0).max(10_000_000).optional().nullable(),
  capacity: z.coerce.number().int().min(0).max(10000).optional().nullable(),
  ageMin: z.coerce.number().int().min(0).max(120).optional().nullable(),
  safetyNotes: optionalText(2000),
  idealForTags: z.array(z.enum(IDEAL_FOR_TAGS)).optional().nullable(),
  openTime: hhmm.optional().nullable(),
  closeTime: hhmm.optional().nullable(),
  nextSessionText: optionalText(120),
  imageUrl: z.enum(EXPERIENCE_IMAGES).optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
});

const slotSchema = z.object({
  date: isoDate,
  startTime: hhmm,
  endTime: hhmm.optional(),
  capacity: z.coerce.number().int().min(1).max(10000),
});

const bookingSchema = z.object({
  experienceId: z.coerce.number().int().positive(),
  slotId: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().min(1).max(500).default(1),
  customerNote: optionalText(1000),
});

const vendorBookingUpdateSchema = z.object({
  status: z.enum(["confirmed", "declined"]),
  vendorNote: optionalText(1000),
});

const adminBookingUpdateSchema = z.object({
  status: z.enum(["confirmed", "declined", "cancelled", "completed"]),
  vendorNote: optionalText(1000),
});

function parse<S extends z.ZodTypeAny>(schema: S, body: unknown, res: Response): z.infer<S> | undefined {
  const result = schema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    res.status(400).json({ message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input" });
    return undefined;
  }
  return result.data;
}

/** Wrap async handlers so errors reach the central handler without leaking internals. */
const h =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };

const RELEASES_SPOTS = new Set(["declined", "cancelled"]);

async function changeBookingStatus(
  bookingId: number,
  status: string,
  vendorNote: string | null | undefined,
) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) return { error: 404 as const };
  const wasHolding = booking.status === "requested" || booking.status === "confirmed";
  const updated = await storage.updateBooking(bookingId, {
    status,
    ...(vendorNote !== undefined ? { vendorNote } : {}),
  });
  if (wasHolding && RELEASES_SPOTS.has(status) && booking.slotId) {
    await storage.releaseSpots(booking.slotId, booking.qty);
  }
  return { booking: updated };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const PgStore = pgSession(session);
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) app.set("trust proxy", 1);
  if (!process.env.SESSION_SECRET) {
    console.warn("[auth] SESSION_SECRET is not set; using an insecure fallback. Set it before go-live.");
  }

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "free-spirit-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      },
    }),
  );

  // Router-level guards: anything under these prefixes fails closed, including
  // endpoints added later and forgotten.
  app.use("/api/admin", requireAdmin);
  app.use("/api/vendor", requireVendor);

  // ---------------- auth ----------------

  app.post("/api/auth/signup", h(async (req, res) => {
    const data = parse(signupSchema, req.body, res);
    if (!data) return;
    if (await storage.getUserByEmail(data.email)) {
      return res.status(400).json({ message: "That email is already registered. Try logging in." });
    }
    const user = await storage.createUser({
      email: data.email,
      password: await hashPassword(data.password),
      fullName: data.fullName,
      phone: data.phone ?? null,
      role: "customer", // never taken from the request
    });
    req.session.userId = user.id;
    res.json(stripPassword(user));
  }));

  app.post("/api/auth/login", h(async (req, res) => {
    const data = parse(loginSchema, req.body, res);
    if (!data) return;
    if (loginLimited(`${req.ip}|${data.email}`)) {
      return res.status(429).json({ message: "Too many attempts. Wait 15 minutes and try again." });
    }
    const user = await storage.getUserByEmail(data.email);
    if (!user || !(await comparePasswords(data.password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (isDisabledRole(user.role)) {
      return res.status(403).json({ message: "This account is disabled. Contact Free Spirit support." });
    }
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ message: "Could not start a session" });
      req.session.userId = user.id;
      res.json(stripPassword(user));
    });
  }));

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", h(async (req, res) => {
    const user = await loadUser(req, res);
    if (!user) return res.status(401).json({ message: "Not authenticated" });
    res.json(stripPassword(user));
  }));

  app.patch("/api/auth/profile", requireAuth, h(async (req, res) => {
    const data = parse(profileSchema, req.body, res);
    if (!data) return;
    const user = await storage.updateUser(res.locals.user!.id, data);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(stripPassword(user));
  }));

  // ---------------- public discovery ----------------

  app.get("/api/countries", h(async (_req, res) => {
    res.json(await storage.getCountries());
  }));

  const searchFilters = (q: Request["query"]) => ({
    category: typeof q.category === "string" && q.category ? q.category : undefined,
    countryId: q.country ? Number(q.country) || undefined : undefined,
    city: typeof q.city === "string" && q.city.trim() ? q.city.trim() : undefined,
    q: typeof q.q === "string" && q.q.trim() ? q.q.trim() : undefined,
    time: typeof q.time === "string" && ["now", "tonight", "weekend"].includes(q.time) ? q.time : undefined,
    group: typeof q.group === "string" ? q.group : undefined,
    date: typeof q.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(q.date) ? q.date : undefined,
  });

  // Surprise Us picks only from results matching the same filters.
  app.get("/api/experiences/surprise", h(async (req, res) => {
    const results = await storage.searchExperiences(searchFilters(req.query));
    if (results.length === 0) return res.status(404).json({ message: "Nothing matches those choices yet" });
    const exclude = Number(req.query.exclude);
    const pool = results.length > 1 && exclude ? results.filter((r) => r.id !== exclude) : results;
    res.json(pool[Math.floor(Math.random() * pool.length)]);
  }));

  // "More to explore": published listings with an upcoming session, newest first.
  app.get("/api/experiences/featured", h(async (_req, res) => {
    const results = await storage.searchExperiences({});
    res.json(results.slice(0, 8));
  }));

  // Offers are hidden until an offer has actually been agreed with a vendor.
  app.get("/api/offers", (_req, res) => {
    res.json([]);
  });

  app.get("/api/experiences", h(async (req, res) => {
    res.json(await storage.searchExperiences(searchFilters(req.query)));
  }));

  app.get("/api/experiences/:id", h(async (req, res) => {
    const exp = await storage.getPublicExperience(id(req.params.id));
    if (!exp) return res.status(404).json({ message: "Experience not found" });
    res.json(exp);
  }));

  app.get("/api/experiences/:id/slots", h(async (req, res) => {
    const exp = await storage.getPublicExperience(id(req.params.id));
    if (!exp) return res.status(404).json({ message: "Experience not found" });
    res.json(await storage.getUpcomingSlots(exp.id));
  }));

  // ---------------- member ----------------

  app.post("/api/bookings", requireAuth, h(async (req, res) => {
    const data = parse(bookingSchema, req.body, res);
    if (!data) return;
    const experience = await storage.getPublicExperience(data.experienceId);
    if (!experience) return res.status(400).json({ message: "This activity is not available" });
    const slot = await storage.getSlot(data.slotId);
    if (!slot || slot.experienceId !== experience.id) return res.status(400).json({ message: "Invalid session" });
    const today = colomboToday();
    if (slot.date < today || (slot.date === today && normaliseHHMM(slot.startTime) < colomboNowHHMM())) {
      return res.status(409).json({ message: "That session has already started" });
    }
    if (!(await storage.takeSpots(slot.id, data.qty))) {
      return res.status(409).json({ message: "Not enough spots left in that session" });
    }
    const booking = await storage.createBooking({
      experienceId: experience.id,
      slotId: slot.id,
      bookingDate: slot.date,
      startTime: normaliseHHMM(slot.startTime),
      qty: data.qty,
      totalAmount: (experience.priceAmount || 0) * data.qty, // recomputed on the server
      currencyCode: "LKR",
      customerProfileId: res.locals.user!.id,
      customerNote: data.customerNote ?? null,
      status: "requested",
    });
    res.json(booking);
  }));

  app.get("/api/bookings", requireAuth, h(async (_req, res) => {
    res.json(await storage.getBookingsByCustomer(res.locals.user!.id));
  }));

  app.post("/api/favorites", requireAuth, h(async (req, res) => {
    const experienceId = Number(req.body?.experienceId);
    if (!(await storage.getPublicExperience(experienceId))) {
      return res.status(400).json({ message: "This activity is not available" });
    }
    res.json(await storage.createFavorite({ customerProfileId: res.locals.user!.id, experienceId }));
  }));

  app.get("/api/favorites", requireAuth, h(async (_req, res) => {
    res.json(await storage.getFavoritesByCustomer(res.locals.user!.id));
  }));

  app.delete("/api/favorites/:experienceId", requireAuth, h(async (req, res) => {
    await storage.deleteFavorite(res.locals.user!.id, id(req.params.experienceId));
    res.json({ ok: true });
  }));

  // ---------------- vendor applications (any logged-in member) ----------------

  app.get("/api/vendor-applications/mine", requireAuth, h(async (_req, res) => {
    const vendor = await storage.getVendorByOwner(res.locals.user!.id);
    res.json(vendor ?? null);
  }));

  app.post("/api/vendor-applications", requireAuth, h(async (req, res) => {
    const data = parse(applicationSchema, req.body, res);
    if (!data) return;
    const user = res.locals.user!;
    if (user.role === "admin") return res.status(400).json({ message: "Admins can't apply as vendors" });
    const existing = await storage.getVendorByOwner(user.id);
    if (existing && existing.verificationStatus !== "rejected") {
      return res.status(400).json({ message: "You have already applied" });
    }
    const lk = await storage.getCountryByCode("LK");
    // Prototype shortcut: no applications table yet, so the application details and
    // the dated terms acceptance are recorded in the description.
    const details = [
      data.description?.trim() || "",
      "",
      "— Application —",
      `Contact: ${data.contactName}`,
      `Activity types: ${data.activityTypes.join(", ")}`,
      data.capacity ? `Typical group capacity: ${data.capacity}` : "",
      data.typicalPrice ? `Typical price: LKR ${data.typicalPrice}` : "",
      `Vendor terms (draft v0) accepted: ${new Date().toISOString()}`,
    ].filter((l, i) => i > 0 || l).join("\n").trim();
    const fields = {
      businessName: data.businessName,
      description: details,
      countryId: lk?.id ?? null,
      city: data.city,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      verificationStatus: "pending",
    };
    const vendor = existing
      ? await storage.updateVendor(existing.id, fields)
      : await storage.createVendor({ ...fields, ownerProfileId: user.id });
    res.json(vendor);
  }));

  // ---------------- vendor (router guard: vendor role + linked business) ----------------

  app.get("/api/vendor/profile", (_req, res) => {
    res.json(res.locals.vendor);
  });

  app.patch("/api/vendor/profile", h(async (req, res) => {
    const data = parse(vendorProfileSchema, req.body, res);
    if (!data) return;
    res.json(await storage.updateVendor(res.locals.vendor!.id, data));
  }));

  app.get("/api/vendor/dashboard", h(async (_req, res) => {
    const vendor = res.locals.vendor!;
    const [listings, bookings, stats] = await Promise.all([
      storage.getExperiencesByVendor(vendor.id),
      storage.getBookingsByVendor(vendor.id),
      storage.bookingStats(vendor.id),
    ]);
    const today = colomboToday();
    const in7 = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10) + 6))
      .toISOString().slice(0, 10);
    const published = listings.filter((l) => l.status === "published").length;
    const accountStatus =
      vendor.verificationStatus === "approved" ? (published > 0 ? "live" : "approved") : vendor.verificationStatus;
    res.json({
      vendor,
      accountStatus, // applied(pending) | approved | live | paused | rejected
      listings: { total: listings.length, published },
      pendingRequests: bookings.filter((b) => b.status === "requested"),
      next7Days: bookings
        .filter((b) => ["requested", "confirmed"].includes(b.status) && b.bookingDate >= today && b.bookingDate <= in7)
        .sort((a, b) => (a.bookingDate + (a.startTime ?? "")).localeCompare(b.bookingDate + (b.startTime ?? ""))),
      stats,
    });
  }));

  async function ownExperience(req: Request, res: Response) {
    const exp = await storage.getExperience(id(req.params.id));
    if (!exp || exp.vendorId !== res.locals.vendor!.id) {
      res.status(404).json({ message: "Listing not found" });
      return undefined;
    }
    return exp;
  }

  function canPublish(res: Response, status: string | undefined): boolean {
    if (status === "published" && res.locals.vendor!.verificationStatus !== "approved") {
      res.status(403).json({ message: "Your business must be approved before listings can go live" });
      return false;
    }
    return true;
  }

  app.get("/api/vendor/experiences", h(async (_req, res) => {
    res.json(await storage.getExperiencesByVendor(res.locals.vendor!.id));
  }));

  app.get("/api/vendor/experiences/:id", h(async (req, res) => {
    const exp = await ownExperience(req, res);
    if (exp) res.json(exp);
  }));

  app.post("/api/vendor/experiences", h(async (req, res) => {
    const data = parse(experienceSchema, req.body, res);
    if (!data || !canPublish(res, data.status)) return;
    const lk = await storage.getCountryByCode("LK");
    res.json(await storage.createExperience({
      ...data,
      vendorId: res.locals.vendor!.id,
      countryId: lk?.id ?? null,
      currencyCode: "LKR",
    }));
  }));

  app.patch("/api/vendor/experiences/:id", h(async (req, res) => {
    const exp = await ownExperience(req, res);
    if (!exp) return;
    const data = parse(experienceSchema.partial(), req.body, res);
    if (!data || !canPublish(res, data.status)) return;
    res.json(await storage.updateExperience(exp.id, data));
  }));

  app.get("/api/vendor/experiences/:id/slots", h(async (req, res) => {
    const exp = await ownExperience(req, res);
    if (exp) res.json(await storage.getSlotsByExperience(exp.id));
  }));

  app.post("/api/vendor/experiences/:id/slots", h(async (req, res) => {
    const exp = await ownExperience(req, res);
    if (!exp) return;
    const data = parse(slotSchema, req.body, res);
    if (!data) return;
    if (data.date < colomboToday()) return res.status(400).json({ message: "Pick a date from today onwards" });
    res.json(await storage.createSlot({
      experienceId: exp.id,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime ?? addMinutesHHMM(data.startTime, exp.durationMinutes || 60),
      capacity: data.capacity,
      status: "open",
    }));
  }));

  app.delete("/api/vendor/slots/:id", h(async (req, res) => {
    const slot = await storage.getSlot(id(req.params.id));
    const exp = slot ? await storage.getExperience(slot.experienceId) : undefined;
    if (!slot || !exp || exp.vendorId !== res.locals.vendor!.id) {
      return res.status(404).json({ message: "Session not found" });
    }
    if (await storage.slotHasBookings(slot.id)) {
      return res.status(409).json({ message: "This session has bookings, so it can't be deleted" });
    }
    await storage.deleteSlot(slot.id);
    res.json({ ok: true });
  }));

  app.get("/api/vendor/bookings", h(async (_req, res) => {
    res.json(await storage.getBookingsByVendor(res.locals.vendor!.id));
  }));

  app.patch("/api/vendor/bookings/:id", h(async (req, res) => {
    const data = parse(vendorBookingUpdateSchema, req.body, res);
    if (!data) return;
    const booking = await storage.getBooking(id(req.params.id));
    const exp = booking ? await storage.getExperience(booking.experienceId) : undefined;
    if (!booking || !exp || exp.vendorId !== res.locals.vendor!.id) {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (booking.status !== "requested") {
      return res.status(409).json({ message: `This booking is already ${booking.status}` });
    }
    const result = await changeBookingStatus(booking.id, data.status, data.vendorNote);
    res.json(result.booking);
  }));

  // ---------------- admin (router guard: admin role) ----------------

  app.get("/api/admin/stats", h(async (_req, res) => {
    res.json(await storage.getAdminOverview());
  }));

  app.get("/api/admin/vendors", h(async (_req, res) => {
    res.json(await storage.getAllVendors());
  }));

  app.get("/api/admin/vendors/:id/stats", h(async (req, res) => {
    const vendor = await storage.getVendor(id(req.params.id));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json({ vendor, stats: await storage.bookingStats(vendor.id) });
  }));

  app.patch("/api/admin/vendors/:id", h(async (req, res) => {
    const data = parse(vendorProfileSchema, req.body, res);
    if (!data) return;
    const vendor = await storage.updateVendor(id(req.params.id), data);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  }));

  // Admin onboards a vendor by hand: creates the business, its vendor login and a
  // temporary password that is shown once.
  app.post("/api/admin/vendors", h(async (req, res) => {
    const data = parse(
      z.object({
        businessName: z.string().trim().min(1).max(120),
        contactName: z.string().trim().min(1).max(120),
        contactEmail: z.string().trim().toLowerCase().email(),
        contactPhone: optionalText(40),
        city: optionalText(120),
        description: optionalText(4000),
      }),
      req.body,
      res,
    );
    if (!data) return;
    if (await storage.getUserByEmail(data.contactEmail)) {
      return res.status(400).json({ message: "A login with that email already exists. Assign it the vendor role instead." });
    }
    const temporaryPassword = `fs-${randomBytes(4).toString("hex")}`;
    const user = await storage.createUser({
      email: data.contactEmail,
      password: await hashPassword(temporaryPassword),
      fullName: data.contactName,
      phone: data.contactPhone ?? null,
      role: "vendor",
    });
    const lk = await storage.getCountryByCode("LK");
    const vendor = await storage.createVendor({
      ownerProfileId: user.id,
      businessName: data.businessName,
      description: data.description ?? null,
      city: data.city ?? null,
      countryId: lk?.id ?? null,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone ?? null,
      verificationStatus: "approved",
    });
    res.json({ vendor, login: { email: user.email, temporaryPassword } });
  }));

  app.post("/api/admin/vendors/:id/approve", h(async (req, res) => {
    const vendor = await storage.getVendor(id(req.params.id));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    const owner = await storage.getUser(vendor.ownerProfileId);
    if (owner && owner.role === "customer") await storage.updateUser(owner.id, { role: "vendor" });
    res.json(await storage.updateVendor(vendor.id, { verificationStatus: "approved" }));
  }));

  app.post("/api/admin/vendors/:id/decline", h(async (req, res) => {
    const reason = z.string().trim().min(1, "Give a reason").max(1000).safeParse(req.body?.reason);
    if (!reason.success) return res.status(400).json({ message: "Give a reason for declining" });
    const vendor = await storage.getVendor(id(req.params.id));
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    // Prototype shortcut: the reason is recorded in the description (no notes column yet).
    const description = `${vendor.description ?? ""}\n\n— Declined ${colomboToday()} —\n${reason.data}`.trim();
    res.json(await storage.updateVendor(vendor.id, { verificationStatus: "rejected", description }));
  }));

  app.post("/api/admin/vendors/:id/pause", h(async (req, res) => {
    const vendor = await storage.updateVendor(id(req.params.id), { verificationStatus: "paused" });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  }));

  app.post("/api/admin/vendors/:id/resume", h(async (req, res) => {
    const vendor = await storage.updateVendor(id(req.params.id), { verificationStatus: "approved" });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.json(vendor);
  }));

  app.get("/api/admin/experiences", h(async (_req, res) => {
    res.json(await storage.getAllExperiences());
  }));

  app.get("/api/admin/experiences/:id", h(async (req, res) => {
    const exp = await storage.getExperience(id(req.params.id));
    if (!exp) return res.status(404).json({ message: "Listing not found" });
    res.json(exp);
  }));

  app.post("/api/admin/experiences", h(async (req, res) => {
    const vendorId = Number(req.body?.vendorId);
    const vendor = await storage.getVendor(vendorId);
    if (!vendor) return res.status(400).json({ message: "Pick a vendor" });
    const data = parse(experienceSchema, req.body, res);
    if (!data) return;
    const lk = await storage.getCountryByCode("LK");
    res.json(await storage.createExperience({ ...data, vendorId, countryId: lk?.id ?? null, currencyCode: "LKR" }));
  }));

  app.patch("/api/admin/experiences/:id", h(async (req, res) => {
    const data = parse(experienceSchema.partial(), req.body, res);
    if (!data) return;
    const exp = await storage.updateExperience(id(req.params.id), data);
    if (!exp) return res.status(404).json({ message: "Listing not found" });
    res.json(exp);
  }));

  app.get("/api/admin/experiences/:id/slots", h(async (req, res) => {
    res.json(await storage.getSlotsByExperience(id(req.params.id)));
  }));

  app.get("/api/admin/bookings", h(async (_req, res) => {
    res.json(await storage.getAllBookings());
  }));

  app.patch("/api/admin/bookings/:id", h(async (req, res) => {
    const data = parse(adminBookingUpdateSchema, req.body, res);
    if (!data) return;
    const result = await changeBookingStatus(id(req.params.id), data.status, data.vendorNote);
    if ("error" in result) return res.status(404).json({ message: "Booking not found" });
    res.json(result.booking);
  }));

  app.get("/api/admin/members", h(async (_req, res) => {
    res.json(await storage.getAllUsers());
  }));

  app.patch("/api/admin/members/:id/role", h(async (req, res) => {
    const role = z.enum(ROLES).safeParse(req.body?.role);
    if (!role.success) return res.status(400).json({ message: "Role must be customer, vendor or admin" });
    const target = await storage.getUser(id(req.params.id));
    if (!target) return res.status(404).json({ message: "Member not found" });
    if (target.id === res.locals.user!.id && role.data !== "admin") {
      return res.status(400).json({ message: "You can't remove your own admin role" });
    }
    const keepDisabled = isDisabledRole(target.role) ? DISABLED_PREFIX : "";
    const updated = await storage.updateUser(target.id, { role: keepDisabled + role.data });
    res.json(stripPassword(updated!));
  }));

  app.post("/api/admin/members/:id/disable", h(async (req, res) => {
    const target = await storage.getUser(id(req.params.id));
    if (!target) return res.status(404).json({ message: "Member not found" });
    if (target.id === res.locals.user!.id) return res.status(400).json({ message: "You can't disable yourself" });
    if (isDisabledRole(target.role)) return res.json(stripPassword(target));
    const updated = await storage.updateUser(target.id, { role: DISABLED_PREFIX + target.role });
    res.json(stripPassword(updated!));
  }));

  app.post("/api/admin/members/:id/enable", h(async (req, res) => {
    const target = await storage.getUser(id(req.params.id));
    if (!target) return res.status(404).json({ message: "Member not found" });
    const updated = await storage.updateUser(target.id, { role: target.role.replace(DISABLED_PREFIX, "") });
    res.json(stripPassword(updated!));
  }));

  // Manual password reset until email reset exists. The temporary password is shown
  // to the admin once and never stored or logged in plain text.
  app.post("/api/admin/members/:id/reset-password", h(async (req, res) => {
    const target = await storage.getUser(id(req.params.id));
    if (!target) return res.status(404).json({ message: "Member not found" });
    const temporaryPassword = `fs-${randomBytes(4).toString("hex")}`;
    await storage.updateUser(target.id, { password: await hashPassword(temporaryPassword) });
    res.json({ temporaryPassword });
  }));

  app.post("/api/admin/countries", h(async (req, res) => {
    const data = parse(
      z.object({ name: z.string().trim().min(1), code: z.string().trim().length(2), currencyCode: z.literal("LKR") }),
      req.body,
      res,
    );
    if (!data) return;
    res.json(await storage.createCountry({ ...data, isActive: true }));
  }));

  return httpServer;
}
