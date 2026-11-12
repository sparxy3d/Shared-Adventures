// Read-only browser measurements against development. Never saves a listing.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const phase = process.argv[2];
const onlyRoute = process.argv[3];
assert.ok(["before", "after"].includes(phase), "Use before or after");
const base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
assert.ok(base.endsWith(".replit.dev"), "Development only");
const out = `generated-artifacts/responsive-photos/${phase}`;
fs.mkdirSync(out, { recursive: true });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
  try {
    const auth = await browser.newContext();
    const login = await auth.request.post(`${base}/api/auth/login`, { data: { email: "vendor1@freespirit.com", password: "vendor123" } });
    assert.equal(login.status(), 200, "Demo vendor login");
    const listings = await (await auth.request.get(`${base}/api/vendor/experiences`)).json();
    const listing = listings.find(item => item.imageUrl && item.title);
    assert.ok(listing, "Existing populated listing required");
    const state = await auth.storageState();
    const results = onlyRoute && fs.existsSync(`${out}/measurements.json`)
      ? JSON.parse(fs.readFileSync(`${out}/measurements.json`, "utf8")).filter(r => r.route !== onlyRoute) : [];
    // DPR 1 is the comparison baseline; DPR 2 also checks real high-density selection.
    for (const dpr of [1, 2]) for (const width of [375, 1440]) for (const route of ["/", "/for-vendors", `/vendor/listings/${listing.id}`]) {
      if (onlyRoute && route !== onlyRoute) continue;
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, serviceWorkers: "block", storageState: route.startsWith("/vendor/") ? state : undefined, reducedMotion: "reduce" });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      const entries = [], pending = [], errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => {
        if (response.request().resourceType() !== "image") return;
        pending.push((async () => {
          try { const body = await response.body(); entries.push({ url: new URL(response.url()).pathname, bytes: body.length, status: response.status() }); }
          catch (error) { entries.push({ url: new URL(response.url()).pathname, bytes: 0, error: error.message }); }
        })());
      });
      await page.goto(base + route, { waitUntil: "networkidle" });
      if (route.startsWith("/vendor/")) {
        await page.locator('[role="radiogroup"][aria-label="Experience photos"]').waitFor({ state: "attached" });
        // Phone sections start collapsed. Opening Photos is read-only and identical in both runs.
        const heading = page.getByRole("button", { name: /04 · Choose a photo/ });
        if (await heading.count() && !(await page.locator(".v5-image-choice").first().isVisible())) await heading.click();
      }
      await pause(600); await Promise.all(pending);
      const initial = entries.slice();
      await page.screenshot({ path: `${out}/${route === "/" ? "home" : route.includes("listings") ? "editor" : "for-vendors"}-${width}-${dpr}x-initial.jpg`, type: "jpeg", quality: 85 });
      // Incremental scroll triggers native lazy loading without skipping any section.
      for (let y = 0; y <= await page.evaluate(() => document.documentElement.scrollHeight); y += 650) { await page.evaluate(y => scrollTo(0, y), y); await pause(160); }
      await pause(500); await Promise.all(pending);
      const summarize = items => ({ bytes: items.reduce((n, i) => n + i.bytes, 0), requests: items.length, largest: [...items].sort((a, b) => b.bytes - a.bytes)[0] ?? null, entries: items });
      const selected = await page.locator("img").evaluateAll(imgs => imgs.map(i => ({ src: i.getAttribute("src"), currentSrc: new URL(i.currentSrc || i.src).pathname, sizes: i.sizes, loading: i.loading, width: i.getBoundingClientRect().width, height: i.getBoundingClientRect().height })));
      const result = { route, listingId: listing.id, width, dpr, initial: summarize(initial), full: summarize(entries), selected, errors };
      results.push(result);
      fs.writeFileSync(`${out}/measurements.json`, JSON.stringify(results, null, 2));
      console.log(JSON.stringify({ route, width, dpr, initial: result.initial.bytes, full: result.full.bytes, requests: result.full.requests, errors }));
      await page.screenshot({ path: `${out}/${route === "/" ? "home" : route.includes("listings") ? "editor" : "for-vendors"}-${width}-${dpr}x-full.jpg`, fullPage: true, type: "jpeg", quality: 85 });
      await context.close();
    }
    await auth.request.post(`${base}/api/auth/logout`);
    await auth.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
