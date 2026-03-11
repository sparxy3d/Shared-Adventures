import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role").notNull().default("customer"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  currencyCode: text("currency_code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCountrySchema = createInsertSchema(countries).omit({ id: true });
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Country = typeof countries.$inferSelect;

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  ownerProfileId: integer("owner_profile_id").notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  countryId: integer("country_id").references(() => countries.id),
  region: text("region"),
  city: text("city"),
  address: text("address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

export const experiences = pgTable("experiences", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  category: text("category").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  locationText: text("location_text"),
  countryId: integer("country_id").references(() => countries.id),
  region: text("region"),
  city: text("city"),
  durationMinutes: integer("duration_minutes"),
  priceAmount: integer("price_amount"),
  currencyCode: text("currency_code").default("USD"),
  capacity: integer("capacity"),
  ageMin: integer("age_min"),
  safetyNotes: text("safety_notes"),
  idealForTags: text("ideal_for_tags").array(),
  openTime: text("open_time"),
  closeTime: text("close_time"),
  nextSessionText: text("next_session_text"),
  status: text("status").notNull().default("draft"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExperienceSchema = createInsertSchema(experiences).omit({ id: true, createdAt: true });
export type InsertExperience = z.infer<typeof insertExperienceSchema>;
export type Experience = typeof experiences.$inferSelect;

export const experienceImages = pgTable("experience_images", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  imageUrl: text("image_url").notNull(),
  sortOrder: integer("sort_order").default(0),
});

export const insertExperienceImageSchema = createInsertSchema(experienceImages).omit({ id: true });
export type InsertExperienceImage = z.infer<typeof insertExperienceImageSchema>;
export type ExperienceImage = typeof experienceImages.$inferSelect;

export const availabilitySlots = pgTable("availability_slots", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  date: text("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull(),
  status: text("status").notNull().default("open"),
});

export const insertAvailabilitySlotSchema = createInsertSchema(availabilitySlots).omit({ id: true });
export type InsertAvailabilitySlot = z.infer<typeof insertAvailabilitySlotSchema>;
export type AvailabilitySlot = typeof availabilitySlots.$inferSelect;

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  customerProfileId: integer("customer_profile_id").notNull().references(() => users.id),
  slotId: integer("slot_id").references(() => availabilitySlots.id),
  bookingDate: text("booking_date").notNull(),
  startTime: text("start_time"),
  qty: integer("qty").notNull().default(1),
  totalAmount: integer("total_amount"),
  currencyCode: text("currency_code").default("USD"),
  status: text("status").notNull().default("requested"),
  customerNote: text("customer_note"),
  vendorNote: text("vendor_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  customerProfileId: integer("customer_profile_id").notNull().references(() => users.id),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id),
  experienceId: integer("experience_id").notNull().references(() => experiences.id),
  customerProfileId: integer("customer_profile_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
