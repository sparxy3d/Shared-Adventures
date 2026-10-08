// Development-only Chromium checks using installed browser + existing ws.
// No seed, schema, environment or production operations.
const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const WebSocket = require("ws");
if (!process.env.REPLIT_DEV_DOMAIN) throw new Error("Development workspace required");
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "stage-two-browser-"));
const chrome = spawn("/repl/tools/bin/chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--ignore-certificate-errors", "--remote-debugging-port=9224", `--user-data-dir=${dir}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const delay = ms => new Promise(r => setTimeout(r, ms));
let socket, sequence = 0, cleanupFavorite = null;
const pending = new Map(), events = new Map(), checks = [], requests = [], errors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function js(expression) {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
async function until(expression, label) {
  for (let i = 0; i < 150; i++) { if (await js(expression)) return; await delay(100); }
  throw new Error("Timed out: " + label);
}
async function go(route, selector = ".home-discovery-card") {
  const r = await send("Page.navigate", { url: origin + route });
  if (r.errorText) throw new Error(r.errorText);
  await until(`!!document.querySelector(${JSON.stringify(selector)})`, route);
}
async function click(selector) {
  const p = await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...p, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...p, button: "left", clickCount: 1 });
}
async function textClick(selector, text) {
  const found = await js(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!e)return false;e.click();return true;})()`);
  assert.ok(found, "Missing action: " + text);
  await delay(100);
}
async function fill(selector, value) {
  await js(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));})()`);
}
async function api(method, url, data) {
  return js(`(async()=>{const r=await fetch(${JSON.stringify(url)},{method:${JSON.stringify(method)},credentials:"include",headers:{"Content-Type":"application/json"},body:${data === undefined ? "undefined" : JSON.stringify(JSON.stringify(data))}});return {status:r.status,body:await r.json()};})()`);
}
function pass(name) { checks.push(name); console.log("PASS:", name); }
async function settledIdeas() {
  await until('!!document.querySelector(".home-ideas") && !document.querySelector(".home-ideas .home-card-skeleton")', "ideas settle");
  await delay(100);
}
async function submit(physical = false) {
  if (physical) await click(".home-discovery-actions > button");
  else await js('document.querySelector(".home-discovery-actions > button").click()');
  await delay(150);
  await settledIdeas();
}
async function screenshot(name) {
  const image = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(path.join(dir, name + ".png"), Buffer.from(image.data, "base64"));
}
async function intercept(handler) {
  events.set("Fetch.requestPaused", handler);
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/experiences*" }] });
}
async function respond(id, status, body) {
  await send("Fetch.fulfillRequest", { requestId: id, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
}
(async () => {
  try {
    let target;
    for (let i = 0; i < 50; i++) {
      try { target = (await (await fetch("http://127.0.0.1:9224/json")).json()).find(t => t.type === "page" && !t.url.startsWith("chrome-extension:")); if (target) break; } catch {}
      await delay(100);
    }
    assert.ok(target, "Chromium page target");
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    socket.on("message", data => {
      const m = JSON.parse(data.toString());
      if (m.id) { const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } }
      else events.get(m.method)?.(m.params);
    });
    await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
    events.set("Network.requestWillBeSent", ({ request }) => { if (request.url.includes("/api/")) requests.push(request.url); });
    events.set("Runtime.exceptionThrown", ({ exceptionDetails }) => errors.push(exceptionDetails.text));
    if (!process.argv.includes("--fixtures-only")) {
    for (const width of [390, 1280, 320]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: width < 600 });
      await go("/");
      await until('document.querySelector(".home-discovery-actions > button").textContent.includes("idea")', "live count");
      await delay(1200);
      assert.ok(await js("document.documentElement.scrollWidth <= innerWidth"), "overflow " + width);
      if (width < 600) {
        assert.ok(await js('document.querySelector(".home-hero").getBoundingClientRect().height <= innerHeight*.55+1'), "hero cap");
        assert.ok(await js('document.querySelector("#home-city").getBoundingClientRect().bottom < innerHeight'), "first field above fold");
      }
      await submit(true);
      assert.ok(await js('document.querySelector(".home-ideas h2").textContent.includes("for 2 people right now")'), "first tap answer");
      await screenshot("homepage-" + width);
      const body = await js("document.body.innerText");
      assert.ok(!/ratings?|review counts?|happy groups|4\.9 average|testimonials?|launch offer|popular/i.test(body), "fabricated social proof");
      pass("Real API first-tap default ideas; responsive " + width + "px");
    }
    await textClick('[aria-label="When"] button', "Tonight"); await submit();
    assert.ok(await js('document.querySelector(".home-ideas h2").textContent.includes("tonight")'));
    await textClick('[aria-label="When"] button', "Weekend"); await submit();
    assert.ok(await js('document.querySelector(".home-ideas h2").textContent.includes("this weekend")'));
    for (const group of ["1", "2", "3–5", "6+"]) {
      await textClick('[aria-label="Group size"] button', group); await submit();
      assert.ok(await js(`document.querySelector(".home-ideas h2").textContent.includes(${JSON.stringify(group === "1" ? "1 person" : group + " people")})`), "Group " + group + ": " + await js('document.querySelector(".home-ideas h2").textContent'));
    }
    await click(".home-date-trigger");
    await until('!document.querySelector(\'input[type="date"]\').hidden', "date visible");
    const min = await js('document.querySelector(\'input[type="date"]\').min');
    await fill('input[type="date"]', min);
    await submit();
    assert.ok(await js('document.querySelector(".home-ideas h2").textContent.includes(" on ")'));
    await fill("#home-city", "Kandy"); await textClick('[aria-label="When"] button', "Now"); await submit();
    assert.ok(await js('document.querySelector(".home-ideas h2").textContent.includes("for 6+ people right now in Kandy")'));
    pass("Real API Tonight/Weekend/date, all four groups and city headings");
    await js('window.geoCalls=0;navigator.geolocation.getCurrentPosition=(ok,bad)=>{window.geoCalls++;bad({code:1})}');
    assert.equal(await js("window.geoCalls"), 0);
    await click(".home-locate");
    await until('document.body.innerText.includes("Couldn\'t get your location — pick a city")', "location refusal");
    assert.equal(await js("document.activeElement.id"), "home-city");
    await js('navigator.geolocation.getCurrentPosition=ok=>ok({coords:{latitude:6.9271,longitude:79.8612}})');
    await click(".home-locate");
    await until('document.querySelector("#home-city").value==="Colombo"', "nearest city");
    assert.ok(!requests.some(url => /latitude|longitude|lat=|lng=/.test(url)), "coordinates not transmitted");
    pass("Permission-on-tap location refusal/focus and local-only nearest-city mapping");
    } else await go("/");
    const real = (await api("GET", "/api/experiences")).body;
    assert.ok(real.length);
    const base = real[0];
    const sriLankaParts = minutes => js(`(()=>{const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Colombo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(Date.now()+${minutes}*60000));const part=t=>p.find(v=>v.type===t).value;return {date:part("year")+"-"+part("month")+"-"+part("day"),time:part("hour")+":"+part("minute")};})()`);
    const startA = await sriLankaParts(30), startB = await sriLankaParts(45), startC = await sriLankaParts(15);
    const today = startA.date;
    const fixture = (id, time, city = "Colombo", date = today) => ({ ...base, id, city, title: "Browser fixture " + id, priceAmount: 2500, rating: 49, reviewCount: 999, offerLabel: "Fake discount must not render", nextSession: { slotId: id, date, startTime: time, endTime: "23:00", spotsLeft: 8 } });
    const a = fixture(9001, startA.time), b = fixture(9002, startB.time, "Colombo", startB.date), c = fixture(9003, startC.time, "Colombo", startC.date);
    let surpriseCalls = 0;
    await intercept(async ({ requestId, request }) => {
      const url = new URL(request.url);
      if (url.pathname.endsWith("/surprise")) {
        surpriseCalls++;
        if (url.searchParams.get("city") === "Kandy") return respond(requestId, 404, { message: "Nothing matches those choices yet" });
        return respond(requestId, 200, url.searchParams.get("exclude") ? b : a);
      }
      if (url.pathname.endsWith("/featured")) return respond(requestId, 200, [a, b, c]);
      if (url.searchParams.get("city") === "Kandy" && url.searchParams.has("time")) return respond(requestId, 200, []);
      return respond(requestId, 200, url.searchParams.get("city") === "Kandy" ? [fixture(9004, startA.time, "Kandy")] : [a]);
    });
    await go("/"); await delay(800); await submit();
    assert.ok(await js('document.querySelector(".home-ideas h2").textContent.startsWith("1 thing for 2 people")'));
    const moreIds = await js('[...document.querySelectorAll(".home-featured .activity-card")].map(e=>e.dataset.testid)');
    assert.deepEqual(moreIds, ["card-experience-9003", "card-experience-9002"]);
    assert.ok(await js('[...document.querySelectorAll(".activity-card-badges")].every(e=>e.children.length<=2)'));
    assert.ok(await js('document.querySelector(".activity-card").innerText.includes("LKR 2,500 / person")'));
    assert.ok(!await js('document.body.innerText.includes("Fake discount") || document.body.innerText.includes("999") || document.body.innerText.includes("4.9")'));
    const shuffleStarted = Date.now();
    await textClick(".home-hero-actions button", "Surprise Us");
    await until('!!document.querySelector(\'[role="dialog"] .activity-card\')', "surprise match");
    assert.ok(Date.now() - shuffleStarted >= 550, "default shuffle delay");
    assert.ok(await js('!!document.querySelector(\'[role="dialog"] [data-testid="card-experience-9001"]\')'));
    await textClick('[role="dialog"] button', "Try another");
    await until('!!document.querySelector(\'[role="dialog"] [data-testid="card-experience-9002"]\')', "exclude result");
    assert.ok(requests.some(url => url.includes("exclude=9001")));
    await click('[role="dialog"] > button:last-child');
    await fill("#home-city", "Kandy"); await textClick('[aria-label="Group size"] button', "6+"); await submit();
    await until('!!document.querySelector(".home-empty")', "empty choices");
    await until('!!document.querySelector(".home-next-available")', "next available");
    assert.ok(await js('document.querySelector(".home-next-available").textContent.includes("Next available")'));
    await textClick(".home-discovery-actions button", "Surprise Us");
    await until('document.querySelector(\'[role="dialog"]\')?.innerText.includes("Nothing matches those choices yet")', "404 surprise");
    await textClick('[role="dialog"] button', "Try Weekend");
    await until('document.querySelector(\'[role="dialog"]\')?.innerText.includes("Nothing matches those choices yet")', "weekend retry");
    await click('[role="dialog"] > button:last-child');
    await textClick(".home-empty-actions button", "Any city"); await settledIdeas();
    assert.ok(await js('!document.querySelector(".home-ideas h2").textContent.includes(" in ")'));
    pass("Browser fixtures: singular/empty grammar, truthful metadata, unique soonest featured, matched surprise/exclude/404 and fallback actions");
    let failResponses = true, responseDelay = 500;
    await intercept(async ({ requestId, request }) => {
      await delay(responseDelay);
      if (failResponses) return respond(requestId, 500, { message: "Test failure" });
      return respond(requestId, 200, new URL(request.url).pathname.endsWith("/surprise") ? a : [a]);
    });
    await go("/");
    await until('!!document.querySelector(".home-card-skeleton")', "grey loading skeleton");
    assert.equal(await js('document.querySelector(".home-discovery-actions > button").textContent.trim()'), "Show ideas");
    await js('document.querySelector(".home-discovery-actions > button").click()');
    await until('!!document.querySelector(".home-ideas .home-inline-error")', "plain error");
    assert.equal(await js('document.querySelector(".home-ideas h2").textContent'), "Your ideas");
    failResponses = false;
    await textClick(".home-ideas .home-inline-error button", "Retry");
    await until('!!document.querySelector(".home-ideas .activity-card")', "retry succeeds");
    pass("Grey skeletons, no invented loading/error count, plain API error and working Retry");
    responseDelay = 120;
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await go("/");
    await until('!!document.querySelector(".home-featured .activity-card") || !!document.querySelector(".home-light-empty")', "reduced-motion home");
    const reducedStarted = Date.now();
    await textClick(".home-hero-actions button", "Surprise Us");
    await until('!!document.querySelector(\'[role="dialog"] .activity-card\')', "reduced-motion reveal");
    assert.ok(Date.now() - reducedStarted < 500, "no shuffle delay with reduced motion");
    await click('[role="dialog"] > button:last-child');
    pass("Reduced-motion preference removes the shuffle delay");
    await send("Fetch.disable"); events.delete("Fetch.requestPaused");
    await go("/"); await delay(1500);
    const cards = await js('[...document.querySelectorAll(".activity-card")].map(e=>e.dataset.testid)');
    assert.ok(cards.length, "real upcoming cards exist");
    await click(".activity-card-heart");
    await until('location.pathname==="/login"', "guest heart login");
    pass("Logged-out heart redirects to login");
    await api("POST", "/api/auth/login", { email: "user@freespirit.com", password: "customer123" });
    const user = (await api("GET", "/api/auth/me")).body;
    await js(`localStorage.setItem("free-spirit-home-city-${user.id}","Colombo")`);
    await go("/"); await until('document.querySelector("#home-city").value==="Colombo"', "saved home city");
    const before = (await api("GET", "/api/favorites")).body;
    const ids = before.map(f => f.experienceId);
    const unsaved = real.find(a => !ids.includes(a.id) && a.nextSession);
    if (unsaved) {
      await go("/search", `[data-testid="button-favorite-${unsaved.id}"]`);
      await until(`!document.querySelector('[data-testid="button-favorite-${unsaved.id}"]').disabled`, "favorite ready");
      cleanupFavorite = unsaved.id;
      await click(`[data-testid="button-favorite-${unsaved.id}"]`);
      await until(`document.querySelector('[data-testid="button-favorite-${unsaved.id}"]').getAttribute("aria-pressed")==="true"`, "save");
      await click(`[data-testid="button-favorite-${unsaved.id}"]`);
      await until(`document.querySelector('[data-testid="button-favorite-${unsaved.id}"]').getAttribute("aria-pressed")==="false"`, "remove");
      cleanupFavorite = null;
      assert.deepEqual((await api("GET", "/api/favorites")).body.map(f => f.experienceId).sort(), ids.sort());
      pass("Shared search card real save/remove restores favorites; member city prefill");
      await go(`/experience/${unsaved.id}`, "h1");
      await until(`location.pathname==="/activity/${unsaved.id}"`, "canonical redirect");
      pass("Legacy experience URL redirects to unchanged activity detail");
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(dir, "report.json"), JSON.stringify({ checks, screenshots: dir }, null, 2));
    console.log("Report:", dir);
  } finally {
    if (cleanupFavorite !== null && socket?.readyState === 1) await api("DELETE", `/api/favorites/${cleanupFavorite}`).catch(() => {});
    socket?.close(); chrome.kill();
  }
})().catch(e => { console.error(e.stack); process.exitCode = 1; });
