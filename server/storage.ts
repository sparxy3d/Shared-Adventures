import { db } from "./db";
import { eq, and, ilike, desc, sql, inArray, gte, lte, ne } from "drizzle-orm";
import {
  users, countries, vendors, experiences,
  availabilitySlots, bookings, favorites,
  type InsertUser, type User, type InsertCountry, type Country,
  type InsertVendor, type Vendor, type InsertExperience, type Experience,
  type InsertAvailabilitySlot, type AvailabilitySlot,
  type InsertBooking, type Booking, type InsertFavorite, type Favorite,
} from "@shared/schema";
import { GROUP_MIN_SPOTS } from "@shared/catalog";
import { colomboToday, colomboNowHHMM, colomboDayOfWeek, addDays, addMinutesHHMM, normaliseHHMM } from "./time";

export type SafeUser = Omit<User, "password">;

export type NextSession = { slotId: number; date: string; startTime: string; endTime: string; spotsLeft: number };
export type PublicExperience = Experience & { vendorName: string | null; nextSession: NextSession | null };

export type SearchFilters = {
  category?: string;
  countryId?: number;
  city?: string;
  q?: string;
  time?: string; // now | tonight | weekend
  group?: string; // 1 | 2 | 3-5 | 6+
  date?: string; // YYYY-MM-DD
};

const SEARCH_HORIZON_DAYS = 90;

export function stripPassword(u: User): SafeUser {
  const { password: _p, ...rest } = u;
  return rest;
}

/**
 * Public views never show seeded social proof: ratings, review counts and offers are
 * invented demo values. They come back when real reviews and agreed offers exist.
 */
function toPublic(exp: Experience, vendorName: string | null, nextSession: NextSession | null): PublicExperience {
  return { ...exp, rating: null, reviewCount: null, offerLabel: null, vendorName, nextSession };
}

/**
 * The session window a search asks for, in Colombo time. Sessions earlier than "now"
 * today are always excluded; minTime/maxTime further narrow the time of day.
 */
function sessionWindow(filters: SearchFilters): { from: string; to: string; dates?: string[]; minTime?: string; maxTime?: string } {
  const today = colomboToday();
  const now = colomboNowHHMM();
  if (filters.date) return { from: filters.date, to: filters.date };
  if (filters.time === "now") {
    // Sessions starting within the next three hours.
    return { from: today, to: today, maxTime: addMinutesHHMM(now, 180) };
  }
  if (filters.time === "tonight") return { from: today, to: today, minTime: "17:00", maxTime: "23:59" };
  if (filters.time === "weekend") {
    const dow = colomboDayOfWeek(); // 0 = Sun
    if (dow === 0) return { from: today, to: today, dates: [today] };
    const sat = addDays(today, 6 - dow);
    const sun = addDays(sat, 1);
    return { from: sat, to: sun, dates: [sat, sun] };
  }
  return { from: today, to: addDays(today, SEARCH_HORIZON_DAYS) };
}

