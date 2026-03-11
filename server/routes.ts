import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import pgSession from "connect-pg-simple";
import { pool } from "./db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgStore = pgSession(session);

  app.use(
    session({
      store: new PgStore({ pool, createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "free-spirit-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Email, password, and full name are required" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        fullName,
        role: "customer",
      });

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { fullName, phone } = req.body;
      const user = await storage.updateUser(req.session.userId!, { fullName, phone });
      if (!user) return res.status(404).json({ message: "User not found" });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/countries", async (_req, res) => {
    const result = await storage.getCountries();
    res.json(result);
  });

  app.get("/api/experiences/surprise", async (req, res) => {
    const { category, city } = req.query;
    const result = await storage.getRandomExperience({
      category: category as string,
      city: city as string,
    });
    if (!result) return res.status(404).json({ message: "No experiences found" });
    res.json(result);
  });

  app.get("/api/experiences/featured", async (_req, res) => {
    const result = await storage.getFeaturedExperiences();
    res.json(result);
  });

  app.get("/api/experiences", async (req, res) => {
    const { category, country, city, q } = req.query;
    const result = await storage.getPublishedExperiences({
      category: category as string,
      countryId: country ? Number(country) : undefined,
      city: city as string,
      q: q as string,
    });
    res.json(result);
  });

  app.get("/api/experiences/:id", async (req, res) => {
    const exp = await storage.getExperience(Number(req.params.id));
    if (!exp) return res.status(404).json({ message: "Experience not found" });
    res.json(exp);
  });

  app.get("/api/experiences/:id/slots", async (req, res) => {
    const slots = await storage.getSlotsByExperience(Number(req.params.id));
    res.json(slots);
  });

  app.post("/api/bookings", requireAuth, async (req, res) => {
    try {
      const booking = await storage.createBooking({
        ...req.body,
        customerProfileId: req.session.userId!,
        status: "requested",
      });
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookings", requireAuth, async (req, res) => {
    const result = await storage.getBookingsByCustomer(req.session.userId!);
    res.json(result);
  });

  app.post("/api/favorites", requireAuth, async (req, res) => {
    try {
      const fav = await storage.createFavorite({
        customerProfileId: req.session.userId!,
        experienceId: req.body.experienceId,
      });
      res.json(fav);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/favorites", requireAuth, async (req, res) => {
    const result = await storage.getFavoritesByCustomer(req.session.userId!);
    res.json(result);
  });

  app.delete("/api/favorites/:experienceId", requireAuth, async (req, res) => {
    await storage.deleteFavorite(req.session.userId!, Number(req.params.experienceId));
    res.json({ ok: true });
  });

  app.get("/api/vendor/profile", requireAuth, async (req, res) => {
    const vendor = await storage.getVendorByOwner(req.session.userId!);
    if (!vendor) return res.status(404).json({ message: "No vendor profile" });
    res.json(vendor);
  });

  app.post("/api/vendor/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getVendorByOwner(req.session.userId!);
      if (existing) return res.status(400).json({ message: "Vendor profile already exists" });

      const vendor = await storage.createVendor({
        ...req.body,
        ownerProfileId: req.session.userId!,
        verificationStatus: "pending",
      });

      await storage.updateUser(req.session.userId!, { role: "vendor" });
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/vendor/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getVendorByOwner(req.session.userId!);
      if (!existing) return res.status(404).json({ message: "No vendor profile" });

      const vendor = await storage.updateVendor(existing.id, req.body);
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vendor/experiences", requireAuth, async (req, res) => {
    const vendor = await storage.getVendorByOwner(req.session.userId!);
    if (!vendor) return res.json([]);
    const result = await storage.getExperiencesByVendor(vendor.id);
    res.json(result);
  });

  app.get("/api/vendor/experiences/:id", requireAuth, async (req, res) => {
    const vendor = await storage.getVendorByOwner(req.session.userId!);
    if (!vendor) return res.status(403).json({ message: "Not a vendor" });
    const exp = await storage.getExperience(Number(req.params.id));
    if (!exp) return res.status(404).json({ message: "Not found" });
    if (exp.vendorId !== vendor.id) return res.status(403).json({ message: "Not your experience" });
    res.json(exp);
  });

  app.post("/api/vendor/experiences", requireAuth, async (req, res) => {
    try {
      const vendor = await storage.getVendorByOwner(req.session.userId!);
      if (!vendor) return res.status(400).json({ message: "Create a vendor profile first" });

      const exp = await storage.createExperience({
        ...req.body,
        vendorId: vendor.id,
      });
      res.json(exp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/vendor/experiences/:id", requireAuth, async (req, res) => {
    try {
      const vendor = await storage.getVendorByOwner(req.session.userId!);
      if (!vendor) return res.status(403).json({ message: "Not a vendor" });
      const exp = await storage.getExperience(Number(req.params.id));
      if (!exp || exp.vendorId !== vendor.id) return res.status(403).json({ message: "Not your experience" });

      const updated = await storage.updateExperience(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/vendor/experiences/:id/slots", requireAuth, async (req, res) => {
    const vendor = await storage.getVendorByOwner(req.session.userId!);
    if (!vendor) return res.status(403).json({ message: "Not a vendor" });
    const exp = await storage.getExperience(Number(req.params.id));
    if (!exp || exp.vendorId !== vendor.id) return res.status(403).json({ message: "Not your experience" });
    const slots = await storage.getSlotsByExperience(Number(req.params.id));
    res.json(slots);
  });

  app.post("/api/vendor/experiences/:id/slots", requireAuth, async (req, res) => {
    try {
      const vendor = await storage.getVendorByOwner(req.session.userId!);
      if (!vendor) return res.status(403).json({ message: "Not a vendor" });
      const exp = await storage.getExperience(Number(req.params.id));
      if (!exp || exp.vendorId !== vendor.id) return res.status(403).json({ message: "Not your experience" });

      const slot = await storage.createSlot({
        ...req.body,
        experienceId: Number(req.params.id),
        status: "open",
      });
      res.json(slot);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/vendor/slots/:id", requireAuth, async (req, res) => {
    const vendor = await storage.getVendorByOwner(req.session.userId!);
    if (!vendor) return res.status(403).json({ message: "Not a vendor" });
    await storage.deleteSlot(Number(req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/vendor/bookings", requireAuth, async (req, res) => {
    const vendor = await storage.getVendorByOwner(req.session.userId!);
    if (!vendor) return res.json([]);
    const result = await storage.getBookingsByVendor(vendor.id);
    res.json(result);
  });

  app.patch("/api/vendor/bookings/:id", requireAuth, async (req, res) => {
    try {
      const vendor = await storage.getVendorByOwner(req.session.userId!);
      if (!vendor) return res.status(403).json({ message: "Not a vendor" });
      const booking = await storage.updateBooking(Number(req.params.id), { status: req.body.status, vendorNote: req.body.vendorNote });
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get("/api/admin/vendors", requireAdmin, async (_req, res) => {
    const result = await storage.getAllVendors();
    res.json(result);
  });

  app.patch("/api/admin/vendors/:id", requireAdmin, async (req, res) => {
    try {
      const vendor = await storage.updateVendor(Number(req.params.id), req.body);
      res.json(vendor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/experiences", requireAdmin, async (_req, res) => {
    const result = await storage.getAllExperiences();
    res.json(result);
  });

  app.patch("/api/admin/experiences/:id", requireAdmin, async (req, res) => {
    try {
      const exp = await storage.updateExperience(Number(req.params.id), req.body);
      res.json(exp);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/admin/bookings", requireAdmin, async (_req, res) => {
    const result = await storage.getAllBookings();
    res.json(result);
  });

  app.post("/api/admin/countries", requireAdmin, async (req, res) => {
    try {
      const country = await storage.createCountry(req.body);
      res.json(country);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
