// Authenticated development-only Chromium smoke test. No production URLs or secrets.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const WebSocket = require("ws");
if (!process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev") || process.env.DB_TARGET === "prod") {
  throw Error("Development preview only");
}
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const out = fs.mkdtempSync(path.join(os.tmpdir(), "stage-six-browser-"));
const chrome = spawn("/repl/tools/bin/chromium", ["--headless", "--no-sandbox", "--ignore-certificate-errors",
  "--remote-debugging-port=9228", `--user-data-dir=${out}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let ws, sequence = 0; const pending = new Map();
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(Error("Browser did not respond to " + method)); }, 30000);
    pending.set(id, {
      resolve: result => { clearTimeout(timeout); resolve(result); },
      reject: error => { clearTimeout(timeout); reject(error); },
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, label) {
  for (let n = 0; n < 300; n++) {
    if (await js(expression)) return;
    await sleep(100);
  }
  const state = await js("({path:location.pathname,search:location.search,heading:document.querySelector('h1')?.innerText,hasApp:!!document.querySelector('#root'),oldPage:typeof window.__adminOldPage})");
  throw Error(`Timed out ${label}: ${JSON.stringify(state)}`);
}
async function visit(route, heading) {
  const target = new URL(origin + route);
  const alreadyThere = await js(`location.pathname===${JSON.stringify(target.pathname)} &&
    location.search===${JSON.stringify(target.search)} &&
    document.querySelector('h1')?.innerText.includes(${JSON.stringify(heading)})`);
  if (alreadyThere) return;
  const marker = String(Date.now());
  const previousPath = await js("location.pathname");
  await js(`window.__adminOldPage=${JSON.stringify(marker)}`);
  await send("Page.navigate", { url: origin + route });
  if (previousPath === target.pathname) {
    await sleep(350);
    await send("Page.reload", { ignoreCache: false });
  }
  await until(`window.__adminOldPage!==${JSON.stringify(marker)} && location.pathname===${JSON.stringify(target.pathname)} && !!document.querySelector('h1')`, "document " + route);
  await until(`document.querySelector('h1')?.innerText.includes(${JSON.stringify(heading)})`, "heading " + heading);
}
async function screenshot(name) {
  const { data } = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
  fs.writeFileSync(path.join(out, `${name}.png`), Buffer.from(data, "base64"));
}
async function viewport(width) {
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(200);
}
async function click(selector) {
  const found = await js(`(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)throw Error("No button for selector");node.click();return true})()`);
  assert.ok(found); await sleep(120);
}
async function signIn(email, password) {
  await visit("/login", "Good to have you back");
  const response = await js(`fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
    body:JSON.stringify({email:${JSON.stringify(email)},password:${JSON.stringify(password)}})}).then(r=>r.status)`);
  assert.equal(response, 200);
}
function pass(message) { console.log("PASS:", message); }
(async () => {
  let target;
  for (let attempts = 0; attempts < 50 && !target; attempts++) {
    try {
      target = (await (await fetch("http://127.0.0.1:9228/json/list")).json())
        .find(item => item.type === "page" && item.url === "about:blank");
    } catch { await sleep(150); }
  }
  assert.ok(target?.webSocketDebuggerUrl, "Chromium remote target");
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.once("open", resolve); ws.once("error", reject); });
  ws.on("message", data => {
    const event = JSON.parse(data); if (!event.id) return;
    const call = pending.get(event.id); if (!call) return; pending.delete(event.id);
    event.error ? call.reject(Error(event.error.message)) : call.resolve(event.result);
  });
  ws.on("close", () => {
    for (const { reject } of pending.values()) reject(Error("Browser disconnected during verification"));
    pending.clear();
  });
  await send("Page.enable"); await send("Runtime.enable");
  await viewport(1280);
  await signIn("admin@freespirit.com", "admin123");
  const routes = [
    ["/admin", "Overview"], ["/admin/applications", "Applications"],
    ["/admin/vendors", "Vendors"], ["/admin/listings", "Listings"],
    ["/admin/bookings", "Bookings"], ["/admin/members", "Members"],
    ["/admin/settings", "Settings"],
  ];
  const vendors = await js(`fetch("/api/admin/vendors").then(r=>r.json())`);
  const owner = vendors.find(v => v.ownerEmail === "vendor1@freespirit.com");
  assert.ok(owner);
  if (process.argv.includes("--tabs-only")) {
    const adminListings = await js(`fetch("/api/admin/vendors/${owner.id}/experiences").then(r=>r.json())`);
    const draft = adminListings.find(item => item.title.startsWith("Stage 6 admin review") && item.status === "draft");
    assert.ok(draft);
    const tabWidths = process.argv.includes("--small-only") ? [320] :
      process.argv.includes("--desktop-only") ? [1280] :
      process.argv.includes("--mobile-only") ? [390, 320] : [390, 1280, 320];
    for (const width of tabWidths) {
      await viewport(width);
      for (const tab of ["profile", "listings", "schedule", "bookings", "stats"]) {
        const route = `/admin/vendors/${owner.id}?tab=${tab}`;
        await visit(route, owner.businessName);
        await until("!document.querySelector('.ad-skeleton,.v5-skeleton')", tab + " settled");
        const fits = await js("document.documentElement.scrollWidth <= innerWidth + 1");
        if (!fits) console.error("Overflow elements:", await js(`({
          width:document.documentElement.scrollWidth,
          nodes:[...document.querySelectorAll("body *")].filter(el=>el.getClientRects().length &&
            el.getBoundingClientRect().right > innerWidth+1 &&
            getComputedStyle(el).position !== "fixed").slice(0,12)
            .map(el=>({tag:el.tagName,cls:typeof el.className==="string"?el.className:"",right:Math.round(el.getBoundingClientRect().right)}))
        })`));
        assert.equal(fits, true, `overflow ${width} ${tab}`);
        const wrongEndpoint = await js(`performance.getEntriesByType("resource").some(entry =>
          new URL(entry.name).pathname.startsWith("/api/vendor/"))`);
        assert.equal(wrongEndpoint, false, `vendor endpoint used for admin ${tab}`);
        if (width !== 320) await screenshot(`vendor-${tab}-${width}`);
      }
      for (const listing of ["new", String(draft.id)]) {
        await visit(`/admin/vendors/${owner.id}?tab=listings&listing=${listing}`, owner.businessName);
        await until('!!document.querySelector("#listing-title") && !document.querySelector(".v5-skeleton")', "editor " + listing);
        assert.equal(await js("document.documentElement.scrollWidth <= innerWidth + 1"), true, `overflow ${width} editor ${listing}`);
        if (listing !== "new") assert.equal(await js("document.querySelector('#listing-price')?.value"), "2500");
        if (width !== 320) await screenshot(`editor-${listing}-${width}`);
      }
    }
    pass(`Vendor profile, listings, schedule, bookings, stats and new/edit listing at ${tabWidths.join("/")}px; correct admin endpoints and whole LKR`);
    return;
  }
  routes.push([`/admin/vendors/${owner.id}`, owner.businessName]);
  if (process.argv.includes("--shell320")) {
    await viewport(320);
    for (const [route, heading] of routes) {
      await visit(route, heading);
      await until("!document.querySelector('.ad-skeleton')", route + " ready");
      const fits = await js("document.documentElement.scrollWidth <= innerWidth + 1");
      if (!fits) console.error("Overflow elements:", await js(`({
        width:document.documentElement.scrollWidth,
        nodes:[...document.querySelectorAll("body *")].filter(el=>el.getClientRects().length &&
          el.getBoundingClientRect().right > innerWidth+1 &&
          getComputedStyle(el).position !== "fixed").slice(0,12)
          .map(el=>({tag:el.tagName,cls:typeof el.className==="string"?el.className:"",right:Math.round(el.getBoundingClientRect().right)}))
      })`));
      assert.equal(fits, true, `overflow 320 ${route}`);
    }
    pass("Eight admin console screens fit a 320px viewport without page-level horizontal scrolling");
    return;
  }
  if (!process.argv.includes("--interaction-only")) for (const width of [390, 1280, 320]) {
    await viewport(width);
    for (const [route, heading] of routes) {
      await visit(route, heading);
      await until("!document.querySelector('.ad-skeleton')", "loading complete " + route);
      if (width !== 320) await screenshot(`${route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}-${width}`);
      assert.equal(await js("document.documentElement.scrollWidth <= innerWidth + 1"), true, `overflow ${width} ${route}`);
      assert.equal(await js("!document.querySelector('.ad-error')"), true, `error ${route}`);
    }
    for (const tab of ["listings", "schedule", "bookings", "stats"]) {
      const route = `/admin/vendors/${owner.id}?tab=${tab}`;
      await visit(route, owner.businessName);
      await until("!document.querySelector('.ad-skeleton')", tab + " loaded");
      assert.equal(await js("document.documentElement.scrollWidth <= innerWidth + 1"), true, `overflow ${width} ${tab}`);
      if (width !== 320) await screenshot(`vendor-${tab}-${width}`);
    }
    if (width === 390) {
      await visit("/admin", "Overview");
      await click('button[aria-label="Open menu"]');
      assert.equal(await js("!!document.querySelector('.ad-mobile-drawer a[href=\"/admin/settings\"]')"), true);
    }
  }
  if (!process.argv.includes("--interaction-only")) pass("Eight console screens and four vendor-detail tabs at 320, 390 and 1280; no horizontal page overflow; phone drawer works");
  await viewport(1280);
  await visit("/admin/applications?filter=rejected", "Applications");
  await until("!document.querySelector('.ad-skeleton')", "declined application list");
  assert.ok(await js("document.querySelector('main')?.innerText.includes('Declined')"));
  await visit("/admin/vendors?filter=live", "Vendors");
  await until("!document.querySelector('.ad-skeleton')", "live vendor list");
  assert.ok(await js("document.querySelector('main')?.innerText.includes('Live')"));
  await visit("/admin/listings?filter=published", "Listings");
  await until("!document.querySelector('.ad-skeleton')", "published listing list");
  assert.ok(await js("document.querySelector('main')?.innerText.includes('Published')"));
  await visit("/admin/bookings?filter=this-week", "Bookings");
  await until("!document.querySelector('.ad-skeleton')", "weekly booking list");
  assert.ok(await js("document.querySelector('main')?.innerText.includes('This week')"));
  pass("Overview filtered links resolve to their corresponding live lists");

  // Fresh synthetic application, created while logged out, then handled through the UI.
  const resume = await js(`fetch("/api/admin/vendors").then(r=>r.json()).then(rows=>
    rows.find(row=>row.businessName.startsWith("Stage 6 browser review") && row.verificationStatus==="pending"))`);
  const business = resume?.businessName ?? `Stage 6 browser review ${Date.now()}`;
  const email = resume?.ownerEmail ?? `stage6-browser-${Date.now()}@example.invalid`;
  if (!resume) {
    await visit("/login", "Good to have you back");
    await js('fetch("/api/auth/logout",{method:"POST",credentials:"include"})');
    const posted = await js(`fetch("/api/vendor-applications",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
      body:JSON.stringify({businessName:${JSON.stringify(business)},contactName:"Review Fixture",contactPhone:"+94771234567",
        contactEmail:${JSON.stringify(email)},city:"Colombo",address:"Development verification only",
        activityTypes:["recreation"],capacity:12,typicalPrice:2500,description:"Development-only application",
        website:"@stage6fixture",acceptTerms:true})}).then(r=>r.status)`);
    assert.equal(posted, 200);
    await signIn("admin@freespirit.com", "admin123");
  }
  await visit("/admin/applications?filter=new", "Applications");
  await until(`document.querySelector('main')?.innerText.includes(${JSON.stringify(business)})`, "new application");
  const detail = await js(`(()=>{const row=[...document.querySelectorAll('tr')].find(x=>x.textContent.includes(${JSON.stringify(business)}));const btn=row?.querySelector('button');if(!btn)throw Error('Application detail button not found');btn.click();return true})()`);
  assert.ok(detail);
  await until("!!document.querySelector('[role=dialog]')", "application detail");
  for (const text of ["Review Fixture", "Recreation", "12", "LKR 2,500", "Stage 6"]) {
    assert.ok(await js(`document.querySelector('[role=dialog]')?.innerText.includes(${JSON.stringify(text)})`), text);
  }
  await js("document.querySelector('[role=dialog] button[aria-label=\"Close dialog\"]')?.click()");
  await sleep(120);
  const approve = await js(`(()=>{const row=[...document.querySelectorAll('tr')].find(x=>x.textContent.includes(${JSON.stringify(business)}));const btn=row?.querySelector('[aria-label="Approve application"]');if(!btn)throw Error('Approve button unavailable');btn.click();return true})()`);
  assert.ok(approve);
  await until("document.querySelector('[role=dialog]')?.innerText.includes('Temporary password')", "one-time credentials");
  // The generated password exists only in this process/browser memory, not a screenshot/log.
  const temporary = await js(`[...document.querySelectorAll('[role=dialog] .ad-credential-value')].at(-1)?.innerText.trim()`);
  assert.ok(temporary && temporary.length >= 8);
  assert.ok(await js("document.querySelector('[role=dialog]')?.innerText.includes('WhatsApp')"));
  await js("document.querySelector('[role=dialog] .ad-dialog-actions button:last-child').click()");
  await visit("/login", "Good to have you back");
  await js('fetch("/api/auth/logout",{method:"POST",credentials:"include"})');
  const signed = await js(`fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
    body:JSON.stringify({email:${JSON.stringify(email)},password:${JSON.stringify(temporary)}})}).then(r=>r.status)`);
  assert.equal(signed, 200);
  await visit("/vendor", business);
  pass("Application details, UI approval, one-time credential dialog and successful vendor login");

  await signIn("user@freespirit.com", "customer123");
  await visit("/admin", "This page is for admins");
  assert.ok(await js("document.body.innerText.includes('This page is for admins')"));
  assert.equal(await js("fetch('/api/admin/stats').then(r=>r.status)"), 403);
  await signIn("vendor1@freespirit.com", "vendor123");
  await visit("/admin", "This page is for admins");
  assert.equal(await js("fetch('/api/admin/stats').then(r=>r.status)"), 403);
  pass("Member and vendor see not-allowed state and admin APIs return 403");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  console.log("Screenshots:", out);
  if (ws?.readyState === 1) ws.close();
  chrome.kill();
});
