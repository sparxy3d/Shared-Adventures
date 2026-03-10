import { db } from "./db";
import { eq, and, ilike, desc, sql } from "drizzle-orm";
import {
  users, countries, vendors, experiences, experienceImages,
  availabilitySlots, bookings, favorites, reviews,
  type InsertUser, type User, type InsertCountry, type Country,
  type InsertVendor, type Vendor, type InsertExperience, type Experience,
  type InsertAvailabilitySlot, type AvailabilitySlot,
  type InsertBooking, type Booking, type InsertFavorite, type Favorite,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;

  getCountries(): Promise<Country[]>;
  createCountry(data: InsertCountry): Promise<Country>;

  getVendorByOwner(ownerId: number): Promise<Vendor | undefined>;
  getVendor(id: number): Promise<Vendor | undefined>;
  getAllVendors(): Promise<Vendor[]>;
  createVendor(data: InsertVendor): Promise<Vendor>;
  updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined>;

  getPublishedExperiences(filters?: {
    category?: string;
    countryId?: number;
    city?: string;
    q?: string;
  }): Promise<Experience[]>;
  getFeaturedExperiences(): Promise<Experience[]>;
  getExperience(id: number): Promise<Experience | undefined>;
  getExperiencesByVendor(vendorId: number): Promise<Experience[]>;
  getAllExperiences(): Promise<Experience[]>;
  createExperience(data: InsertExperience): Promise<Experience>;
  updateExperience(id: number, data: Partial<InsertExperience>): Promise<Experience | undefined>;

  getSlotsByExperience(experienceId: number): Promise<AvailabilitySlot[]>;
  createSlot(data: InsertAvailabilitySlot): Promise<AvailabilitySlot>;
  deleteSlot(id: number): Promise<void>;

  getBookingsByCustomer(customerId: number): Promise<any[]>;
  getBookingsByVendor(vendorId: number): Promise<any[]>;
  getAllBookings(): Promise<any[]>;
  createBooking(data: InsertBooking): Promise<Booking>;
  updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined>;

  getFavoritesByCustomer(customerId: number): Promise<any[]>;
  createFavorite(data: InsertFavorite): Promise<Favorite>;
  deleteFavorite(customerId: number, experienceId: number): Promise<void>;

  getStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async getCountries(): Promise<Country[]> {
    return db.select().from(countries).where(eq(countries.isActive, true));
  }

  async createCountry(data: InsertCountry): Promise<Country> {
    const [country] = await db.insert(countries).values(data).returning();
    return country;
  }

  async getVendorByOwner(ownerId: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.ownerProfileId, ownerId));
    return vendor;
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getAllVendors(): Promise<Vendor[]> {
    return db.select().from(vendors).orderBy(desc(vendors.createdAt));
  }

  async createVendor(data: InsertVendor): Promise<Vendor> {
    const [vendor] = await db.insert(vendors).values(data).returning();
    return vendor;
  }

  async updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor | undefined> {
    const [vendor] = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning();
    return vendor;
  }

  async getPublishedExperiences(filters?: {
    category?: string;
    countryId?: number;
    city?: string;
    q?: string;
  }): Promise<Experience[]> {
    let query = db.select().from(experiences).where(eq(experiences.status, "published"));

    const conditions = [eq(experiences.status, "published")];

    if (filters?.category) {
      conditions.push(eq(experiences.category, filters.category));
    }
    if (filters?.countryId) {
      conditions.push(eq(experiences.countryId, filters.countryId));
    }
    if (filters?.city) {
      conditions.push(ilike(experiences.city, `%${filters.city}%`));
    }
    if (filters?.q) {
      conditions.push(ilike(experiences.title, `%${filters.q}%`));
    }

    return db.select().from(experiences).where(and(...conditions)).orderBy(desc(experiences.createdAt));
  }

  async getFeaturedExperiences(): Promise<Experience[]> {
    return db.select().from(experiences)
      .where(eq(experiences.status, "published"))
      .orderBy(desc(experiences.createdAt))
      .limit(8);
  }

  async getExperience(id: number): Promise<Experience | undefined> {
    const [exp] = await db.select().from(experiences).where(eq(experiences.id, id));
    return exp;
  }

  async getExperiencesByVendor(vendorId: number): Promise<Experience[]> {
    return db.select().from(experiences)
      .where(eq(experiences.vendorId, vendorId))
      .orderBy(desc(experiences.createdAt));
  }

  async getAllExperiences(): Promise<Experience[]> {
    return db.select().from(experiences).orderBy(desc(experiences.createdAt));
  }

  async createExperience(data: InsertExperience): Promise<Experience> {
    const [exp] = await db.insert(experiences).values(data).returning();
    return exp;
  }

  async updateExperience(id: number, data: Partial<InsertExperience>): Promise<Experience | undefined> {
    const [exp] = await db.update(experiences).set(data).where(eq(experiences.id, id)).returning();
    return exp;
  }

  async getSlotsByExperience(experienceId: number): Promise<AvailabilitySlot[]> {
    return db.select().from(availabilitySlots)
      .where(eq(availabilitySlots.experienceId, experienceId))
      .orderBy(availabilitySlots.date, availabilitySlots.startTime);
  }

  async createSlot(data: InsertAvailabilitySlot): Promise<AvailabilitySlot> {
    const [slot] = await db.insert(availabilitySlots).values(data).returning();
    return slot;
  }

  async deleteSlot(id: number): Promise<void> {
    await db.delete(availabilitySlots).where(eq(availabilitySlots.id, id));
  }

  async getBookingsByCustomer(customerId: number): Promise<any[]> {
    const result = await db.select().from(bookings)
      .where(eq(bookings.customerProfileId, customerId))
      .orderBy(desc(bookings.createdAt));

    const enriched = await Promise.all(
      result.map(async (b) => {
        const [exp] = await db.select({
          id: experiences.id,
          title: experiences.title,
          category: experiences.category,
          imageUrl: experiences.imageUrl,
          city: experiences.city,
          durationMinutes: experiences.durationMinutes,
        }).from(experiences).where(eq(experiences.id, b.experienceId));
        return { ...b, experience: exp };
      })
    );
    return enriched;
  }

  async getBookingsByVendor(vendorId: number): Promise<any[]> {
    const vendorExps = await db.select({ id: experiences.id })
      .from(experiences)
      .where(eq(experiences.vendorId, vendorId));

    if (vendorExps.length === 0) return [];

    const expIds = vendorExps.map(e => e.id);
    const allBookings = await db.select().from(bookings)
      .orderBy(desc(bookings.createdAt));

    const vendorBookings = allBookings.filter(b => expIds.includes(b.experienceId));

    const enriched = await Promise.all(
      vendorBookings.map(async (b) => {
        const [exp] = await db.select({ title: experiences.title }).from(experiences).where(eq(experiences.id, b.experienceId));
        const [customer] = await db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, b.customerProfileId));
        return { ...b, experience: exp, customer };
      })
    );
    return enriched;
  }

  async getAllBookings(): Promise<any[]> {
    const result = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    const enriched = await Promise.all(
      result.map(async (b) => {
        const [exp] = await db.select({ title: experiences.title }).from(experiences).where(eq(experiences.id, b.experienceId));
        const [customer] = await db.select({ fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, b.customerProfileId));
        return { ...b, experience: exp, customer };
      })
    );
    return enriched;
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [booking] = await db.insert(bookings).values(data).returning();
    return booking;
  }

  async updateBooking(id: number, data: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db.update(bookings).set(data).where(eq(bookings.id, id)).returning();
    return booking;
  }

  async getFavoritesByCustomer(customerId: number): Promise<any[]> {
    const result = await db.select().from(favorites)
      .where(eq(favorites.customerProfileId, customerId))
      .orderBy(desc(favorites.createdAt));

    const enriched = await Promise.all(
      result.map(async (f) => {
        const [exp] = await db.select().from(experiences).where(eq(experiences.id, f.experienceId));
        return { ...f, experience: exp };
      })
    );
    return enriched;
  }

  async createFavorite(data: InsertFavorite): Promise<Favorite> {
    const [fav] = await db.insert(favorites).values(data).returning();
    return fav;
  }

  async deleteFavorite(customerId: number, experienceId: number): Promise<void> {
    await db.delete(favorites).where(
      and(eq(favorites.customerProfileId, customerId), eq(favorites.experienceId, experienceId))
    );
  }

  async getStats(): Promise<any> {
    const [expCount] = await db.select({ count: sql<number>`count(*)` }).from(experiences);
    const [bookCount] = await db.select({ count: sql<number>`count(*)` }).from(bookings);
    const [vendorCount] = await db.select({ count: sql<number>`count(*)` }).from(vendors);
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);

    return {
      totalExperiences: Number(expCount.count),
      totalBookings: Number(bookCount.count),
      totalVendors: Number(vendorCount.count),
      totalUsers: Number(userCount.count),
    };
  }
}

export const storage = new DatabaseStorage();
