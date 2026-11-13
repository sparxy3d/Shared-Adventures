// CDP Network events are the same request/priority data shown in DevTools.
// Fresh contexts + disabled cache; no mutations or authenticated sessions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const express = require("express");
const { chromium } = require("/mnt/pid2/node_modules/playwright");

(async () => {
  const base = process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://127.0.0.1:5000";
  const app = express();
  // Serve the actual built HTML/assets without starting the production server or DB.
  // Only public read APIs are forwarded to the already-running DEV workflow.
  app.use("/api", async (req, res) => {
    if (req.method !== "GET") return res.sendStatus(405);
    try {
      const response = await fetch(new URL(req.originalUrl, base));
      res.status(response.status).set("Content-Type", response.headers.get("content-type") || "application/json");
      res.send(Buffer.from(await response.arrayBuffer()));
    } catch { res.status(502).json({ message: "DEV read API unavailable" }); }
  });
  app.use(express.static(path.resolve("dist/public")));
  app.use((_req, res) => res.sendFile(path.resolve("dist/public/index.html")));
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const builtBase = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", headless: true, args: ["--no-sandbox"] });
  const results = [];
  try {
    for (const [mode, origin] of [["dev", base], ["built", builtBase]]) {
      for (const width of [375, 1440]) {
        for (const route of ["/", "/for-vendors", "/login"]) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
          const page = await context.newPage();
          const session = await context.newCDPSession(page);
          await session.send("Network.enable");
          await session.send("Network.setCacheDisabled", { cacheDisabled: true });
          const images = new Map();
          session.on("Network.requestWillBeSent", event => {
            if (/\/images\/hero-sunset-\d+\.webp(?:\?|$)/.test(event.request.url)) {
              images.set(event.requestId, { url: new URL(event.request.url).pathname,
                priority: event.request.initialPriority, initiator: event.initiator.type });
            }
          });
          session.on("Network.resourceChangedPriority", event => {
            if (images.has(event.requestId)) images.get(event.requestId).priority = event.newPriority;
          });
          await page.addInitScript(() => {
            window.heroCspViolations = [];
            document.addEventListener("securitypolicyviolation", event => {
              window.heroCspViolations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });
            });
          });
          // Fail rather than silently sending a mutation if the app changes later.
          await page.route("**/api/**", request => ["GET", "HEAD"].includes(request.request().method())
            ? request.continue() : request.abort());
          const response = await page.goto(origin + route, { waitUntil: "networkidle", timeout: 60000 });
          assert.equal(response.status(), 200);
          const preloads = await page.locator('head link[rel="preload"][as="image"]').evaluateAll(links =>
            links.map(link => Object.fromEntries([...link.attributes].map(attribute => [attribute.name, attribute.value]))));
          const violations = await page.evaluate(() => window.heroCspViolations);
          assert.deepEqual(violations.filter(v => v.blocked === "inline" && v.directive.startsWith("script-src")), []);
          if (route === "/") {
            assert.equal(preloads.length, 2);
            for (const link of preloads) {
              assert.equal(link.fetchpriority, "high"); assert.equal(link.imagesizes, "100vw");
              assert.equal(link.type, "image/webp");
            }
            assert.equal(preloads[0].media, "(max-width: 767px)");
            assert.equal(preloads[1].media, "(min-width: 768px)");
            assert.equal(images.size, 1, "Matching preload reused by hero; no duplicate/wrong-size request");
            const image = [...images.values()][0];
            assert.equal(image.url, width < 768 ? "/images/hero-sunset-768.webp" : "/images/hero-sunset-1440.webp");
            assert.ok(["High", "VeryHigh"].includes(image.priority), `Expected high priority, got ${image.priority}`);
            assert.equal(await page.locator(".home-hero-photo").evaluate(img => img.complete && img.naturalWidth > 0), true);
          } else {
            assert.equal(preloads.length, 0); assert.equal(images.size, 0, "Non-home page must never request hero");
          }
          results.push({ mode, width, route, csp: response.headers()["content-security-policy"] || null,
            preloads, heroRequests: [...images.values()], inlineScriptViolations: violations });
          console.log(`PASS ${mode} ${width}px ${route}: ${images.size} hero request(s)${images.size ? ", high priority" : ""}; no inline CSP violation`);
          if (mode === "dev" && route === "/" && width === 375) {
            fs.mkdirSync("generated-artifacts/hero-preload", { recursive: true });
            await page.screenshot({ path: "generated-artifacts/hero-preload/home-375.jpg", type: "jpeg", quality: 75 });
          }
          await context.close();
        }
      }
    }
    fs.mkdirSync("generated-artifacts/hero-preload", { recursive: true });
    fs.writeFileSync("generated-artifacts/hero-preload/network.json", JSON.stringify(results, null, 2));
  } finally {
    await browser.close(); server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
