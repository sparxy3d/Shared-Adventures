// Development-only browser checks. Uses existing ws and installed Chromium.
// Creates one disposable member; never changes demo passwords or vendor records.
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error("Run in the development workspace");
const delay = ms => new Promise(r => setTimeout(r, ms));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-one-browser-"));
const chrome = spawn("/repl/tools/bin/chromium", [
  "--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9223",
  "--ignore-certificate-errors",
  `--user-data-dir=${dir}`, "--no-first-run", "about:blank",
], { stdio: "ignore" });
let socket;
const results = [];
let requestId = 0;
const pending = new Map();
const handlers = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ": " + r.exceptionDetails.exception?.description);
  return r.result.value;
}
async function until(expression, message) {
  for (let i = 0; i < 100; i++) {
    if (await js(expression)) return;
    await delay(100);
  }
  throw new Error("Timed out: " + message);
}
async function go(route, selector) {
  const navigation = await send("Page.navigate", { url: origin + route });
  if (navigation.errorText) {
    await delay(1000);
    const diagnostic = await js('JSON.stringify({url:location.href,title:document.title,body:document.body?.innerText.slice(0,300)})');
    throw new Error("Browser navigation failed: " + navigation.errorText + " " + diagnostic);
  }
  await until(`document.querySelector(${JSON.stringify(selector)}) !== null`, route);
  await delay(300);
}
async function fill(selector, value) {
  await js(`(() => {
    const e=document.querySelector(${JSON.stringify(selector)});
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,${JSON.stringify(value)});
    e.dispatchEvent(new Event("input",{bubbles:true}));
    e.dispatchEvent(new Event("change",{bubbles:true}));
  })()`);
}
async function click(selector) {
  const point = await js(`(() => { const e=document.querySelector(${JSON.stringify(selector)}); e.scrollIntoView({block:"center"}); const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
}
async function api(method, url, data) {
  return js(`(async()=>{const r=await fetch(${JSON.stringify(url)},{method:${JSON.stringify(method)},credentials:"include",headers:{"Content-Type":"application/json"},body:${data === undefined ? "undefined" : JSON.stringify(JSON.stringify(data))}});return {status:r.status,body:await r.json()};})()`);
}
function passed(name) { results.push(name); console.log("PASS:", name); }
async function overflow(route, selector) {
  for (const width of [320, 390, 1280]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    await go(route, selector);
    await until('!document.querySelector(\'[role="status"][aria-label^="Loading"]\')', route + " finishes loading");
    assert.ok(await js("document.documentElement.scrollWidth <= window.innerWidth"), `${route} overflow at ${width}`);
    const label = route.replace(/\W/g, "-") + "-" + width;
    const image = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(dir, label + ".png"), Buffer.from(image.data, "base64"));
  }
  passed(route + " no overflow at 320/390/1280px");
}
async function login(email, password, next = "") {
  await go("/login" + next, "#login-email");
  await fill("#login-email", email);
  await fill("#login-password", password);
  await click('[data-testid="button-login"]');
}
(async () => {
  try {
    let target;
    for (let i = 0; i < 50; i++) {
      try { target = (await (await fetch("http://127.0.0.1:9223/json")).json()).find(t => t.type === "page" && !t.url.startsWith("chrome-extension:")); if (target) break; }
      catch {}
      await delay(100);
    }
    if (!target) throw new Error("Chromium failed to start");
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((r, reject) => { socket.once("open", r); socket.once("error", reject); });
    socket.on("message", data => {
      const m = JSON.parse(data.toString());
      if (m.id) {
        const p = pending.get(m.id);
        if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
      } else handlers.get(m.method)?.(m.params);
    });
    await send("Page.enable");
    await send("Runtime.enable");
    const email = `stage-one-${Date.now()}@example.test`;
    const firstPassword = "StageOneTest123!";
    const secondPassword = "StageOneTest456!";
    let testUserId = null;
    if (!process.argv.includes("--roles-only") && !process.argv.includes("--content-only")) {
    await overflow("/login", "#login-email");
    await overflow("/signup", "#signup-name");
    await fill("#signup-name", "Stage One Test");
    await fill("#signup-email", email);
    await fill("#signup-phone", "771234567");
    await fill("#signup-password", firstPassword);
    assert.equal(await js('document.querySelector(\'[data-testid="button-signup"]\').disabled'), true);
    await click("#terms-consent");
    await until('!document.querySelector(\'[data-testid="button-signup"]\').disabled', "consent enables signup");
    await click('[data-testid="button-signup"]');
    await until('location.pathname === "/"', "signup returns home");
    const user = await api("GET", "/api/auth/me");
    assert.equal(user.status, 200); assert.equal(user.body.role, "customer");
    assert.equal(user.body.fullName, "Stage One Test"); assert.equal(user.body.phone, "+94771234567");
    assert.equal("password" in user.body, false);
    passed("Signup/consent/name/mobile/session");
    testUserId = user.body.id;
    await api("POST", "/api/auth/logout");
    assert.equal((await api("POST", "/api/auth/change-password", { currentPassword: firstPassword, newPassword: secondPassword })).status, 401);
    await login(email, firstPassword, "?next=/account/saved");
    await until('location.pathname === "/account/saved"', "member safe next redirect");
    await until('document.body.innerText.includes("Save activities you want to try")', "saved empty state");
    passed("Authenticated password guard and member return-to-page");
    await overflow("/account/bookings", "#booking-panel");
    assert.ok(await js('document.body.innerText.includes("No bookings yet")'));
    await overflow("/account/saved", "h1");
    await overflow("/account/profile", "#fullName");
    await fill("#fullName", "Stage One Updated");
    await fill("#phone", "+94771234567");
    await js('document.querySelector("#home-city").value="Kandy";document.querySelector("#home-city").dispatchEvent(new Event("change",{bubbles:true}))');
    await click('[data-testid="button-save-profile"]');
    await until(`localStorage.getItem("free-spirit-home-city-${testUserId}") === "Kandy"`, "city saved locally");
    await go("/account/profile", "#fullName");
    assert.equal(await js('document.querySelector("#home-city").value'), "Kandy");
    assert.equal(await js('document.querySelector("#email").readOnly'), true);
    passed("Profile save and device-only home city persists");
    assert.equal((await api("POST", "/api/auth/change-password", { currentPassword: firstPassword, newPassword: "short" })).status, 400);
    assert.equal((await api("POST", "/api/auth/change-password", { currentPassword: firstPassword, newPassword: secondPassword, userId: 1 })).status, 400);
    await fill("#current-password", "wrong-password");
    await fill("#new-password", secondPassword);
    await fill("#repeat-password", secondPassword);
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Change password").click()');
    await until('document.body.innerText.includes("Current password is incorrect")', "current password error");
    await fill("#current-password", firstPassword);
    await fill("#repeat-password", "NotMatching123!");
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Change password").click()');
    await until('document.body.innerText.includes("The new passwords don’t match.")', "matching validation");
    await fill("#repeat-password", secondPassword);
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Change password").click()');
    await until('document.body.innerText.includes("Password changed")', "password change");
    assert.equal(await js('document.querySelector("#current-password").value'), "");
    passed("Password validation, current-password verification and successful UI replacement");
    await api("POST", "/api/auth/logout");
    await login(email, firstPassword);
    await until('document.body.innerText.includes("Email or password is incorrect")', "old password fails");
    await login(email, secondPassword);
    await until('location.pathname === "/"', "new password login");
    passed("Old password rejected, new password accepted");
    for (const [oldRoute, newRoute] of [["/bookings","/account/bookings"],["/favorites","/account/saved"],["/account","/account/profile"]]) {
      await go(oldRoute, "h1");
      await until(`location.pathname === ${JSON.stringify(newRoute)}`, "legacy redirect");
    }
    passed("Legacy account routes redirect");
    await api("POST", "/api/auth/logout");
    await go("/account/bookings", "#login-email");
    assert.ok(await js('location.pathname==="/login" && new URLSearchParams(location.search).get("next")==="/account/bookings"'));
    passed("Logged-out member gate preserves next");
    }
    if (process.argv.includes("--roles-only") || process.argv.includes("--content-only")) await go("/login", "#login-email");
    if (!process.argv.includes("--content-only")) {
    for (const [demoEmail, demoPassword, home, menu] of [
      ["admin@freespirit.com", "admin123", "/admin", "Admin console"],
      ["vendor1@freespirit.com", "vendor123", "/vendor", "Vendor dashboard"],
      ["user@freespirit.com", "customer123", "/", "My bookings"],
    ]) {
      await api("POST", "/api/auth/logout");
      await login(demoEmail, demoPassword);
      await until(`location.pathname===${JSON.stringify(home)}`, "demo role landing " + home);
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
      // Landing dashboards need not contain the public header; inspect a member route.
      await go("/account/bookings", "header");
      await until('!!document.querySelector(\'button[aria-label^="Account menu"]\')', "role avatar");
      await click('button[aria-label^="Account menu"]');
      await until(`document.body.innerText.includes(${JSON.stringify(menu)})`, "role menu");
      const text = await js('document.body.innerText');
      for (const item of ["My bookings", "Bucket list", "Profile", "Log out"]) assert.ok(text.includes(item));
      if (home !== "/") assert.ok(text.includes("This page is for members"));
      passed("Demo " + home + " login landing and role menu/gate");
    }
    await api("POST", "/api/auth/logout");
    await go("/login", "#login-email");
    assert.equal(await js('[...document.querySelectorAll("button")].filter(b=>b.textContent.includes("Continue with")).every(b=>b.disabled)'), true);
    await click('button[aria-label="Show password"]');
    assert.equal(await js('document.querySelector("#login-password").type'), "text");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/auth/login" }] });
    handlers.set("Fetch.requestPaused", async ({ requestId }) => send("Fetch.fulfillRequest", {
      requestId, responseCode: 429, responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(JSON.stringify({ message: "Too many attempts" })).toString("base64"),
    }));
    await fill("#login-email", email); await fill("#login-password", secondPassword);
    await click('[data-testid="button-login"]');
    await until('document.body.innerText.includes("Too many attempts — try again in 15 minutes")', "429 message");
    await send("Fetch.disable");
    handlers.clear();
    passed("Show password, disabled social login and mocked 429 inline error");
    for (const route of ["/terms", "/privacy", "/vendor-terms"]) {
      await go(route, ".stage-draft-note");
      assert.ok(await js('document.body.innerText.includes("Draft — final version coming soon")'));
    }
    await go("/forgot-password", ".stage-support-link");
    assert.ok(await js('document.body.innerText.includes("hello@navira-co.com")'));
    for (const route of ["/about", "/contact", "/help"]) await go(route, "h1");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await go("/contact", "header");
    await click('button[aria-label="Open navigation menu"]');
    await until('document.querySelector(\'[role="dialog"]\') !== null', "mobile drawer");
    const drawer = await js('document.querySelector(\'[role="dialog"]\').innerText');
    for (const item of ["Sports","Adventure","Arts & Classes","Wellness","Recreation","For vendors","Log in","Sign up"]) assert.ok(drawer.includes(item));
    passed("Legal/support pages and logged-out phone drawer");
    }
    if (!process.argv.includes("--roles-only")) {
    // Populated bookings are intercepted browser fixtures, never database rows.
    // Saved-item add/remove below uses the real API, on this new test user only.
    await go("/login", "#login-email");
    await api("POST", "/api/auth/logout");
    const fixtureEmail = `stage-one-content-${Date.now()}@example.test`;
    const created = await api("POST", "/api/auth/signup", { fullName: "Stage One Content Test", email: fixtureEmail, phone: "+94771234567", password: firstPassword });
    assert.equal(created.status, 200);
    const experiences = (await api("GET", "/api/experiences")).body;
    const experience = experiences[0];
    assert.ok(experience);
    const fixtures = ["requested", "confirmed", "declined", "cancelled", "completed"].map((status, index) => ({
      id: 9000 + index, experienceId: experience.id, bookingDate: "2030-10-12",
      startTime: "19:30", qty: 2, totalAmount: 2500, status,
      vendorNote: index === 1 ? "Please arrive ten minutes early." : null,
      experience: { title: experience.title, imageUrl: experience.imageUrl },
      vendor: { businessName: experience.vendorName },
    }));
    fixtures.push({ ...fixtures[0], id: 9010, bookingDate: "2020-10-12" });
    handlers.set("Fetch.requestPaused", async ({ requestId }) => send("Fetch.fulfillRequest", {
      requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(JSON.stringify(fixtures)).toString("base64"),
    }));
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/bookings" }] });
    await go("/account/bookings", "#booking-panel");
    await until('document.querySelector(\'[data-testid="card-booking-9000"]\') !== null', "populated bookings");
    assert.equal(await js('document.querySelectorAll(\'[data-testid^="card-booking"]\').length'), 5);
    const bookingText = await js('document.querySelector("#booking-panel").innerText');
    assert.ok(bookingText.includes("LKR 2,500") && bookingText.includes("7:30 PM"));
    assert.ok(!bookingText.includes("2030-10-12"));
    for (const status of ["Requested", "Confirmed", "Declined", "Cancelled", "Completed"]) assert.ok(bookingText.includes(status));
    await click('[data-testid="card-booking-9001"]');
    await until('!!document.querySelector(\'[role="dialog"]\')', "booking details");
    assert.ok(await js('document.querySelector(\'[role="dialog"]\').innerText.includes("Please arrive ten minutes early.")'));
    assert.ok(await js('document.querySelector(\'[role="dialog"]\').innerText.includes("Need to change this? Contact the vendor.")'));
    await send("Browser.grantPermissions", { origin, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] });
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Share with your group").click()');
    await until('document.body.innerText.includes("Activity link copied")', "group sharing clipboard fallback");
    await click('[role="dialog"] > button:last-child');
    await until('!document.querySelector(\'[role="dialog"]\')', "booking details close");
    await click("#tab-past");
    await until('document.querySelector("#tab-past").getAttribute("aria-selected")==="true"', "past tab selected");
    assert.equal(await js('document.querySelectorAll(\'[data-testid^="card-booking"]\').length'), 1);
    await send("Fetch.disable"); handlers.clear();
    passed("Mocked bookings: human Sri Lanka dates, whole LKR, status badges, past/upcoming, details, note and real clipboard share");
    assert.equal((await api("POST", "/api/favorites", { experienceId: experience.id })).status, 200);
    await go("/account/saved", "h1");
    await until(`!!document.querySelector('[data-testid="button-favorite-${experience.id}"]')`, "real saved card");
    await click(`[data-testid="button-favorite-${experience.id}"]`);
    await until('document.body.innerText.includes("Save activities you want to try")', "heart removes save");
    assert.equal((await api("GET", "/api/favorites")).body.length, 0);
    passed("Real API saved-item creation and heart removal");
    await go("/account/profile", "#fullName");
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Delete my account").click()');
    await until('!!document.querySelector(\'[role="alertdialog"]\')', "delete confirmation");
    assert.ok(await js('document.querySelector(\'[role="alertdialog"]\').innerText.includes("does not delete your account automatically")'));
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Keep my account").click()');
    await until('!document.querySelector(\'[role="alertdialog"]\')', "dismiss deletion");
    // Real profile logout should clear the role-aware header immediately.
    await js('[...document.querySelectorAll("button")].find(b=>b.textContent==="Log out").click()');
    await until('location.pathname==="/"', "profile logout");
    await until('!!document.querySelector(\'a[href="/signup"]\')', "logged-out header");
    assert.equal((await api("GET", "/api/auth/me")).status, 401);
    passed("Prototype deletion confirmation/cancel and real UI logout");
    assert.equal((await api("POST", "/api/auth/login", { email: fixtureEmail, password: firstPassword })).status, 200);
    let errorRequests = 0;
    handlers.set("Fetch.requestPaused", async ({ requestId }) => {
      const first = ++errorRequests === 1;
      await send("Fetch.fulfillRequest", { requestId, responseCode: first ? 500 : 200,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(first ? { message: "Test failure" } : [])).toString("base64") });
    });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/bookings" }] });
    await go("/account/bookings", "#booking-panel");
    await until('document.body.innerText.includes("We couldn’t load your bookings.")', "plain error");
    await click('#booking-panel [role="alert"] button');
    await until('document.body.innerText.includes("No bookings yet")', "retry recovers");
    await send("Fetch.disable"); handlers.clear();
    await api("POST", "/api/auth/logout");
    passed("Mocked server failure shows plain error; Retry recovers");
    }
    fs.writeFileSync(path.join(dir, "result.json"), JSON.stringify({ results, testUserId, testEmail: email, screenshots: dir }, null, 2));
    console.log("Browser report and screenshots:", dir);
    console.log("Development checks only; no production requests or demo-password changes.");
  } finally {
    socket?.close();
    chrome.kill();
  }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
