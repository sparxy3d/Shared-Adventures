import { db } from "./db";
import { users, countries, vendors, experiences, availabilitySlots } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  const existingCountries = await db.select().from(countries);
  if (existingCountries.length > 0) {
    console.log("Database already seeded, skipping...");
    await standardizeCurrencyToLKR();
    await applyDemoUpgrades();
    return;
  }

  console.log("Seeding database...");

  const [sriLanka, australia] = await db.insert(countries).values([
    { name: "Sri Lanka", code: "LK", currencyCode: "LKR", isActive: true },
    { name: "Australia", code: "AU", currencyCode: "AUD", isActive: true },
  ]).returning();

  const adminPass = await hashPassword("admin123");
  const vendorPass = await hashPassword("vendor123");
  const customerPass = await hashPassword("customer123");

  const [adminUser] = await db.insert(users).values([
    { email: "admin@freespirit.com", password: adminPass, fullName: "Admin User", role: "admin" },
  ]).returning();

  const [vendor1User, vendor2User] = await db.insert(users).values([
    { email: "vendor1@freespirit.com", password: vendorPass, fullName: "Adventure Co", role: "vendor" },
    { email: "vendor2@freespirit.com", password: vendorPass, fullName: "Wellness Studio", role: "vendor" },
  ]).returning();

  await db.insert(users).values([
    { email: "user@freespirit.com", password: customerPass, fullName: "Sarah Johnson", role: "customer" },
  ]);

  const [vendorAdventure] = await db.insert(vendors).values([
    {
      ownerProfileId: vendor1User.id,
      businessName: "Island Adventures",
      description: "We provide thrilling outdoor adventures for groups of all sizes. From rafting to surfing, we make every outing unforgettable.",
      countryId: sriLanka.id,
      region: "Southern Province",
      city: "Galle",
      address: "42 Beach Road, Unawatuna",
      contactEmail: "hello@islandadventures.lk",
      contactPhone: "+94 77 123 4567",
      verificationStatus: "approved",
    },
  ]).returning();

  const [vendorWellness] = await db.insert(vendors).values([
    {
      ownerProfileId: vendor2User.id,
      businessName: "Zen Collective",
      description: "A wellness studio offering yoga, meditation, and spa experiences for individuals and groups seeking balance and connection.",
      countryId: australia.id,
      region: "New South Wales",
      city: "Sydney",
      address: "18 Bondi Junction",
      contactEmail: "namaste@zencollective.au",
      contactPhone: "+61 4 9876 5432",
      verificationStatus: "approved",
    },
  ]).returning();

  const seedExperiences = await db.insert(experiences).values([
    {
      vendorId: vendorAdventure.id,
      category: "adventure",
      title: "White Water Rafting - Kelani River",
      description: "Experience the thrill of white water rafting on the stunning Kelani River. Perfect for friends and teams looking for an adrenaline-pumping adventure together. Our experienced guides ensure safety while maximizing fun. All equipment provided, no prior experience needed.",
      locationText: "Kelani River, Kitulgala",
      countryId: sriLanka.id,
      region: "Sabaragamuwa Province",
      city: "Kitulgala",
      durationMinutes: 180,
      priceAmount: 4500,
      currencyCode: "LKR",
      capacity: 12,
      ageMin: 14,
      safetyNotes: "Life jackets and helmets provided. Must know how to swim. Not recommended for pregnant women.",
      idealForTags: ["friends", "teams", "couples"],
      openTime: "07:00",
      closeTime: "17:00",
      nextSessionText: "Next: Tomorrow 7:00 AM",
      status: "published",
      imageUrl: "/images/rafting.png",
    },
    {
      vendorId: vendorAdventure.id,
      category: "sports",
      title: "Beach Volleyball Tournament",
      description: "Join our weekly beach volleyball tournament on the golden sands of Unawatuna. Form your team or join one. Great way to meet new people and enjoy friendly competition by the sea.",
      locationText: "Unawatuna Beach",
      countryId: sriLanka.id,
      region: "Southern Province",
      city: "Galle",
      durationMinutes: 120,
      priceAmount: 1500,
      currencyCode: "LKR",
      capacity: 20,
      idealForTags: ["friends", "teams", "solo"],
      openTime: "06:00",
      closeTime: "20:00",
      nextSessionText: "Open daily",
      status: "published",
      imageUrl: "/images/volleyball.png",
    },
    {
      vendorId: vendorAdventure.id,
      category: "adventure",
      title: "Surfing Lessons for Groups",
      description: "Learn to surf with your crew! Our beginner-friendly group lessons are perfect for friends who want to try something new together. Boards and wetsuits included.",
      locationText: "Weligama Bay",
      countryId: sriLanka.id,
      region: "Southern Province",
      city: "Weligama",
      durationMinutes: 150,
      priceAmount: 5000,
      currencyCode: "LKR",
      capacity: 8,
      ageMin: 10,
      safetyNotes: "Basic swimming ability required. All safety equipment provided.",
      idealForTags: ["friends", "couples", "families"],
      openTime: "06:00",
      closeTime: "16:00",
      nextSessionText: "Next: Today 2:00 PM",
      status: "published",
      imageUrl: "/images/surfing.png",
    },
    {
      vendorId: vendorWellness.id,
      category: "wellness",
      title: "Sunrise Yoga on Bondi Beach",
      description: "Start your day with a rejuvenating group yoga session overlooking the iconic Bondi Beach. Suitable for all levels. Mats provided. A beautiful way to connect with yourself and your friends.",
      locationText: "Bondi Beach South End",
      countryId: australia.id,
      region: "New South Wales",
      city: "Sydney",
      durationMinutes: 75,
      priceAmount: 700000,
      currencyCode: "LKR",
      capacity: 15,
      idealForTags: ["friends", "couples", "solo"],
      openTime: "05:30",
      closeTime: "11:00",
      nextSessionText: "Next: Tomorrow 5:30 AM",
      status: "published",
      imageUrl: "/images/yoga.png",
    },
    {
      vendorId: vendorWellness.id,
      category: "arts",
      title: "Pottery Workshop for Couples & Friends",
      description: "Get your hands dirty in our cozy pottery studio! This 2-hour workshop teaches you the basics of wheel throwing. Take home your creations. A perfect bonding activity.",
      locationText: "Zen Collective Studio",
      countryId: australia.id,
      region: "New South Wales",
      city: "Sydney",
      durationMinutes: 120,
      priceAmount: 1700000,
      currencyCode: "LKR",
      capacity: 10,
      idealForTags: ["couples", "friends", "families"],
      openTime: "09:00",
      closeTime: "21:00",
      nextSessionText: "Next session: Tonight 6 PM",
      status: "published",
      imageUrl: "/images/pottery.png",
    },
    {
      vendorId: vendorWellness.id,
      category: "wellness",
      title: "Group Spa & Wellness Day",
      description: "Treat your group to a full day of pampering. Includes sauna, aromatherapy massage, facial treatment, and a healthy lunch. The ultimate bonding experience for those who deserve some relaxation.",
      locationText: "Zen Collective Wellness Centre",
      countryId: australia.id,
      region: "New South Wales",
      city: "Sydney",
      durationMinutes: 360,
      priceAmount: 5000000,
      currencyCode: "LKR",
      capacity: 6,
      ageMin: 18,
      idealForTags: ["friends", "couples"],
      openTime: "08:00",
      closeTime: "20:00",
      nextSessionText: "Open now",
      status: "published",
      imageUrl: "/images/spa.png",
    },
    {
      vendorId: vendorAdventure.id,
      category: "sports",
      title: "Group Golf Experience",
      description: "Enjoy a relaxed round of golf with friends or colleagues at a scenic course overlooking the Indian Ocean. Equipment rental available. Beginners welcome with optional coaching.",
      locationText: "Galle Golf Club",
      countryId: sriLanka.id,
      region: "Southern Province",
      city: "Galle",
      durationMinutes: 240,
      priceAmount: 8000,
      currencyCode: "LKR",
      capacity: 8,
      idealForTags: ["friends", "teams", "couples"],
      openTime: "06:00",
      closeTime: "18:00",
      nextSessionText: "Next: Saturday 6 AM",
      status: "published",
      imageUrl: "/images/golf.png",
    },
    {
      vendorId: vendorWellness.id,
      category: "arts",
      title: "Cooking Class - Asian Fusion",
      description: "Learn to cook delicious Asian fusion dishes in a fun, social setting. Includes a welcome drink, all ingredients, recipes to take home, and of course, you get to eat everything you cook!",
      locationText: "Zen Collective Kitchen Studio",
      countryId: australia.id,
      region: "New South Wales",
      city: "Sydney",
      durationMinutes: 180,
      priceAmount: 2400000,
      currencyCode: "LKR",
      capacity: 12,
      idealForTags: ["friends", "couples", "teams"],
      openTime: "10:00",
      closeTime: "22:00",
      nextSessionText: "Next: Tonight 7 PM",
      status: "published",
      imageUrl: "/images/cooking.png",
    },
  ]).returning();

  const today = new Date();
  const slotData = [];
  for (const exp of seedExperiences) {
    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dateStr = date.toISOString().split("T")[0];
      slotData.push({
        experienceId: exp.id,
        date: dateStr,
        startTime: "09:00",
        endTime: `${Math.floor(9 + (exp.durationMinutes || 60) / 60)}:${String((exp.durationMinutes || 60) % 60).padStart(2, "0")}`,
        capacity: exp.capacity || 10,
        status: "open" as const,
      });
      slotData.push({
        experienceId: exp.id,
        date: dateStr,
        startTime: "14:00",
        endTime: `${Math.floor(14 + (exp.durationMinutes || 60) / 60)}:${String((exp.durationMinutes || 60) % 60).padStart(2, "0")}`,
        capacity: exp.capacity || 10,
        status: "open" as const,
      });
    }
  }

  await db.insert(availabilitySlots).values(slotData);

  await standardizeCurrencyToLKR();
  await applyDemoUpgrades();

  console.log("Database seeded successfully!");
  console.log("Test accounts:");
  console.log("  Admin: admin@freespirit.com / admin123");
  console.log("  Vendor: vendor1@freespirit.com / vendor123");
  console.log("  Customer: user@freespirit.com / customer123");
}

