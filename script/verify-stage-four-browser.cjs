// Development-only browser checks. --apply creates ONE labelled pending applicant.
// --live-actions creates two labelled requests and restores their spots afterward.
// Vendor action fixtures are intercepted only in this browser, not saved to the DB.
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict"), fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const WebSocket = require("ws");
if (!process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev")) throw Error("Development workspace required");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-four-browser-"));
const chrome = spawn("/repl/tools/bin/chromium", ["--headless", "--no-sandbox", "--ignore-certificate-errors", "--remote-debugging-port=9226", `--user-data-dir=${dir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const delay = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0; const pending = new Map(), events = new Map(), errors = [], checks = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => { const id = ++seq; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
}
async function js(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function until(expression, label) {
  for (let i = 0; i < 150; i++) { if (await js(expression)) return; await delay(100); }
  throw Error("Timed out: " + label);
}
async function go(route, selector) {
  await send("Page.navigate", { url: origin + route });
  await until(`!!document.querySelector(${JSON.stringify(selector)})`, route);
}
async function click(selector) {
  await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.disabled)throw Error("Control unavailable");e.click()})()`);
  await delay(150);
}
async function textButton(scope, text) {
  await js(`(()=>{const b=Array.from(document.querySelector(${JSON.stringify(scope)}).querySelectorAll("button")).find(e=>e.innerText.trim()===${JSON.stringify(text)});if(!b||b.disabled)throw Error("Button unavailable");b.click()})()`);
  await delay(150);
}
async function fill(selector, value) {
  await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error("Field unavailable");const p=e.tagName==="SELECT"?HTMLSelectElement.prototype:e.tagName==="TEXTAREA"?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(p,"value").set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
  await delay(80);
}
async function api(method, url, body) {
  return js(`(async()=>{const r=await fetch(${JSON.stringify(url)},{method:${JSON.stringify(method)},credentials:"include",headers:{"Content-Type":"application/json"},body:${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))}});return {status:r.status,body:await r.json()}})()`);
}
async function viewport(width) { await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 }); }
async function shot(name) { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(dir, name + ".png"), Buffer.from(r.data, "base64")); }
async function noOverflow() { assert.ok(await js("document.documentElement.scrollWidth<=innerWidth"), "No horizontal page overflow"); }
const pass = label => { checks.push(label); console.log("PASS:", label); };
async function login(email, password) { assert.equal((await api("POST", "/api/auth/login", { email, password })).status, 200); }
async function form(email) {
  for (const [name, value] of Object.entries({
    businessName: "Stage 4 browser verification studio", contactName: "Stage 4 browser verification",
    contactPhone: "770000000", contactEmail: email, city: "Colombo", address: "Development test address",
    description: "Synthetic browser application verification", capacity: "8", typicalPrice: "2500",
    website: "@stage4_browser", mapsLink: "https://www.google.com/maps",
  })) await fill(`form [name="${name}"]`, value);
  await click('.v4-category-choice input');
  await click('[name="acceptTerms"]');
}
(async () => {
  try {
    let target;
    for (let i = 0; i < 50; i++) { try { target = (await (await fetch("http://127.0.0.1:9226/json")).json()).find(t => t.type === "page"); if (target) break; } catch {} await delay(100); }
    assert.ok(target); ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
    ws.on("message", data => { const m = JSON.parse(data); if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); } } else events.get(m.method)?.(m.params); });
    await send("Page.enable"); await send("Runtime.enable");
    await send("Page.bringToFront"); await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    events.set("Runtime.exceptionThrown", ({ exceptionDetails }) => errors.push(exceptionDetails.text));
    if (process.argv.includes("--login-return")) {
      await go("/vendor/bookings", '[data-testid="button-login"]');
      assert.equal(await js('new URLSearchParams(location.search).get("next")'), "/vendor/bookings");
      await fill('[data-testid="input-email"]', "vendor1@freespirit.com");
      await fill('[data-testid="input-password"]', "vendor123");
      await click('[data-testid="button-login"]');
      await until('location.pathname==="/vendor/bookings" && !!document.querySelector(".v-booking-controls")', "vendor login returns to bookings");
      pass("Real vendor login form returns to requested vendor page");
      assert.deepEqual(errors, []); return;
    }
    if (process.argv.includes("--layout-only")) {
      for (const width of [320, 390, 1280]) {
        await viewport(width); await go("/for-vendors", "#vendor-pitch-title"); await noOverflow();
        assert.equal(await js('getComputedStyle(document.querySelector(".v4-button--orange")).color'), "rgb(23, 23, 23)");
        await shot("final-pitch-" + width);
      }
      await login("vendor1@freespirit.com", "vendor123");
      for (const width of [320, 390, 1280]) {
        await viewport(width);
        for (const [route, selector] of [["/vendor", ".v-month-grid"], ["/vendor/bookings", ".v-booking-controls"]]) {
          await go(route, selector);
          if (route.endsWith("/bookings")) await until('!document.querySelector(".v-booking-skeletons") && !!document.querySelector(".v-table-wrap, .v-empty")', "loaded booking layout");
          await noOverflow(); await shot("final-" + route.split("/").pop() + "-" + width);
        }
      }
      assert.deepEqual(errors, []);
      pass("Final public/vendor layouts at320/390/1280, dark primary text and no page overflow");
      console.log("Screenshots/report:", dir); return;
    }
    if (!process.argv.includes("--fixtures-only") && !process.argv.includes("--live-actions")) {
    for (const width of [320, 390, 1280]) {
      await viewport(width); await go("/for-vendors", "#vendor-pitch-title"); await noOverflow();
      const copy = await js("document.querySelector('main').innerText");
      assert.ok(copy.includes("Simple commission only on completed bookings"));
      assert.ok(!/testimonials|free listings|happy groups|\d[\d,.]* customers/i.test(copy));
      assert.equal(await js('document.querySelectorAll(".v4-category-choice").length'), 5);
      await shot("pitch-" + width);
    }
    await click('[data-testid="button-apply-to-list"]');
    await until('document.querySelector("form").getBoundingClientRect().top<innerHeight', "scroll to form");
    await go("/for-vendors/apply", 'form');
    await js('document.querySelector("[name=businessName]").focus();document.querySelector("[name=businessName]").dispatchEvent(new FocusEvent("focusout",{bubbles:true}))');
    await until('!!document.querySelector("#vendor-error-businessName")', "blur validation");
    if (process.argv.includes("--apply")) {
      await form(`stage4-browser-${Date.now()}@example.invalid`);
      await click('[data-testid="button-submit-vendor-application"]');
      await until('!!document.querySelector("[data-testid=vendor-application-success]")', "anonymous thank-you");
      assert.ok((await js("document.body.innerText")).includes("Thanks — we'll call you to talk it through."));
      pass("Real anonymous browser application/thank-you, one labelled pending development applicant retained");
    }
    await go("/for-vendors/apply", "form"); await form("user@freespirit.com");
    await click('[data-testid="button-submit-vendor-application"]');
    await until('document.body.innerText.includes("This email already has an account — log in first, then apply")', "duplicate-email error");
    pass("Pitch at320/390/1280, inline form/scroll/blur, five categories, real duplicate-email error");

    await login("user@freespirit.com", "customer123");
    await go("/vendor", "h1");
    assert.ok((await js("document.body.innerText")).includes("This page is for vendors"));
    const own = (await api("GET", "/api/bookings")).body;
    const declined = own.find(b => b.customerNote === "Stage 4 verification decline");
    await go("/account/bookings", `[data-testid="card-booking-${declined.id}"]`);
    await click(`[data-testid="card-booking-${declined.id}"]`);
    await until('document.body.innerText.includes("Session is full — sorry, fully booked")', "member decline note");
    await login("admin@freespirit.com", "admin123"); await go("/vendor", "h1");
    assert.ok((await js("document.body.innerText")).includes("This page is for vendors"));
    await api("POST", "/api/auth/logout"); await go("/vendor/bookings", '[data-testid="button-login"]');
    assert.equal(await js('new URLSearchParams(location.search).get("next")'), "/vendor/bookings");
    pass("Member/admin vendor not-allowed, guest login return, real My bookings decline status/note");

    await login("vendor1@freespirit.com", "vendor123");
    await go("/vendor", ".v-month-grid");
    const dashboard = (await api("GET", "/api/vendor/dashboard")).body;
    assert.equal(await js('document.querySelector(".v-month-grid div strong").textContent'), String(dashboard.month.requests));
    for (const width of [320, 390, 1280]) {
      await viewport(width); await go("/vendor", ".v-month-grid"); await noOverflow(); await shot("dashboard-" + width);
      await go("/vendor/bookings", ".v-booking-controls"); await noOverflow(); await shot("bookings-" + width);
      assert.ok(!/\d{4}-\d{2}-\d{2}/.test(await js("document.querySelector('.v-page').innerText")));
      if (width < 768) { await click(".vs-mobile-nav button"); assert.ok(await js('!!document.querySelector(".vs-more-menu")')); }
    }
    await go("/vendor/experiences", ".vs-main");
    assert.ok(await js('Array.from(document.querySelectorAll(".stage-shell")).every(e=>getComputedStyle(e).display==="none")'));
    pass("Real vendor dashboard/bookings/month/next7/shell, no ISO dates/overflow at320/390/1280");
    } else {
      await go("/login", '[data-testid="input-email"]');
      await login("vendor1@freespirit.com", "vendor123");
    }

    const rows = (await api("GET", "/api/vendor/bookings")).body;
    if (process.argv.includes("--live-actions")) {
      const activities = (await api("GET", "/api/vendor/experiences")).body;
      let activity, slot;
      for (const e of activities.filter(e => e.status === "published")) {
        const slots = (await api("GET", `/api/experiences/${e.id}/slots`)).body;
        const candidate = slots.find(s => s.status === "open" && s.capacity >= 4 && Date.parse(`${s.date}T${s.startTime.slice(0, 5)}:00+05:30`) > Date.now() + 60000);
        if (candidate) { activity = e; slot = candidate; break; }
      }
      assert.ok(slot, "Future owned slot with four free spots");
      const capacityBefore = slot.capacity, created = [];
      let nativeConfirmed = false;
      events.set("Page.javascriptDialogOpening", async ({ message }) => {
        assert.equal(message, "The member will be told"); nativeConfirmed = true;
        await send("Page.handleJavaScriptDialog", { accept: true });
      });
      try {
        await login("user@freespirit.com", "customer123");
        for (const note of ["Stage 4 live browser confirm/cancel", "Stage 4 live browser decline"]) {
          const r = await api("POST", "/api/bookings", { experienceId: activity.id, slotId: slot.id, qty: 2, customerNote: note });
          assert.equal(r.status, 200); created.push(r.body.id);
        }
        await login("vendor1@freespirit.com", "vendor123");
        await viewport(390); await go("/vendor/bookings", `[data-testid="vendor-booking-card-${created[0]}"]`);
        await click(`[data-testid="vendor-booking-card-${created[0]}"] .v-card-session`);
        await until('!!document.querySelector(".v-detail-modal")', "real requested detail");
        assert.equal(await js('document.querySelector(".v-contact")'), null);
        await textButton(".v-detail-modal", "Confirm");
        await until('!!document.querySelector(".v-contact a[href^=mailto]")', "real confirmed contacts");
        await textButton(".v-detail-modal", "Cancel booking");
        await until('document.querySelector(".v-detail-modal").innerText.includes("Cancelled")', "real cancellation");
        assert.ok(nativeConfirmed);
        await click(".v-close-detail");
        await click(`[data-testid="vendor-booking-card-${created[1]}"] .v-card-session`);
        await until('!!document.querySelector(".v-detail-modal")', "real second request");
        await textButton(".v-detail-modal", "Decline");
        await fill(".v-detail-modal select", "Session is full");
        await fill(".v-detail-modal textarea", "sorry, fully booked");
        await textButton(".v-detail-modal", "Decline request");
        await until('document.querySelector(".v-detail-modal").innerText.includes("Session is full — sorry, fully booked")', "real decline note");
        await noOverflow(); await shot("real-booking-detail-390");
        await login("user@freespirit.com", "customer123");
        const mine = (await api("GET", "/api/bookings")).body;
        assert.equal(mine.find(b => b.id === created[0]).status, "cancelled");
        assert.equal(mine.find(b => b.id === created[1]).status, "declined");
        await go("/account/bookings", `[data-testid="card-booking-${created[1]}"]`);
        await click(`[data-testid="card-booking-${created[1]}"]`);
        await until('document.body.innerText.includes("Session is full — sorry, fully booked")', "real member note/status");
        pass("Real member requests -> vendor UI confirm/decline/cancel -> member status/note; no contacts before confirmation");
      } finally {
        // Only restore these labelled test requests if a UI assertion stopped early.
        if (created.length) {
          await login("vendor1@freespirit.com", "vendor123");
          const current = (await api("GET", "/api/vendor/bookings")).body;
          for (const id of created) {
            const booking = current.find(b => b.id === id);
            if (booking?.status === "requested") assert.equal((await api("PATCH", `/api/vendor/bookings/${id}`, { status: "declined", declineReason: "Other", vendorNote: "Browser verification cleanup" })).status, 200);
            if (booking?.status === "confirmed") assert.equal((await api("PATCH", `/api/vendor/bookings/${id}`, { status: "cancelled" })).status, 200);
          }
          const after = (await api("GET", `/api/experiences/${activity.id}/slots`)).body.find(s => s.id === slot.id);
          assert.equal(after.capacity, capacityBefore); pass("Real browser test spot capacity restored exactly");
        }
      }
      assert.deepEqual(errors, []); console.log("Screenshots/report:", dir); return;
    }
    const base = rows.find(b => b.customerNote === "Stage 4 verification confirm/cancel");
    assert.ok(base);
    let fixture = [1, 2].map(n => ({ ...base, id: 910000 + n, status: "requested", spotsLeft: 4,
      customer: { fullName: "Browser fixture member " + n, email: null, phone: null } }));
    const bodies = []; let cancelDialog = false;
    events.set("Page.javascriptDialogOpening", async ({ message }) => { assert.equal(message, "The member will be told"); cancelDialog = true; await send("Page.handleJavaScriptDialog", { accept: true }); });
    events.set("Fetch.requestPaused", async ({ requestId, request }) => {
      const url = new URL(request.url);
      let body;
      if (request.method === "PATCH") {
        const data = JSON.parse(request.postData); bodies.push(data);
        const id = +url.pathname.split("/").pop();
        fixture = fixture.map(b => b.id !== id ? b : ({ ...b, status: data.status,
          customer: { ...b.customer, email: data.status === "confirmed" ? "member@example.invalid" : null, phone: data.status === "confirmed" ? "+94770000000" : null },
          vendorNote: data.declineReason ? `${data.declineReason}${data.vendorNote ? " — " + data.vendorNote : ""}` : b.vendorNote }));
        body = fixture.find(b => b.id === id);
      } else if (url.pathname === "/api/vendor/bookings") body = fixture;
      else { await send("Fetch.continueRequest", { requestId }); return; }
      await send("Fetch.fulfillRequest", { requestId, responseCode: 200, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
    });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/vendor/bookings*" }] });
    console.log("Checking intercepted vendor actions (no booking writes)");
    await viewport(390); await go("/vendor/bookings", ".v-card-session");
    await click(".v-card-session"); await until('!!document.querySelector(".v-detail-modal")', "detail");
    assert.equal(await js('document.querySelector(".v-contact")'), null);
    assert.ok(await js('document.activeElement.classList.contains("v-close-detail")'));
    assert.ok((await js('document.querySelector(".v-other-bookings").innerText')).includes("Browser fixture member 2"));
    await textButton(".v-detail-modal", "Confirm");
    await until('!!document.querySelector(".v-contact a[href^=mailto]")', "confirmed contacts");
    assert.equal(bodies[0].status, "confirmed");
    await textButton(".v-detail-modal", "Cancel booking");
    await until('document.querySelector(".v-detail-modal").innerText.includes("Cancelled")', "cancelled UI");
    assert.ok(cancelDialog);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await until('!document.querySelector(".v-detail-modal")', "Escape closes");
    await click(".v-card-session"); await until('!!document.querySelector(".v-detail-modal")', "second detail");
    await textButton(".v-detail-modal", "Decline");
    assert.ok(await js('Array.from(document.querySelector(".v-detail-modal").querySelectorAll("button")).find(b=>b.innerText==="Decline request").disabled'));
    await fill(".v-detail-modal select", "Session is full"); await fill(".v-detail-modal textarea", "sorry, fully booked");
    await textButton(".v-detail-modal", "Decline request");
    await until('document.querySelector(".v-detail-modal").innerText.includes("Session is full — sorry, fully booked")', "decline note");
    assert.equal(bodies[2].declineReason, "Session is full"); await noOverflow();
    await send("Fetch.disable");
    assert.deepEqual(errors, []);
    pass("Browser-only action fixtures: hidden/confirmed contacts, other session bookings, confirm/decline/cancel payloads, reason required, native confirmation and modal focus/Escape");
    console.log("Screenshots/report:", dir);
  } finally {
    fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify({ checks, errors }, null, 2));
    ws?.close(); chrome.kill("SIGTERM");
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
