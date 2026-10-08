// Development only. Labelled synthetic accounts/listings are retained for review.
const assert = require("node:assert/strict");
if (!process.env.REPLIT_DEV_DOMAIN?.endsWith(".replit.dev") || process.env.DB_TARGET === "prod") {
  throw Error("Development preview only; production target forbidden");
}
const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
function browser() {
  let cookie = "";
  return async (method, route, body) => {
    const response = await fetch(origin + route, { method,
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    const setCookie = response.headers.getSetCookie()?.[0];
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
}
const pass = message => console.log("PASS:", message);
const slug = String(Date.now());
const admin = browser(), applicant = browser(), member = browser(), vendor = browser(), owner = browser();
const newVendor = `stage6-approval-${slug}@example.invalid`;
const declinedVendor = `stage6-declined-${slug}@example.invalid`;
const testMember = `stage6-member-${slug}@example.invalid`;
let memberResetPassword, vendor1Status, activityId, bookingIds = [];
async function apply(email) {
  return applicant("POST", "/api/vendor-applications", {
    businessName: `Stage 6 review ${slug}`, contactName: "Review Fixture",
    contactPhone: "+94771234567", contactEmail: email,
    city: "Colombo", address: "Development verification only",
    activityTypes: ["recreation"], capacity: 12, typicalPrice: 2500,
    description: "Development-only application", website: "@stage6fixture", acceptTerms: true,
  });
}
async function findVendor(email) {
  return (await admin("GET", "/api/admin/vendors")).body.find(v => v.ownerEmail === email);
}
(async () => {
  assert.equal((await admin("POST", "/api/auth/login", {
    email: "admin@freespirit.com", password: "admin123" })).status, 200);
  assert.equal((await owner("POST", "/api/auth/login", {
    email: "vendor1@freespirit.com", password: "vendor123" })).status, 200);
  const prior = (await admin("GET", "/api/admin/stats")).body;
  const vendor1 = await findVendor("vendor1@freespirit.com");
  assert.ok(vendor1 && vendor1.verificationStatus === "approved");
  vendor1Status = vendor1.verificationStatus;
  assert.equal((await apply(newVendor)).status, 200);
  assert.equal((await apply(declinedVendor)).status, 200);
  const pending = await findVendor(newVendor), declined = await findVendor(declinedVendor);
  assert.ok(pending && declined && !pending.approvedAt);
  assert.equal((await admin("GET", "/api/admin/members")).body.find(u => u.email === newVendor).hasLogin, false);
  assert.equal((await admin("GET", "/api/admin/stats")).body.members, prior.members);
  assert.equal((await admin("POST", `/api/admin/vendors/${pending.id}/contacted`, {})).body.verificationStatus, "contacted");
  const approved = await admin("POST", `/api/admin/vendors/${pending.id}/approve`, {});
  assert.equal(approved.status, 200); assert.ok(approved.body.login?.temporaryPassword);
  assert.ok((await findVendor(newVendor)).approvedAt);
  assert.equal((await vendor("POST", "/api/auth/login", {
    email: newVendor, password: approved.body.login.temporaryPassword })).status, 200);
  assert.equal((await vendor("GET", "/api/vendor/profile")).body.id, pending.id);
  assert.equal((await admin("POST", `/api/admin/vendors/${pending.id}/approve`, {})).status, 409);
  assert.equal((await admin("POST", `/api/admin/vendors/${declined.id}/decline`, { reason: "Not a fit yet" })).body.verificationStatus, "rejected");
  pass("Logged-out application, contacted/approved/credential login, decline, placeholder flag and honest member count");

  const first = (await admin("GET", "/api/admin/experiences")).body.find(e => e.vendorId === vendor1.id && e.status === "published");
  assert.ok(first);
  assert.equal((await admin("POST", `/api/admin/vendors/${vendor1.id}/pause`, {})).status, 200);
  assert.equal((await admin("GET", `/api/experiences/${first.id}`)).status, 404);
  assert.equal((await admin("POST", `/api/admin/vendors/${vendor1.id}/resume`, {})).status, 200);
  assert.equal((await admin("GET", `/api/experiences/${first.id}`)).status, 200);
  pass("Pausing hides published listings from public detail; resuming restores them");

  const created = await admin("POST", "/api/admin/experiences", {
    vendorId: vendor1.id, title: `Stage 6 admin review ${slug}`, category: "recreation",
    city: "Colombo", locationText: "Development verification only",
    description: "Synthetic review listing", durationMinutes: 90, priceAmount: 2500,
    capacity: 12, imageUrl: "/images/recreation.png", status: "draft",
  });
  assert.equal(created.status, 200); activityId = created.body.id;
  const plan = Array.from({ length: 7 }, (_, weekday) => ({ weekday, startTime: "10:00", capacity: 12 }));
  const base = `/api/admin/experiences/${activityId}`;
  assert.equal((await admin("POST", `${base}/generate-sessions`, { pattern: plan, days: 14 })).body.created, 14);
  assert.equal((await admin("POST", `${base}/generate-sessions`, { pattern: plan, days: 14 })).body.created, 0);
  assert.equal((await admin("PATCH", base, { status: "published" })).status, 200);
  const slots = (await admin("GET", `${base}/slots`)).body;
  assert.equal(slots.length, 14); assert.ok(slots.every(slot => slot.capacity === 12));
  assert.equal((await admin("GET", `/api/experiences/${activityId}`)).status, 200);
  assert.equal((await admin("PATCH", base, { status: "unpublished" })).status, 200);
  assert.equal((await owner("PATCH", `/api/vendor/experiences/${activityId}`, { status: "published" })).status, 403);
  assert.equal((await admin("PATCH", base, { status: "published" })).status, 200);
  const adminDetail = await admin("GET", `/api/admin/vendors/${vendor1.id}`);
  assert.equal(adminDetail.body.bookingsThisMonth >= 0, true);
  assert.equal((await admin("GET", `/api/admin/vendors/${vendor1.id}/experiences`)).body.some(e => e.id === activityId), true);
  pass("Admin-owned listing, insert-only generation, unpublish lock/vendor403 and republish");

  const signup = await member("POST", "/api/auth/signup", {
    fullName: "Stage 6 Review Member", email: testMember, phone: "+94771234567", password: "stage6-member-check",
  });
  assert.equal(signup.status, 200);
  const who = (await admin("GET", "/api/admin/members")).body.find(u => u.email === testMember);
  assert.ok(who && who.hasLogin && !("password" in who));
  assert.equal((await member("GET", "/api/admin/members")).status, 403);
  assert.equal((await owner("GET", "/api/admin/members")).status, 403);
  assert.equal((await admin("PATCH", `/api/admin/members/${who.id}/role`, { role: "vendor" })).status, 400);
  assert.equal((await admin("PATCH", "/api/admin/members/" + (await admin("GET", "/api/auth/me")).body.id + "/role", { role: "vendor" })).status, 400);
  assert.equal((await admin("GET", "/api/admin/stats")).body.members, prior.members + 1);

  for (const targetStatus of ["confirmed", "declined", "cancelled"]) {
    const slot = slots[bookingIds.length];
    const booking = await member("POST", "/api/bookings", {
      experienceId: activityId, slotId: slot.id, qty: 2, customerNote: "Stage 6 review only",
    });
    assert.equal(booking.status, 200); bookingIds.push(booking.body.id);
    const status = targetStatus === "cancelled" ? "confirmed" : targetStatus;
    const action = await admin("PATCH", `/api/admin/bookings/${booking.body.id}`, {
      status, ...(status === "declined" ? { declineReason: "Other", vendorNote: "Review fixture only" } : {}),
    });
    assert.equal(action.status, 200); assert.ok(action.body.vendorNote.startsWith("By Free Spirit: "));
    if (targetStatus === "cancelled") {
      assert.equal((await admin("PATCH", `/api/admin/bookings/${booking.body.id}`, { status: "cancelled" })).status, 200);
    }
    const forVendor = (await admin("GET", `/api/admin/vendors/${vendor1.id}/bookings`)).body.find(b => b.id === booking.body.id);
    const forMember = (await member("GET", "/api/bookings")).body.find(b => b.id === booking.body.id);
    assert.ok(forVendor.vendorNote?.startsWith("By Free Spirit: ") && forMember.vendorNote?.startsWith("By Free Spirit: "));
    if (targetStatus !== "confirmed") assert.equal((await admin("GET", `${base}/slots`)).body.find(s => s.id === slot.id).capacity, 12);
  }
  // Release the confirmed fixture's inventory rather than retaining a reservation.
  assert.equal((await admin("PATCH", `/api/admin/bookings/${bookingIds[0]}`, { status: "cancelled" })).status, 200);
  assert.equal((await admin("GET", `${base}/slots`)).body.find(s => s.id === slots[0].id).capacity, 12);
  pass("Three admin booking transitions, attributed note in member/vendor views and spot release");

  const reset = await admin("POST", `/api/admin/members/${who.id}/reset-password`, {});
  assert.equal(reset.status, 200); memberResetPassword = reset.body.temporaryPassword;
  assert.equal((await admin("POST", `/api/admin/members/${who.id}/disable`, {})).status, 200);
  assert.equal((await member("POST", "/api/auth/login", { email: testMember, password: memberResetPassword })).status, 403);
  assert.equal((await admin("POST", `/api/admin/members/${who.id}/enable`, {})).status, 200);
  assert.equal((await member("POST", "/api/auth/login", { email: testMember, password: memberResetPassword })).status, 200);
  pass("One-time reset login, disable/enable and role guard");
  assert.ok((await admin("GET", "/api/admin/stats")).body.attention?.listings);
  assert.equal((await admin("PATCH", base, { status: "draft" })).status, 200);
  pass("Fixture listing restored to draft; no test reservation remains");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  // Restore only the demo vendor's prior state if a test failed mid-flow.
  if (vendor1Status && vendor1Status !== "paused") {
    try {
      const row = await findVendor("vendor1@freespirit.com");
      if (row?.verificationStatus === "paused") await admin("POST", `/api/admin/vendors/${row.id}/resume`, {});
    } catch { /* report main failure */ }
  }
  if (activityId) {
    try { await admin("PATCH", `/api/admin/experiences/${activityId}`, { status: "draft" }); }
    catch { /* report main failure */ }
  }
});