async function standardizeCurrencyToLKR() {
  // One-time normalization: convert any non-LKR experience prices to sensible LKR
  // values so the demo grid is consistent. Approx FX: A$1 ≈ LKR 200.
  const result = await db.execute(sql`
    UPDATE experiences
    SET price_amount = ROUND(price_amount * 200 / 1000) * 1000,
        currency_code = 'LKR'
    WHERE currency_code = 'AUD'
  `);
  if ((result as any).rowCount && (result as any).rowCount > 0) {
    console.log(`Standardized ${(result as any).rowCount} experience prices to LKR.`);
  }
}

// Idempotent upgrades so both fresh and already-seeded databases get the
// Recreation category, ratings and offers.
async function applyDemoUpgrades() {
  // 1) Backfill ratings (stored as tenths: 42–49) and review counts.
  await db.execute(sql`
    UPDATE experiences
    SET rating = 42 + (id * 7) % 8,
        review_count = 38 + (id * 37) % 190
    WHERE rating IS NULL OR review_count IS NULL
  `);

  // 2) Seed Recreation experiences if missing (checked per record by title).
  {
    const existingRecreation = await db.select().from(experiences).where(eq(experiences.category, "recreation"));
    const existingTitles = new Set(existingRecreation.map((e) => e.title));
    const [anyVendor] = await db.select().from(vendors).limit(1);
    const [lk] = await db.select().from(countries).where(eq(countries.code, "LK"));
    if (anyVendor && lk) {
      const recreationSeeds = [
        {
          vendorId: anyVendor.id,
          category: "recreation",
          title: "Bowling Night — Colombo Lanes",
          description: "Grab your crew for a night of strikes and spares at Colombo's favourite bowling alley. Shoe rental, lane snacks and a friendly scoreboard rivalry included. Great for birthdays, team nights and casual hangouts.",
          locationText: "Colombo Lanes, Bambalapitiya",
          countryId: lk.id,
          region: "Western Province",
          city: "Colombo",
          durationMinutes: 90,
          priceAmount: 2500,
          currencyCode: "LKR",
          capacity: 18,
          idealForTags: ["friends", "teams"],
          openTime: "10:00",
          closeTime: "23:00",
          nextSessionText: "Open late daily",
          status: "published",
          rating: 46,
          reviewCount: 132,
          imageUrl: "/images/recreation.png",
        },
        {
          vendorId: anyVendor.id,
          category: "recreation",
          title: "Pool & Billiards Lounge",
          description: "Rack 'em up in a relaxed lounge with pro tables, good music and cold drinks. Book a table for an hour or settle in for a tournament with friends. Cues and coaching tips available.",
          locationText: "Cue Club, Kandy City Centre",
          countryId: lk.id,
          region: "Central Province",
          city: "Kandy",
          durationMinutes: 60,
          priceAmount: 1800,
          currencyCode: "LKR",
          capacity: 8,
          idealForTags: ["friends", "solo"],
          openTime: "12:00",
          closeTime: "23:30",
          nextSessionText: "Next: Today 12 PM",
          status: "published",
          rating: 44,
          reviewCount: 87,
        },
        {
          vendorId: anyVendor.id,
          category: "recreation",
          title: "Arcade Group Pass",
          description: "Unlimited arcade credits for two hours — racing sims, air hockey, claw machines and retro classics. The group pass covers up to six players, perfect for a rainy-day plan.",
          locationText: "Galaxy Arcade, Colombo 03",
          countryId: lk.id,
          region: "Western Province",
          city: "Colombo",
          durationMinutes: 120,
          priceAmount: 3200,
          currencyCode: "LKR",
          capacity: 6,
          idealForTags: ["friends", "families", "teams"],
          nextSessionText: "Next session: Tonight 6 PM",
          status: "published",
          rating: 48,
          reviewCount: 156,
        },
        {
          vendorId: anyVendor.id,
          category: "recreation",
          title: "Darts & Drinks Evening",
          description: "A social darts night with casual boards, league-style scoring and mocktails on tap. Come solo and join a board, or bring your team for a bracket night.",
          locationText: "Bullseye Bar, Galle Fort",
          countryId: lk.id,
          region: "Southern Province",
          city: "Galle",
          durationMinutes: 120,
          priceAmount: 2000,
          currencyCode: "LKR",
          capacity: 12,
          idealForTags: ["friends", "solo", "teams"],
          nextSessionText: "Next: Friday 7 PM",
          status: "published",
          rating: 43,
          reviewCount: 64,
        },
      ];

      const missing = recreationSeeds.filter((s) => !existingTitles.has(s.title));
      if (missing.length > 0) {
      const recreation = await db.insert(experiences).values(missing).returning();

      const today = new Date();
      const recSlots = [];
      for (const exp of recreation) {
        for (let d = 1; d <= 7; d++) {
          const date = new Date(today);
          date.setDate(date.getDate() + d);
          const dateStr = date.toISOString().split("T")[0];
          for (const start of [14, 19]) {
            recSlots.push({
              experienceId: exp.id,
              date: dateStr,
              startTime: `${start}:00`,
              endTime: `${Math.floor(start + (exp.durationMinutes || 60) / 60)}:${String((exp.durationMinutes || 60) % 60).padStart(2, "0")}`,
              capacity: exp.capacity || 10,
              status: "open" as const,
            });
          }
        }
      }
      await db.insert(availabilitySlots).values(recSlots);
      console.log(`Seeded ${recreation.length} Recreation experiences.`);
      }
    }
  }

  // 3) Backfill offers per target experience (only where no offer is set yet).
  await db.execute(sql`UPDATE experiences SET offer_label = '20% off weekday pottery' WHERE title ILIKE '%pottery%' AND offer_label IS NULL`);
  await db.execute(sql`UPDATE experiences SET offer_label = 'Group of 6+ — one goes free' WHERE title ILIKE '%rafting%' AND offer_label IS NULL`);
  await db.execute(sql`UPDATE experiences SET offer_label = 'Sunset yoga — launch price' WHERE title ILIKE '%yoga%' AND offer_label IS NULL`);
}