export class DatabaseStorage {
  // ---------- users ----------
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(sql`lower(${users.email})`, email.toLowerCase()));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<Array<SafeUser & { vendorId: number | null; businessName: string | null; bookingCount: number }>> {
    const rows = await db
      .select({
        user: users,
        vendorId: vendors.id,
        businessName: vendors.businessName,
        bookingCount: sql<number>`(select count(*) from bookings b where b.customer_profile_id = ${users.id})`,
      })
      .from(users)
      .leftJoin(vendors, eq(vendors.ownerProfileId, users.id))
      .orderBy(desc(users.createdAt));
    return rows.map((r) => ({
      ...stripPassword(r.user),
      vendorId: r.vendorId,
      businessName: r.businessName,
      bookingCount: Number(r.bookingCount),
    }));
  }

  // ---------- countries ----------
  async getCountries(): Promise<Country[]> {
    return db.select().from(countries).where(eq(countries.isActive, true));
  }

  async getCountryByCode(code: string): Promise<Country | undefined> {
    const [c] = await db.select().from(countries).where(eq(countries.code, code));
    return c;
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const [country] = await db.insert(countries).values(data).returning();
    return country;
  }

  // ---------- vendors ----------
  async getVendorByOwner(ownerId: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerProfileId, ownerId));
    return vendor;
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getAllVendors() {
    const rows = await db
      .select({
        vendor: vendors,
        ownerEmail: users.email,
        ownerName: users.fullName,
        ownerRole: users.role,
        listingCount: sql<number>`(select count(*) from experiences e where e.vendor_id = ${vendors.id})`,
        publishedCount: sql<number>`(select count(*) from experiences e where e.vendor_id = ${vendors.id} and e.status = 'published')`,
      })
      .from(vendors)
      .leftJoin(users, eq(users.id, vendors.ownerProfileId))
      .orderBy(desc(vendors.createdAt));
    return rows.map((r) => ({
      ...r.vendor,
      ownerEmail: r.ownerEmail,
      ownerName: r.ownerName,
      ownerRole: r.ownerRole,
      listingCount: Number(r.listingCount),
      publishedCount: Number(r.publishedCount),
    }));
  }

  async createVendor(data: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values(data).returning();
    return vendor;
  }

  async updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning();
    return vendor;
  }

  // ---------- public discovery ----------
  /**
   * Published listings of approved vendors that have a free session in the requested
   * window (Colombo time). Each result carries its next matching session.
   */
  async searchExperiences(filters: SearchFilters = {}): Promise<PublicExperience[]> {
    const conditions = [eq(experiences.status, "published"), eq(vendors.verificationStatus, "approved")];
    if (filters.category) conditions.push(eq(experiences.category, filters.category));
    if (filters.countryId) conditions.push(eq(experiences.countryId, filters.countryId));
    if (filters.city) conditions.push(ilike(experiences.city, `%${filters.city}%`));
    if (filters.q) conditions.push(ilike(experiences.title, `%${filters.q}%`));
    const minSpots = (filters.group && GROUP_MIN_SPOTS[filters.group]) || 1;
    if (minSpots > 1) conditions.push(sql`coalesce(${experiences.capacity}, 0) >= ${minSpots}`);

    const rows = await db
      .select({ exp: experiences, vendorName: vendors.businessName })
      .from(experiences)
      .innerJoin(vendors, eq(vendors.id, experiences.vendorId))
      .where(and(...conditions))
      .orderBy(desc(experiences.createdAt));
    if (rows.length === 0) return [];

    const win = sessionWindow(filters);
    const slots = await db
      .select()
      .from(availabilitySlots)
      .where(
        and(
          inArray(availabilitySlots.experienceId, rows.map((r) => r.exp.id)),
          gte(availabilitySlots.date, win.from),
          lte(availabilitySlots.date, win.to),
          eq(availabilitySlots.status, "open"),
          gte(availabilitySlots.capacity, minSpots),
        ),
      )
      .orderBy(availabilitySlots.date, availabilitySlots.startTime);

    const today = colomboToday();
    const now = colomboNowHHMM();
    const nextByExp = new Map<number, NextSession>();
    for (const s of slots) {
      if (nextByExp.has(s.experienceId)) continue;
      const start = normaliseHHMM(s.startTime);
      if (s.date === today && start < now) continue;
      if (win.dates && !win.dates.includes(s.date)) continue;
      if (win.minTime && start < win.minTime) continue;
      if (win.maxTime && start > win.maxTime) continue;
      nextByExp.set(s.experienceId, {
        slotId: s.id, date: s.date, startTime: start, endTime: normaliseHHMM(s.endTime), spotsLeft: s.capacity,
      });
    }

    const windowed = Boolean(filters.time || filters.date);
    return rows
      .filter((r) => !windowed || nextByExp.has(r.exp.id))
      .map((r) => toPublic(r.exp, r.vendorName, nextByExp.get(r.exp.id) ?? null));
  }

  async getPublicExperience(id: number): Promise<PublicExperience | undefined> {
    const [row] = await db
      .select({ exp: experiences, vendorName: vendors.businessName })
      .from(experiences)
      .innerJoin(vendors, eq(vendors.id, experiences.vendorId))
      .where(and(eq(experiences.id, id), eq(experiences.status, "published"), eq(vendors.verificationStatus, "approved")));
    if (!row) return undefined;
    return toPublic(row.exp, row.vendorName, null);
  }

  /** Future sessions for a public listing (Colombo time), past ones omitted. */
  async getUpcomingSlots(experienceId: number): Promise<AvailabilitySlot[]> {
    const today = colomboToday();
    const now = colomboNowHHMM();
    const rows = await db
      .select()
      .from(availabilitySlots)
      .where(and(eq(availabilitySlots.experienceId, experienceId), gte(availabilitySlots.date, today)))
      .orderBy(availabilitySlots.date, availabilitySlots.startTime);
    return rows.filter((s) => s.date > today || normaliseHHMM(s.startTime) >= now);
  }

  // ---------- experiences ----------
  async getExperience(id: number): Promise<Experience | undefined> {
    const [exp] = await db.select().from(experiences).where(eq(experiences.id, id));
    return exp;
  }

  async getExperiencesByVendor(vendorId: number): Promise<Experience[]> {
    return db.select().from(experiences).where(eq(experiences.vendorId, vendorId)).orderBy(desc(experiences.createdAt));
  }

  async getAllExperiences() {
    const rows = await db
      .select({ exp: experiences, vendorName: vendors.businessName, vendorStatus: vendors.verificationStatus })
      .from(experiences)
      .leftJoin(vendors, eq(vendors.id, experiences.vendorId))
      .orderBy(desc(experiences.createdAt));
    return rows.map((r) => ({ ...r.exp, vendorName: r.vendorName, vendorStatus: r.vendorStatus }));
  }

  async createExperience(data: InsertExperience): Promise<Experience> {
    const [exp] = await db.insert(experiences).values(data).returning();
    return exp;
  }

  async updateExperience(id: number, data: Partial<InsertExperience>): Promise<Experience | undefined> {
    const [exp] = await db.update(experiences).set(data).where(eq(experiences.id, id)).returning();
    return exp;
  }

  // ---------- slots ----------
  async getSlotsByExperience(experienceId: number): Promise<AvailabilitySlot[]> {
    return db.select().from(availabilitySlots)
      .where(eq(availabilitySlots.experienceId, experienceId))
      .orderBy(availabilitySlots.date, availabilitySlots.startTime);
  }

  async getSlot(id: number): Promise<AvailabilitySlot | undefined> {
    const [slot] = await db.select().from(availabilitySlots).where(eq(availabilitySlots.id, id));
    return slot;
  }

  async createSlot(data: InsertAvailabilitySlot): Promise<AvailabilitySlot> {
    const [slot] = await db.insert(availabilitySlots).values(data).returning();
    return slot;
  }

  async deleteSlot(id: number): Promise<void> {
    await db.delete(availabilitySlots).where(eq(availabilitySlots.id, id));
  }

  async slotHasBookings(slotId: number): Promise<boolean> {
    const [row] = await db.select({ n: sql<number>`count(*)` }).from(bookings)
      .where(and(eq(bookings.slotId, slotId), inArray(bookings.status, ["requested", "confirmed"])));
    return Number(row.n) > 0;
  }

  /** Take `qty` spots atomically. Returns false when the session no longer has room. */
  async takeSpots(slotId: number, qty: number): Promise<boolean> {
    const rows = await db.execute(sql`
      UPDATE availability_slots
      SET capacity = capacity - ${qty},
          status = CASE WHEN capacity - ${qty} <= 0 THEN 'full' ELSE status END
      WHERE id = ${slotId} AND status = 'open' AND capacity >= ${qty}
      RETURNING id
    `);
    return (rows.rowCount ?? 0) > 0;
  }

  /** Give spots back when a request is declined or cancelled. */
  async releaseSpots(slotId: number, qty: number): Promise<void> {
    await db.execute(sql`
      UPDATE availability_slots
      SET capacity = capacity + ${qty},
          status = CASE WHEN status = 'full' THEN 'open' ELSE status END
      WHERE id = ${slotId}
    `);
  }

  // ---------- bookings ----------
  private bookingSelect() {
    return db
      .select({
        booking: bookings,
        experienceTitle: experiences.title,
        experienceCategory: experiences.category,
        experienceImageUrl: experiences.imageUrl,
        experienceCity: experiences.city,
        experienceDuration: experiences.durationMinutes,
        vendorId: vendors.id,
        vendorName: vendors.businessName,
        customerName: users.fullName,
        customerEmail: users.email,
        customerPhone: users.phone,
      })
      .from(bookings)
      .innerJoin(experiences, eq(experiences.id, bookings.experienceId))
      .leftJoin(vendors, eq(vendors.id, experiences.vendorId))
      .leftJoin(users, eq(users.id, bookings.customerProfileId));
  }

  private shapeBooking(r: Awaited<ReturnType<DatabaseStorage["bookingSelect"]>>[number]) {
    return {
      ...r.booking,
      experience: {
        id: r.booking.experienceId,
        title: r.experienceTitle,
        category: r.experienceCategory,
        imageUrl: r.experienceImageUrl,
        city: r.experienceCity,
        durationMinutes: r.experienceDuration,
      },
      vendor: { id: r.vendorId, businessName: r.vendorName },
      customer: { fullName: r.customerName, email: r.customerEmail, phone: r.customerPhone },
    };
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [b] = await db.select().from(bookings).where(eq(bookings.id, id));
    return b;
  }

  async getBookingsByCustomer(customerId: number) {
    const rows = await this.bookingSelect()
      .where(eq(bookings.customerProfileId, customerId))
      .orderBy(desc(bookings.bookingDate), desc(bookings.startTime));
    // Members see the vendor, not other customers' data; strip customer contact.
    return rows.map((r) => {
      const b = this.shapeBooking(r);
      return { ...b, customer: undefined };
    });
  }

  async getBookingsByVendor(vendorId: number) {
    const rows = await this.bookingSelect()
      .where(eq(experiences.vendorId, vendorId))
      .orderBy(desc(bookings.createdAt));
    return rows.map((r) => this.shapeBooking(r));
  }

  async getAllBookings() {
    const rows = await this.bookingSelect().orderBy(desc(bookings.createdAt));
    return rows.map((r) => this.shapeBooking(r));
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return booking;
  }

  /** Monthly booking counts and value for one vendor (or all vendors when null). */
  async bookingStats(vendorId: number | null) {
    const today = colomboToday();
    const vendorFilter = vendorId == null ? sql`true` : sql`e.vendor_id = ${vendorId}`;
    const monthly = await db.execute(sql`
      SELECT substr(b.booking_date, 1, 7) AS month,
             count(*)::int AS bookings,
             count(*) FILTER (WHERE b.status IN ('confirmed','completed'))::int AS confirmed,
             coalesce(sum(b.total_amount) FILTER (WHERE b.status IN ('confirmed','completed')), 0)::int AS value
      FROM bookings b JOIN experiences e ON e.id = b.experience_id
      WHERE ${vendorFilter}
      GROUP BY 1 ORDER BY 1 DESC LIMIT 6
    `);
    const [counts] = (await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE b.status = 'requested')::int AS pending_requests,
        count(*) FILTER (WHERE b.status IN ('requested','confirmed') AND b.booking_date >= ${today})::int AS upcoming,
        count(*) FILTER (WHERE b.status IN ('requested','confirmed') AND b.booking_date >= ${today} AND b.booking_date <= ${addDays(today, 6)})::int AS next7
      FROM bookings b JOIN experiences e ON e.id = b.experience_id
      WHERE ${vendorFilter}
    `)).rows as Array<{ pending_requests: number; upcoming: number; next7: number }>;
    return {
      monthly: monthly.rows as Array<{ month: string; bookings: number; confirmed: number; value: number }>,
      pendingRequests: counts.pending_requests,
      upcoming: counts.upcoming,
      next7Days: counts.next7,
    };
  }

  // ---------- favorites ----------
  async getFavoritesByCustomer(customerId: number) {
    const rows = await db
      .select({ fav: favorites, exp: experiences, vendorName: vendors.businessName, vendorStatus: vendors.verificationStatus })
      .from(favorites)
      .innerJoin(experiences, eq(experiences.id, favorites.experienceId))
      .leftJoin(vendors, eq(vendors.id, experiences.vendorId))
      .where(eq(favorites.customerProfileId, customerId))
      .orderBy(desc(favorites.createdAt));
    return rows
      .filter((r) => r.exp.status === "published" && r.vendorStatus === "approved")
      .map((r) => ({ ...r.fav, experience: toPublic(r.exp, r.vendorName, null) }));
  }

  async createFavorite(data: InsertFavorite): Promise<Favorite> {
    const [existing] = await db.select().from(favorites).where(
      and(eq(favorites.customerProfileId, data.customerProfileId), eq(favorites.experienceId, data.experienceId)),
    );
    if (existing) return existing;
    const [fav] = await db.insert(favorites).values(data).returning();
    return fav;
  }

  async deleteFavorite(customerId: number, experienceId: number): Promise<void> {
    await db.delete(favorites).where(and(eq(favorites.customerProfileId, customerId), eq(favorites.experienceId, experienceId)));
  }

  // ---------- admin overview ----------
  async getAdminOverview() {
    const today = colomboToday();
    const weekEnd = addDays(today, 6);
    const [r] = (await db.execute(sql`
      SELECT
        (SELECT count(*) FROM vendors v WHERE v.verification_status = 'approved'
           AND EXISTS (SELECT 1 FROM experiences e WHERE e.vendor_id = v.id AND e.status = 'published'))::int AS live_vendors,
        (SELECT count(*) FROM vendors WHERE verification_status = 'pending')::int AS pending_applications,
        (SELECT count(*) FROM experiences WHERE status = 'published')::int AS published_listings,
        (SELECT count(*) FROM experiences)::int AS total_listings,
        (SELECT count(*) FROM users WHERE role = 'customer')::int AS members,
        (SELECT count(*) FROM bookings WHERE booking_date >= ${today} AND booking_date <= ${weekEnd}
           AND status IN ('requested','confirmed'))::int AS bookings_this_week,
        (SELECT count(*) FROM bookings WHERE status = 'requested')::int AS unanswered_requests
    `)).rows as Array<Record<string, number>>;
    return {
      liveVendors: r.live_vendors,
      pendingApplications: r.pending_applications,
      publishedListings: r.published_listings,
      totalListings: r.total_listings,
      members: r.members,
      bookingsThisWeek: r.bookings_this_week,
      unansweredRequests: r.unanswered_requests,
    };
  }

  async countAdmins(excludingUserId?: number): Promise<number> {
    const cond = excludingUserId ? and(eq(users.role, "admin"), ne(users.id, excludingUserId)) : eq(users.role, "admin");
    const [row] = await db.select({ n: sql<number>`count(*)` }).from(users).where(cond);
    return Number(row.n);
  }
}

export const storage = new DatabaseStorage();
