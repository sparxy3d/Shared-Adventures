// Authenticated read-only DEV UI checks. Synthetic gallery/bookings/favorite writes
// are fulfilled in the browser, never sent to the server. No listing is saved.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
assert.ok(base.endsWith(".replit.dev"));
const out = "generated-artifacts/responsive-photos/surfaces";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
  const contexts = [];
  async function as(email, password) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    context.setDefaultTimeout(15000);
    context.setDefaultNavigationTimeout(30000);
    await context.route(/\/api\//, route => {
      if (!["GET", "HEAD"].includes(route.request().method())) return route.abort("blockedbyclient");
      return route.continue();
    });
    contexts.push(context);
    assert.equal((await context.request.post(`${base}/api/auth/login`, { data: { email, password } })).status(), 200);
    return context;
  }
  try {
    const vendor = await as("vendor1@freespirit.com", "vendor123");
    const listings = await (await vendor.request.get(`${base}/api/vendor/experiences`)).json();
    const listing = listings.find(i => i.imageUrl);
    const original = await (await vendor.request.get(`${base}/api/vendor/experiences/${listing.id}`)).text();
    const admin = await as("admin@freespirit.com", "admin123");
    const member = await as("user@freespirit.com", "customer123");
    for (const width of [375, 1440]) {
      const page = await vendor.newPage();
      page.on("dialog", d => d.accept());
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/vendor/listings/${listing.id}`, { waitUntil: "networkidle" });
      console.log(`Checking picker ${width}px`);
      const option = page.locator(".v5-image-choice").nth(1);
      await option.scrollIntoViewIfNeeded(); await option.click();
      assert.equal(await option.getAttribute("aria-checked"), "true");
      await page.locator("#section-preview").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector("#section-preview img")?.currentSrc.includes("billiards-"));
      // A tall element screenshot does not itself trigger lazy images below the viewport.
      for (const image of await page.locator(".v5-image-choice img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(i => i.decode());
      }
      await page.locator("#section-photo").screenshot({ path: `${out}/picker-${width}.jpg` });
      await page.goto(`${base}/vendor/listings`, { waitUntil: "networkidle" });
      assert.ok(await page.locator("img.v5-thumb").count());
      for (const img of await page.locator("img.v5-thumb").all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(i => i.decode());
        assert.match(await img.evaluate(i => i.currentSrc), /responsive\/|listing-images/);
      }
      const adminPage = await admin.newPage();
      await adminPage.setViewportSize({ width, height: 900 });
      await adminPage.goto(`${base}/admin/vendors/${listing.vendorId}?tab=listings&listing=${listing.id}`, { waitUntil: "networkidle" });
      await adminPage.locator(".v5-image-choice").first().scrollIntoViewIfNeeded();
      assert.equal(await adminPage.locator(".v5-image-choice").count(), 12);
      await adminPage.locator(".v5-image-choice img").first().evaluate(i => i.decode());
      assert.match(await adminPage.locator(".v5-image-choice img").first().evaluate(i => i.currentSrc), /responsive\//);
      console.log(`PASS ${width}px: vendor picker/preview, listing thumbnails, shared admin editor`);
      // A synthetic requested booking exercises the real member UI with no record creation.
      const memberPage = await member.newPage();
      await memberPage.setViewportSize({ width, height: 900 });
      await memberPage.route("**/api/bookings", route => route.fulfill({ json: [{
        id: 999999, experienceId: listing.id, bookingDate: "2099-11-12", startTime: "14:00", endTime: "15:00",
        groupSize: 2, totalAmount: 5000, status: "requested", vendorNote: null,
        experience: { title: "Photo verification fixture", imageUrl: "/images/pottery.png", locationText: null, city: "Colombo" },
        vendor: { businessName: "Photo verification fixture", contactPhone: null, contactEmail: null },
      }] }));
      await memberPage.goto(`${base}/account/bookings`, { waitUntil: "networkidle" });
      const thumbnail = memberPage.getByAltText("Photo verification fixture");
      await thumbnail.evaluate(i => i.decode());
      assert.match(await thumbnail.evaluate(i => i.currentSrc), /pottery-(400|800)\.webp/);
      await thumbnail.click();
      assert.ok(await memberPage.getByText("Share with your group", { exact: true }).isVisible());
      console.log(`PASS ${width}px: My Bookings responsive thumbnail and detail panel (browser fixture)`);
      await memberPage.close(); await adminPage.close(); await page.close();
    }
    assert.equal(await (await vendor.request.get(`${base}/api/vendor/experiences/${listing.id}`)).text(), original, "Listing not saved");
    const page = await member.newPage();
    // Keep the heart interaction entirely in browser memory.
    let saved = false;
    let savedId = listing.id;
    await page.route(/\/api\/favorites(?:\/|\?|$)/, route => {
      if (route.request().method() === "POST") { saved = true; savedId = route.request().postDataJSON().experienceId; }
      if (route.request().method() === "DELETE") saved = false;
      return route.fulfill({ json: saved ? [{ experienceId: savedId }] : [] });
    });
    await page.goto(base + "/", { waitUntil: "networkidle" });
    const card = page.locator('[data-testid^="card-experience-"]').first();
    const favorite = card.locator(".activity-card-heart");
    await favorite.click(); await page.waitForFunction(() => document.querySelector(".activity-card-heart")?.getAttribute("aria-pressed") === "true");
    await favorite.click(); await page.waitForFunction(() => document.querySelector(".activity-card-heart")?.getAttribute("aria-pressed") === "false");
    const href = await card.locator(".activity-card-view").getAttribute("href");
    assert.match(href, /^\/activity\/\d+$/);
    const id = Number(href.split("/").pop());
    await page.route(`**/api/experiences/${id}/photos`, route => route.fulfill({ json: [
      { id: 101, imageUrl: "/images/rafting.png", sortOrder: 0 },
      { id: 102, imageUrl: "/images/pottery.png", sortOrder: 1 },
    ] }));
    await page.goto(base + href, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Show photo 2", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".public-gallery-main img")?.currentSrc.includes("pottery-"));
    const main = page.locator(".public-gallery-main img");
    assert.equal(await main.getAttribute("loading"), "eager");
    assert.equal(await main.getAttribute("fetchpriority"), "high");
    assert.equal(await main.getAttribute("width"), "1280");
    console.log("PASS card navigation, heart save/remove (intercepted), detail gallery selection/priority");
    await page.close();
    const guest = await browser.newContext();
    contexts.push(guest);
    const guestPage = await guest.newPage();
    await guestPage.goto(base, { waitUntil: "networkidle" });
    await guestPage.locator(".activity-card-heart").first().click();
    await guestPage.waitForURL(/\/login\?next=/);
    console.log("PASS logged-out heart sends visitor to login and back");
    for (const context of [vendor, admin, member]) await context.request.post(`${base}/api/auth/logout`);
  } finally { for (const context of contexts) await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
