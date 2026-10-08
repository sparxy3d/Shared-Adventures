// Development-only browser verification. --create-booking intentionally leaves
// one Requested demo-member booking; default run does not create bookings.
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const WebSocket = require("ws");
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error("Development workspace required");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-three-"));
const chrome = spawn("/repl/tools/bin/chromium", ["--headless", "--no-sandbox", "--ignore-certificate-errors", "--remote-debugging-port=9225", `--user-data-dir=${dir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, seq = 0;
const pending = new Map(), events = new Map(), checks = [], requests = [], errors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
async function js(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, label) {
  for (let i = 0; i < 180; i++) { if (await js(expression)) return; await delay(100); }
  throw new Error("Timed out: " + label);
}
async function go(route, selector) {
  const response = await send("Page.navigate", { url: origin + route });
  if (response.errorText) throw new Error(response.errorText);
  await until(`!!document.querySelector(${JSON.stringify(selector)})`, route);
}
async function click(selector) {
  await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error("Missing control");if(e.disabled)throw Error("Disabled control");e.click()})()`);
  await delay(100);
}
async function fill(selector, value) {
  await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==="SELECT"?HTMLSelectElement.prototype:e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,"value").set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await delay(100);
}
async function api(method, url, body) {
  return js(`(async()=>{const r=await fetch(${JSON.stringify(url)},{method:${JSON.stringify(method)},credentials:"include",headers:{"Content-Type":"application/json"},body:${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))}});return {status:r.status,body:await r.json()};})()`);
}
const pass = name => { checks.push(name); console.log("PASS:", name); };
async function shot(name) { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(dir, name + ".png"), Buffer.from(r.data, "base64")); }
async function viewport(width) { await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 }); }
async function intercept(handler) {
  events.set("Fetch.requestPaused", handler);
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/experiences*" }, { urlPattern: "*/api/bookings*" }] });
}
async function respond(requestId, body, status = 200) {
  await send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
}
(async () => {
  try {
    let target;
    for (let i = 0; i < 50; i++) { try { target = (await (await fetch("http://127.0.0.1:9225/json")).json()).find(t => t.type === "page" && !t.url.startsWith("chrome-extension:")); if (target) break; } catch {} await delay(100); }
    assert.ok(target);
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    ws.on("message", data => {
      const m = JSON.parse(data);
      if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }
      else events.get(m.method)?.(m.params);
    });
    await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
    events.set("Runtime.exceptionThrown", ({ exceptionDetails }) => errors.push(exceptionDetails.text));
    events.set("Network.requestWillBeSent", ({ request }) => { if (request.url.includes("/api/")) requests.push(request); });
    if (process.argv.includes("--share-only")) {
      await viewport(390); await go("/search", ".search-results");
      const activities = (await api("GET", "/api/experiences")).body;
      const activity = activities.find(a => a.title.includes("Billiards"));
      const slots = (await api("GET", `/api/experiences/${activity.id}/slots`)).body;
      const slot = slots.find(s => s.status === "open" && s.capacity >= 2 && Date.parse(`${s.date}T${s.startTime.slice(0, 5)}:00+05:30`) > Date.now() + 600000);
      await go(`/activity/${activity.id}?slot=${slot.id}&group=2`, '[data-testid="button-share"]');
      await send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
      await send("Page.bringToFront"); await send("Emulation.setFocusEmulationEnabled", { enabled: true });
      await js('Object.defineProperty(navigator,"share",{configurable:true,value:undefined})');
      await click('[data-testid="button-share"]');
      await until('document.body.textContent.includes("Link copied")', "clipboard toast");
      assert.ok((await js("navigator.clipboard.readText()")).includes(`/activity/${activity.id}`));
      await until('!document.querySelector("[data-testid=button-favorite]").disabled', "guest favorite ready");
      await click('[data-testid="button-favorite"]'); await until('location.pathname==="/login"', "guest save login");
      const next = await js('new URLSearchParams(location.search).get("next")');
      assert.ok(next.includes(`slot=${slot.id}`) && next.includes("group=2"));
      await click('[data-testid="link-signup"]'); await until('location.pathname==="/signup"', "login to signup");
      assert.equal(await js('new URLSearchParams(location.search).get("next")'), next);
      await click('[data-testid="link-login"]'); await until('location.pathname==="/login"', "signup to login");
      assert.equal(await js('new URLSearchParams(location.search).get("next")'), next);
      pass("Actual clipboard fallback/toast, guest-save login and both auth cross-links preserve session/group");
      for (const width of [320, 390, 1280]) {
        await viewport(width); await go("/search", ".search-results");
        await until('!document.querySelector(".search-skeleton-card")', "responsive results");
        assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
        if (width < 600) {
          await click('[data-testid="button-toggle-filters"]');
          assert.ok(await js('document.querySelector(".search-filter-sheet").scrollWidth<=document.querySelector(".search-filter-sheet").clientWidth'));
          await click('.search-sheet-close');
        }
        await go(`/activity/${activity.id}`, '[data-testid="text-experience-title"]');
        if (width < 600) await click(".activity-detail-mobile-bar button");
        else await js('document.querySelector(".activity-detail-grid").scrollIntoView({behavior:"instant"})');
        await until('!!document.querySelector("[data-testid^=button-slot-]")', "responsive sessions");
        assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
        await shot("final-detail-" + width);
      }
      pass("Explore, phone filter sheets and final session panel: no horizontal overflow at 320/390/1280px");
      assert.deepEqual(errors, []);
      console.log("Read-only extras passed"); return;
    }
    if (process.argv.includes("--extras-only")) {
      assert.ok(process.argv.includes("--signup-check"), "Signup test explicitly creates a development test member");
      await viewport(390); await go("/search", ".search-results");
      const activities = (await api("GET", "/api/experiences")).body;
      const activity = activities.find(a => a.title.includes("Billiards"));
      const slots = (await api("GET", `/api/experiences/${activity.id}/slots`)).body;
      const slot = slots.find(s => s.status === "open" && s.capacity >= 2 && Date.parse(`${s.date}T${s.startTime.slice(0, 5)}:00+05:30`) > Date.now() + 600000);
      const choice = `/activity/${activity.id}?slot=${slot.id}&group=2&booking=1`;
        await go(choice, '[role="dialog"] a[href^="/signup"]');
        await click('[role="dialog"] a[href^="/signup"]');
        await until('location.pathname==="/signup"', "signup next");
        await fill('[data-testid="input-fullname"]', "Stage 3 browser verification");
        await fill('[data-testid="input-email"]', `stage3-${Date.now()}@example.invalid`);
        await fill('[data-testid="input-phone"]', "700000000");
        await fill('[data-testid="input-password"]', "Stage3Demo!12");
        await click("#terms-consent"); await click('[data-testid="button-signup"]');
      await until('!!document.querySelector("[role=dialog] .br-primary:not([disabled])")', "signup returns ready session");
      assert.ok(await js(`location.pathname==="/activity/${activity.id}" && new URLSearchParams(location.search).get("slot")==="${slot.id}" && new URLSearchParams(location.search).get("group")==="2"`));
      await click('[role="dialog"] > button:last-child');
      await until('!document.querySelector(".booking-request-stage-three")', "close request");
      await until('!document.querySelector("[data-testid=button-favorite]").disabled', "favorite loaded");
      await click('[data-testid="button-favorite"]');
      await until('document.querySelector("[data-testid=button-favorite]").getAttribute("aria-pressed")==="true"', "saved");
      assert.ok((await api("GET", "/api/favorites")).body.some(f => f.experienceId === activity.id));
      await click('[data-testid="button-favorite"]');
      await until('document.querySelector("[data-testid=button-favorite]").getAttribute("aria-pressed")==="false"', "removed");
      assert.ok(!(await api("GET", "/api/favorites")).body.some(f => f.experienceId === activity.id));
      await send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
      await send("Page.bringToFront");
      await send("Emulation.setFocusEmulationEnabled", { enabled: true });
      // Exercise the clipboard fallback on this browser; native OS sheets need a device check.
      await js('Object.defineProperty(navigator,"share",{configurable:true,value:undefined})');
      await click('[data-testid="button-share"]');
      await until('document.body.textContent.includes("Link copied")', "share toast");
      assert.ok((await js("navigator.clipboard.readText()")).includes(`/activity/${activity.id}`));
      pass("Real signup returns to selected session/group, save/remove persisted and actual clipboard sharing with toast");
      await api("POST", "/api/auth/logout");
      await go(`/activity/${activity.id}?slot=${slot.id}&group=2`, '[data-testid="button-favorite"]');
      await until('!document.querySelector("[data-testid=button-favorite]").disabled', "guest favorite ready");
      await click('[data-testid="button-favorite"]');
      await until('location.pathname==="/login"', "guest save login");
      const returnChoice = await js('new URLSearchParams(location.search).get("next")');
      assert.ok(returnChoice.includes(`slot=${slot.id}`) && returnChoice.includes("group=2"));
      await click('[data-testid="link-signup"]');
      await until('location.pathname==="/signup"', "login to signup");
      assert.equal(await js('new URLSearchParams(location.search).get("next")'), returnChoice);
      await click('[data-testid="link-login"]');
      await until('location.pathname==="/login"', "signup to login");
      assert.equal(await js('new URLSearchParams(location.search).get("next")'), returnChoice);
      pass("Guest save and login/signup cross-links retain session/group; development test member retained");
      assert.deepEqual(errors, []);
      fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify({ checks }, null, 2));
      console.log("Report:", dir);
      return;
    }
    await viewport(1280); await go("/search?category=recreation&time=tonight", ".search-results");
    await until('!document.querySelector(".search-skeleton-card")', "real search");
    assert.ok(requests.some(r => r.url.includes("category=recreation") && r.url.includes("time=tonight")));
    const real = (await api("GET", "/api/experiences")).body;
    const chosen = real.find(a => a.title.includes("Billiards")) || real.find(a => a.capacity >= 2 && a.priceAmount !== null);
    assert.ok(chosen);
    const realSlots = (await api("GET", `/api/experiences/${chosen.id}/slots`)).body;
    const realSlot = realSlots.find(s => s.status === "open" && s.capacity >= 2 && Date.parse(`${s.date}T${s.startTime.slice(0, 5)}:00+05:30`) > Date.now() + 600000);
    assert.ok(realSlot, "real available session");
    for (const width of [390, 1280]) {
      await viewport(width); await go(`/activity/${chosen.id}`, '[data-testid="text-experience-title"]');
      if (width < 600) await click(".activity-detail-mobile-bar button");
      await until('!!document.querySelector(\'[data-testid^="button-slot-"]\')', "real slots");
      assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
      assert.ok(await js('document.querySelectorAll("[data-testid^=slot-day-]").length<=7'));
      assert.ok(!/\b\d{4}-\d{2}-\d{2}\b|ratings?|reviews?|offer|discount/i.test(await js("document.querySelector('main').innerText")));
      await shot("detail-" + width);
      if (width < 600) await click('[role="dialog"] > button:last-child');
      await go("/activity/999999999", ".activity-detail-state");
      assert.ok(await js('document.querySelector(".activity-detail-state").textContent.includes("isn’t available right now")'));
      pass("Real public/404 detail, 7-day limit, human dates and responsive " + width + "px");
    }
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const fixtures = Array.from({ length: 30 }, (_, i) => ({ ...chosen, id: 9000 + i, title: "Browser fixture " + i, priceAmount: 1000 + i * 100, nextSession: i === 29 ? null : { slotId: i, date: tomorrow, startTime: `${String(8 + i % 12).padStart(2, "0")}:00`, endTime: "23:00", spotsLeft: 8 } }));
    const fakeSlots = Array.from({ length: 14 }, (_, i) => ({
      id: 9100 + i, experienceId: chosen.id, date: new Date(Date.parse(tomorrow + "T12:00:00+05:30") + i * 86400000).toISOString().slice(0, 10),
      startTime: "19:00", endTime: "20:00", status: "open", capacity: [0, 1, 2, 4, 8][i % 5],
    }));
    await intercept(async ({ requestId, request }) => {
      const url = new URL(request.url);
      if (url.pathname === "/api/bookings" && request.method === "POST") return respond(requestId, { message: "Conflict fixture" }, 409);
      if (url.pathname.endsWith("/slots")) return respond(requestId, fakeSlots);
      if (url.pathname === `/api/experiences/${chosen.id}`) return respond(requestId, { ...chosen, priceAmount: 2500 });
      return respond(requestId, fixtures);
    });
    await viewport(1280); await go("/search", ".search-results");
    await until('document.querySelectorAll(".search-card-grid .activity-card").length===24', "24 cards");
    await click('[data-testid="button-load-more"]');
    await until('document.querySelectorAll(".search-card-grid .activity-card").length===30', "load more");
    await fill('[data-testid="select-sort"]', "price");
    await until('document.querySelector(".search-card-grid .activity-card").dataset.testid==="card-experience-9000"', "price order");
    const apiCount = requests.filter(r => new URL(r.url).pathname === "/api/experiences").length;
    await fill('[data-testid="input-min-price"]', "2500");
    await until('document.querySelector("[data-testid=text-results-count]").textContent.includes("15 activities")', "price filter");
    assert.equal(requests.filter(r => new URL(r.url).pathname === "/api/experiences").length, apiCount, "browser-only price/sort");
    await viewport(390); await go("/search?category=recreation&time=tonight&city=Colombo", ".search-results");
    await click('[data-testid="button-toggle-filters"]');
    await fill('.search-filter-sheet [data-testid="select-city"]', "Kandy");
    assert.ok(await js('location.search.includes("Colombo")'), "draft not yet applied");
    await click('[data-testid="button-apply-filters"]');
    await until('location.search.includes("Kandy") && !document.querySelector(".search-filter-sheet")', "apply sheet");
    pass("Browser fixtures: URL filters, 24/30 pagination, price order/client price range and phone draft/apply sheet");
    await viewport(1280); await go(`/activity/${chosen.id}?group=2`, '[data-testid="text-experience-title"]');
    await until('!!document.querySelector("[data-testid=button-slot-9101]")', "fixture sessions");
    assert.ok(await js('document.querySelector("[data-testid=button-slot-9100]").disabled && document.querySelector("[data-testid=button-slot-9101]").disabled'));
    assert.equal(await js('document.querySelector("[data-testid=badge-next-session]").parentElement.dataset.testid'), "button-slot-9102");
    await click('[data-testid="button-show-more-dates"]');
    assert.equal(await js('document.querySelectorAll("[data-testid^=slot-day-]").length'), 14);
    await click('[data-testid="button-slot-9104"]'); await click('[data-testid="button-request-booking"]');
    assert.ok(!await js('document.querySelector("[role=dialog]").textContent.includes("Continue as guest")'));
    await click('[role="dialog"] a[href^="/login"]');
    await until('location.pathname==="/login"', "login next");
    const next = await js('new URLSearchParams(location.search).get("next")');
    assert.ok(next.includes("slot=9104") && next.includes("group=2") && next.includes("booking=1"));
    await fill('[data-testid="input-email"]', "user@freespirit.com");
    await fill('[data-testid="input-password"]', "customer123"); await click('[data-testid="button-login"]');
    await until('!!document.querySelector("[role=dialog] .br-stack input[readonly]")', "same booking identity");
    await click('[role="dialog"] .br-primary'); await click('[data-testid="button-send-request"]');
    await until('document.body.textContent.includes("That session just filled up") && !document.querySelector(".booking-request-stage-three")', "friendly 409");
    assert.ok(!await js('new URLSearchParams(location.search).has("slot")'));
    pass("Group-aware Full/Almost full disable, Next session, more dates, guest hidden, login choice preservation and friendly 409");
    await send("Fetch.disable"); events.delete("Fetch.requestPaused");
    const me = (await api("GET", "/api/auth/me")).body;
    const own = (await api("GET", "/api/bookings?customerProfileId=1")).body;
    for (const booking of own) {
      assert.equal(booking.customerProfileId, me.id);
      assert.ok(!("customer" in booking));
      if (booking.status !== "confirmed") {
        assert.equal(booking.vendor.contactPhone, null); assert.equal(booking.vendor.contactEmail, null);
        assert.equal(booking.experience.locationText, null); assert.equal(booking.experience.city, null);
      }
    }
    const conflict = await api("POST", "/api/bookings", { experienceId: chosen.id, slotId: realSlot.id, qty: realSlot.capacity + 1, customerNote: null });
    assert.equal(conflict.status, 409);
    pass("Real server 409 capacity guard; own-bookings ignores spoofed customer query and strips non-confirmed contacts");
    await go(`/activity/${chosen.id}?slot=${realSlot.id}&group=2&booking=1`, '[role="dialog"]');
    await until('!!document.querySelector("[role=dialog] .br-primary:not([disabled])")', "member identity and selected session");
    await click('[role="dialog"] .br-primary');
    await api("POST", "/api/auth/logout");
    await click('[data-testid="button-send-request"]');
    await until('!!document.querySelector(\'[role="dialog"] a[href^="/login"]\')', "401 identity recovery");
    await click('[role="dialog"] a[href^="/login"]');
    await until('location.pathname==="/login"', "logout next");
    assert.ok((await js('new URLSearchParams(location.search).get("next")')).includes("slot=" + realSlot.id));
    await fill('[data-testid="input-email"]', "user@freespirit.com"); await fill('[data-testid="input-password"]', "customer123"); await click('[data-testid="button-login"]');
    await until('!!document.querySelector("[role=dialog] .br-primary:not([disabled])")', "return after logout");
    pass("Real logout mid-review / 401 restores identity and login returns with session/group");
    const contactFixture = {
      id: 9500, experienceId: chosen.id, customerProfileId: me.id, bookingDate: tomorrow,
      startTime: "19:00", qty: 2, totalAmount: 5000, currencyCode: "LKR", status: "requested", vendorNote: "Test vendor note",
      experience: { title: chosen.title, imageUrl: chosen.imageUrl, city: null, locationText: null },
      vendor: { businessName: "Test vendor", contactPhone: null, contactEmail: null },
    };
    await intercept(async ({ requestId, request }) => {
      if (new URL(request.url).pathname === "/api/bookings" && request.method === "GET") {
        return respond(requestId, [contactFixture, { ...contactFixture, id: 9501, status: "confirmed",
          experience: { ...contactFixture.experience, city: "Colombo", locationText: "Test venue" },
          vendor: { ...contactFixture.vendor, contactPhone: "+94700000000", contactEmail: "vendor@example.invalid" } }]);
      }
      await send("Fetch.continueRequest", { requestId });
    });
    for (const width of [390, 1280, 320]) {
      await viewport(width); await go("/account/bookings", '[data-testid="card-booking-9500"]');
      await click('[data-testid="card-booking-9500"]');
      assert.ok(!await js('document.querySelector("[role=dialog]").textContent.includes("Address and vendor contact")'));
      await click('[role="dialog"] > button:last-child'); await click('[data-testid="card-booking-9501"]');
      assert.ok(await js('document.querySelector("[role=dialog]").textContent.includes("Address and vendor contact") && !!document.querySelector(\'[role=dialog] a[href^="tel:"]\') && !!document.querySelector(\'[role=dialog] a[href^="mailto:"]\')'));
      assert.ok(await js('document.documentElement.scrollWidth<=innerWidth'));
      await shot("contacts-" + width);
    }
    await send("Fetch.disable"); events.delete("Fetch.requestPaused");
    pass("Browser fixtures: requested hides contacts, confirmed address/tel/email detail at 320/390/1280px");
    if (process.argv.includes("--create-booking")) {
      await viewport(390); await go(`/activity/${chosen.id}?slot=${realSlot.id}&group=2&booking=1`, '[role="dialog"]');
      await until('!!document.querySelector("[role=dialog] .br-primary:not([disabled])")', "ready for real request");
      await click('[role="dialog"] .br-primary');
      await fill('[role="dialog"] textarea', "Stage 3 browser verification");
      await click('[data-testid="button-send-request"]');
      await until('!!document.querySelector("[data-testid=booking-sent]")', "sent");
      const sentPayload = JSON.parse(requests.filter(r => r.url.endsWith("/api/bookings") && r.method === "POST").at(-1).postData);
      assert.deepEqual(Object.keys(sentPayload).sort(), ["customerNote", "experienceId", "qty", "slotId"]);
      await click('[data-testid=booking-sent] a[href="/account/bookings"]');
      await until('!!document.querySelector("[data-testid^=card-booking-]")', "my bookings");
      const after = (await api("GET", "/api/bookings")).body;
      const created = after.find(b => b.customerNote === "Stage 3 browser verification" && !own.some(old => old.id === b.id));
      assert.ok(created && created.qty === 2 && created.status === "requested");
      assert.equal(created.totalAmount, chosen.priceAmount * 2);
      await click(`[data-testid="card-booking-${created.id}"]`);
      assert.ok(!await js('document.querySelector("[role=dialog]").textContent.includes("Address and vendor contact")'));
      pass("Real two-person request: Sent, server-computed whole-LKR total, Requested in My bookings; test request retained in DEV");
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify({ checks }, null, 2));
    console.log("Report:", dir);
  } finally { ws?.close(); chrome.kill(); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
