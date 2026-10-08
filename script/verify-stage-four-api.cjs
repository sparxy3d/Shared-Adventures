// Explicit development-only mutation checks. Leaves a labelled approved applicant
// and two declined/cancelled test bookings; all reserved spots are restored.
const assert = require("node:assert/strict");
const domain = process.env.REPLIT_DEV_DOMAIN;
if (!domain?.endsWith(".replit.dev")) throw new Error("Development workspace required");
const origin = `https://${domain}`;
function client() {
  let cookie = "";
  return async (method, route, body) => {
    const response = await fetch(origin + route, {
      method, headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const raw = response.headers.getSetCookie()[0];
    if (raw) cookie = raw.split(";")[0];
    return { status: response.status, body: await response.json() };
  };
}
const pass = label => console.log("PASS:", label);
(async () => {
  const anon = client(), admin = client(), member = client(), vendor = client();
  if (process.argv.includes("--read-only")) {
    assert.equal((await member("POST", "/api/auth/login", { email: "user@freespirit.com", password: "customer123" })).status, 200);
    assert.equal((await vendor("POST", "/api/auth/login", { email: "vendor1@freespirit.com", password: "vendor123" })).status, 200);
    const rows = (await vendor("GET", "/api/vendor/bookings")).body;
    for (const row of rows.filter(b => b.status !== "confirmed")) {
      assert.equal(row.customer.email, null); assert.equal(row.customer.phone, null);
    }
    const own = (await member("GET", "/api/bookings")).body;
    assert.ok(own.some(b => b.customerNote === "Stage 4 verification confirm/cancel" && b.status === "cancelled"));
    assert.ok(own.some(b => b.customerNote === "Stage 4 verification decline" && b.status === "declined" && b.vendorNote === "Session is full — sorry, fully booked"));
    const current = (await vendor("GET", "/api/vendor/dashboard")).body;
    assert.ok(current.month && current.checklist);
    assert.ok(current.next7Days.every(b => typeof b.spotsLeft === "number" || b.spotsLeft === null));
    pass("Retained real member statuses/notes, vendor redaction and dashboard month/checklist/remaining inventory");
    return;
  }
  const stamp = Date.now();
  const email = `stage4-api-${stamp}@example.invalid`;
  const application = {
    businessName: "Stage 4 API verification studio", contactName: "Stage 4 verification",
    contactEmail: email, contactPhone: "+94770000000", city: "Colombo",
    address: "Development test address", activityTypes: ["sports", "recreation"],
    description: "Synthetic Stage 4 verification application", capacity: 8,
    typicalPrice: 2500, website: "@stage4_verification",
    mapsLink: "https://www.google.com/maps", acceptTerms: true,
  };
  for (const bad of [
    { acceptTerms: false }, { activityTypes: ["unsupported"] }, { city: "Unsupported" },
    { typicalPrice: 25.5 }, { contactPhone: "12345" }, { website: "javascript:bad" },
  ]) assert.equal((await anon("POST", "/api/vendor-applications", { ...application, ...bad })).status, 400);
  const created = await anon("POST", "/api/vendor-applications", application);
  assert.equal(created.status, 200);
  assert.equal(created.body.verificationStatus, "pending");
  assert.equal(created.body.address, application.address);
  for (const value of ["2500", "8", application.website, application.mapsLink, "Vendor terms"]) {
    assert.ok(created.body.description.includes(value));
  }
  assert.equal((await anon("POST", "/api/auth/login", { email, password: "anything" })).status, 401);
  const duplicate = await anon("POST", "/api/vendor-applications", { ...application, contactEmail: "user@freespirit.com" });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.message, "This email already has an account — log in first, then apply");
  assert.equal((await anon("GET", "/api/vendor/dashboard")).status, 401);
  pass("Anonymous application, stored metadata/address, placeholder cannot login, duplicate and input validation");

  // User-supplied public development demo credentials, never deployment secrets.
  assert.equal((await admin("POST", "/api/auth/login", { email: "admin@freespirit.com", password: "admin123" })).status, 200);
  assert.equal((await member("POST", "/api/auth/login", { email: "user@freespirit.com", password: "customer123" })).status, 200);
  assert.equal((await vendor("POST", "/api/auth/login", { email: "vendor1@freespirit.com", password: "vendor123" })).status, 200);
  assert.equal((await member("GET", "/api/vendor/dashboard")).status, 403);
  assert.equal((await admin("GET", "/api/vendor/bookings")).status, 403);
  assert.equal((await vendor("GET", "/api/admin/vendors")).status, 403);
  assert.equal((await member("POST", `/api/admin/vendors/${created.body.id}/approve`)).status, 403);
  const approval = await admin("POST", `/api/admin/vendors/${created.body.id}/approve`);
  assert.equal(approval.status, 200);
  assert.equal(approval.body.verificationStatus, "approved");
  assert.equal(approval.body.login.email, email);
  assert.equal(typeof approval.body.login.temporaryPassword, "string");
  const newVendor = client();
  const login = await newVendor("POST", "/api/auth/login", { email, password: approval.body.login.temporaryPassword });
  assert.equal(login.status, 200); assert.equal(login.body.role, "vendor");
  assert.ok(!("password" in login.body));
  assert.ok(!("login" in (await admin("POST", `/api/admin/vendors/${created.body.id}/approve`)).body));
  const profile = (await vendor("GET", "/api/vendor/profile")).body;
  assert.ok(!("login" in (await admin("POST", `/api/admin/vendors/${profile.id}/approve`)).body));
  assert.equal((await vendor("POST", "/api/auth/login", { email: "vendor1@freespirit.com", password: "vendor123" })).status, 200);
  pass("Role guards, one-time placeholder approval/password, ordinary owner's password unchanged");

  const listings = (await vendor("GET", "/api/vendor/experiences")).body;
  let activity, slot;
  for (const listing of listings.filter(e => e.status === "published")) {
    const slots = (await member("GET", `/api/experiences/${listing.id}/slots`)).body;
    slot = slots.find(s => s.status === "open" && s.capacity >= 4 &&
      Date.parse(`${s.date}T${s.startTime.slice(0, 5)}:00+05:30`) > Date.now() + 3600000);
    if (slot) { activity = listing; break; }
  }
  assert.ok(activity && slot, "An owned future session with four spots is required");
  const before = slot.capacity;
  const first = await member("POST", "/api/bookings", {
    experienceId: activity.id, slotId: slot.id, qty: 2, customerNote: "Stage 4 verification confirm/cancel",
  });
  const second = await member("POST", "/api/bookings", {
    experienceId: activity.id, slotId: slot.id, qty: 2, customerNote: "Stage 4 verification decline",
  });
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  const rows = (await vendor("GET", "/api/vendor/bookings")).body;
  for (const row of rows.filter(b => b.status !== "confirmed")) {
    assert.equal(row.customer.email, null); assert.equal(row.customer.phone, null);
  }
  const dashboard = (await vendor("GET", "/api/vendor/dashboard")).body;
  const requests = dashboard.pendingRequests;
  assert.ok(requests.every((b, i) => !i || Date.parse(requests[i - 1].createdAt) <= Date.parse(b.createdAt)));
  assert.equal(rows.find(b => b.id === first.body.id).spotsLeft, before - 4);
  for (const row of [...dashboard.pendingRequests, ...dashboard.next7Days].filter(b => b.status !== "confirmed")) {
    assert.equal(row.customer.email, null); assert.equal(row.customer.phone, null);
  }
  assert.equal((await vendor("PATCH", `/api/vendor/bookings/${second.body.id}`, { status: "declined" })).status, 400);
  assert.equal((await vendor("PATCH", `/api/vendor/bookings/${first.body.id}`, { status: "cancelled" })).status, 409);
  assert.equal((await vendor("PATCH", `/api/vendor/bookings/${first.body.id}`, { status: "confirmed" })).status, 200);
  const confirmed = (await vendor("GET", "/api/vendor/bookings")).body.find(b => b.id === first.body.id);
  assert.equal(confirmed.customer.email, "user@freespirit.com");
  const me = (await member("GET", "/api/auth/me")).body;
  assert.equal(confirmed.customer.phone, me.phone);
  const declined = await vendor("PATCH", `/api/vendor/bookings/${second.body.id}`, {
    status: "declined", declineReason: "Session is full", vendorNote: "sorry, fully booked",
  });
  assert.equal(declined.status, 200);
  assert.equal(declined.body.vendorNote, "Session is full — sorry, fully booked");
  assert.equal((await vendor("PATCH", `/api/vendor/bookings/${first.body.id}`, { status: "cancelled" })).status, 200);
  assert.equal((await vendor("PATCH", `/api/vendor/bookings/${first.body.id}`, { status: "cancelled" })).status, 409);
  const afterSlots = (await member("GET", `/api/experiences/${activity.id}/slots`)).body;
  assert.equal(afterSlots.find(s => s.id === slot.id).capacity, before);
  const own = (await member("GET", "/api/bookings")).body;
  assert.equal(own.find(b => b.id === first.body.id).status, "cancelled");
  assert.equal(own.find(b => b.id === second.body.id).status, "declined");
  assert.equal(own.find(b => b.id === second.body.id).vendorNote, "Session is full — sorry, fully booked");
  const other = (await admin("GET", "/api/admin/bookings")).body.find(b => !listings.some(e => e.id === b.experienceId));
  if (other) assert.equal((await vendor("PATCH", `/api/vendor/bookings/${other.id}`, { status: "confirmed" })).status, 404);
  else console.log("SKIP: no real cross-vendor booking exists; verify that boundary with an isolated route fixture.");
  pass("Real two-person bookings: contact privacy, confirm/decline/cancel, note, exact inventory restoration and ownership");
  const current = (await vendor("GET", "/api/vendor/dashboard")).body;
  assert.ok(current.month && current.checklist);
  for (const row of (await vendor("GET", "/api/vendor/bookings")).body.filter(b => b.status !== "confirmed")) {
    assert.equal(row.customer.email, null); assert.equal(row.customer.phone, null);
  }
  pass("Dashboard checklist/month/remaining inventory and final redaction");
  console.log("Stage 4 API checks passed. Labelled development records retained; no passwords logged.");
})().catch(error => { console.error(error.message); process.exitCode = 1; });
