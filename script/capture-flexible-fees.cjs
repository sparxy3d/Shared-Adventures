// Authenticated browser verification against the disposable fee fixture only.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || "") || new URL(base).port === "5000") {
  throw Error("Use the disposable fee fixture, never the main application");
}
const output = "generated-artifacts/flexible-vendor-fees";
const freePlan = { introductoryRate: 0, introductoryMonths: 3, standardRate: 15 };
const paidPlan = { introductoryRate: 5, introductoryMonths: 2, standardRate: 12 };
const normalized = text => text.replace(/\s+/g, " ").trim();

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/nix/store/d7y5039fgn5432kgkn0cv09hda4a7nxz-playwright-chromium-cjk-1.55.0-1187/chrome-linux/chrome",
    args: ["--no-sandbox"],
  });
  const errors = [];
  const contexts = [];
  const login = async (width, id) => {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    contexts.push(context);
    const response = await context.request.post(base + "/api/auth/login", {
      data: { email: `fee-${id}@test.invalid`, password: "FeeFixtureTest123" },
    });
    assert.equal(response.status(), 200);
    return context;
  };
  const pageFor = async context => {
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    return page;
  };
  const patchPlan = async (context, plan) => {
    const response = await context.request.patch(base + "/api/admin/vendors/1/commission", { data: plan });
    assert.equal(response.status(), 200);
  };
  const dashboard = async (page, text) => {
    await page.goto(base + "/vendor", { waitUntil: "networkidle" });
    const card = page.getByTestId("dashboard-fee");
    await card.waitFor();
    assert.match(normalized(await card.innerText()), text);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    return card;
  };
  try {
    for (const width of [1440, 375]) {
      const admin = await login(width, 1);
      const host = await login(width, 3);
      const vendorPage = await pageFor(host);
      await patchPlan(admin, freePlan);
      let card = await dashboard(vendorPage, /No Free Spirit fee until .+You keep 100% of each completed booking\. After that, our fee is 15%\./);
      await card.screenshot({ path: `${output}/dashboard-no-fee-${width}.jpg`, type: "jpeg", quality: 90 });
      await patchPlan(admin, paidPlan);
      card = await dashboard(vendorPage, /5% introductory fee until .+You keep 95% of each completed booking\. After that, 12%\./);
      await card.screenshot({ path: `${output}/dashboard-five-percent-${width}.jpg`, type: "jpeg", quality: 90 });
      await patchPlan(admin, { ...freePlan, introductoryMonths: 0 });
      await dashboard(vendorPage, /15% fee\. You keep 85% of each completed booking\./);

      const adminPage = await pageFor(admin);
      await adminPage.goto(base + "/admin/vendors/1", { waitUntil: "networkidle" });
      const planForm = adminPage.locator(".av-commission-form");
      await planForm.waitFor();
      await planForm.getByLabel("Introductory period (months)").fill("1");
      await planForm.getByLabel("Introductory fee (%)").fill("0");
      assert.match(normalized(await planForm.innerText()), /No fee for 1 month, then 15%/);
      await planForm.getByLabel("Introductory fee (%)").fill("31");
      assert.equal(await planForm.getByRole("button", { name: "Save fee plan" }).isDisabled(), true);

      await adminPage.goto(base + "/admin/applications", { waitUntil: "networkidle" });
      const applicant = adminPage.locator("tr, .ad-mobile-card").filter({ hasText: "Pending fee review 3" });
      await applicant.getByRole("button", { name: "Approve application", exact: true }).click();
      const dialog = adminPage.getByRole("dialog", { name: "Review Free Spirit fee" });
      await dialog.waitFor();
      const intro = dialog.getByLabel("Introductory fee (%)");
      await intro.fill("0");
      await dialog.getByLabel("Introductory period (months)").fill("3");
      await dialog.getByLabel("Standard fee (%)").fill("15");
      assert.match(normalized(await dialog.innerText()), /No fee for 3 months, then 15%/);
      await dialog.screenshot({ path: `${output}/approval-${width}.jpg`, type: "jpeg", quality: 90 });
      await dialog.getByLabel("Introductory period (months)").fill("0");
      assert.match(normalized(await dialog.innerText()), /Standard fee: 15%/);
      await intro.fill("31");
      assert.equal(await dialog.getByTestId("approval-fee-confirm").isDisabled(), true);
      await dialog.getByRole("button", { name: "Cancel" }).click();

      await adminPage.goto(base + "/admin/settings", { waitUntil: "networkidle" });
      const settings = adminPage.locator(".ad-pricing-form");
      await settings.getByLabel("Introductory fee (%)").fill("0");
      await settings.getByLabel("Introductory period (months)").fill("1");
      await settings.getByLabel("Standard fee (%)").fill("15");
      assert.match(normalized(await settings.innerText()), /No fee for 1 month, then 15%/);

      await adminPage.goto(base + "/vendor-terms", { waitUntil: "networkidle" });
      const clause = adminPage.locator("article p").filter({ hasText: /^5\.1 / });
      await clause.waitFor();
      assert.match(await clause.innerText(), /Your fee is set out in your fee plan/);
      assert.doesNotMatch(await clause.innerText(), /10%|15%|3 months/);
      await clause.screenshot({ path: `${output}/terms-5-1-${width}.jpg`, type: "jpeg", quality: 90 });
      assert.doesNotMatch(await adminPage.locator("article").innerText(), /5\.9|Worked example|\d+(?:\.\d+)?\s*%/);
      assert.equal(await adminPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(`PASS: ${width}px dashboard two plans/no intro, admin labels/previews/ranges, terms and no overflow`);
    }
    assert.deepEqual(errors, []);
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
