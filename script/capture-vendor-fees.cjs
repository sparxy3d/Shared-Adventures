// Run only against script/test-vendor-fees.ts --screenshots disposable server.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || "") || new URL(base).port === "5000") throw Error("Use the isolated fixture URL, never the main app");
const output = "generated-artifacts/vendor-fees";
const run = Date.now();
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/nix/store/d7y5039fgn5432kgkn0cv09hda4a7nxz-playwright-chromium-cjk-1.55.0-1187/chrome-linux/chrome",
    headless: true, args: ["--no-sandbox"],
  });
  const checks = [], screenshots = [], errors = [];
  try {
    const bootstrap = await browser.newContext();
    assert.equal((await bootstrap.request.post(base + "/api/auth/login", { data: { email: "fee-1@test.invalid", password: "FeeFixtureTest123" } })).status(), 200);
    assert.equal((await bootstrap.request.patch(base + "/api/admin/vendors/1/commission", { data: { introductoryRate: 10, introductoryMonths: 3, standardRate: 15 } })).status(), 200);
    await bootstrap.close();
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      const screenshot = async (name, selector) => {
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const file = `${output}/${name}-${width}.jpg`;
        if (selector) {
          const bounds = await page.locator(selector).evaluate(el => { const r = el.getBoundingClientRect(); return { y: Math.max(0, r.top + scrollY - 32), height: r.height + 64 }; });
          const cdp = await context.newCDPSession(page);
          const image = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 85, captureBeyondViewport: true, clip: { x: 0, y: bounds.y, width, height: bounds.height, scale: 1 } });
          await fs.writeFile(file, Buffer.from(image.data, "base64")); await cdp.detach();
        } else await page.screenshot({ path: file, type: "jpeg", quality: 85 });
        screenshots.push({ file, width, name });
      };
      await page.goto(base + "/for-vendors", { waitUntil: "networkidle" });
      await page.locator("#vendor-business-name").fill(`Compact confirmation ${width}`);
      await page.locator("#vendor-contact-name").fill("Test host");
      await page.locator("#vendor-contact-email").fill(`compact-${width}-${run}@test.invalid`);
      await page.locator("#vendor-contact-phone").fill("771234567");
      await page.locator("#vendor-city").selectOption("Colombo");
      await page.locator("#vendor-address").fill("Test studio, Colombo");
      await page.locator("#vendor-description").fill("A local activity studio.");
      await page.locator("#activity-0-name").fill("Creative workshop");
      await page.locator("#activity-0-category").selectOption("arts");
      await page.locator("#activity-0-priceAmount").fill("2500");
      await page.locator('input[name="activities.0.groupSizes"][value="2"]').locator("..").click();
      await page.locator("#vendor-document-idCopy").setInputFiles({ name: "fixture.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF") });
      await page.locator("#vendor-accept-terms").check();
      await page.getByTestId("button-submit-vendor-application").click();
      const success = page.getByTestId("vendor-application-success");
      await success.waitFor();
      assert.equal(await success.locator("h2").innerText(), "Application received");
      assert.equal(await success.locator("p").innerText(), "Thanks. We'll call you within 2 working days to talk it through.");
      assert.equal(await success.locator("h2").evaluate(el => getComputedStyle(el).fontSize), width === 1440 ? "28px" : "22px");
      assert.equal(await success.locator("p").evaluate(el => getComputedStyle(el).fontSize), width === 1440 ? "17px" : "16px");
      assert.ok((await success.boundingBox()).height < 300);
      await screenshot("application-received", '[data-testid="vendor-application-success"]');
      checks.push(`PASS ${width}: Real application confirmation, exact copy, requested font sizes, compact card`);

      const login = async id => {
        const response = await context.request.post(base + "/api/auth/login", { data: { email: `fee-${id}@test.invalid`, password: "FeeFixtureTest123" } });
        assert.equal(response.status(), 200);
      };
      await login(3);
      await page.goto(base + "/vendor", { waitUntil: "networkidle" });
      const fee = page.getByTestId("dashboard-fee"); await fee.waitFor();
      const text = await fee.innerText();
      for (const part of ["Free Spirit fee", "10%", "3 months", "first listing goes live", "15%"]) assert.ok(text.toLowerCase().includes(part.toLowerCase()), text);
      assert.ok(!text.includes("Applied when"));
      assert.ok(parseFloat(await page.locator(".v-dashboard-head h1").evaluate(el => getComputedStyle(el).fontSize)) <= 32);
      await screenshot("vendor-dashboard");
      checks.push(`PASS ${width}: Dashboard heading <=32px, correct unstarted introductory plan and compact layout`);
      await context.request.post(base + "/api/auth/logout");
      await login(1);
      await page.goto(base + "/admin/applications", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Approve application", exact: true }).first().click();
      const dialog = page.getByTestId("approval-fee-dialog");
      await dialog.waitFor();
      const intro = dialog.getByLabel(/Introductory rate/);
      const months = dialog.getByLabel(/Introductory period/);
      const standard = dialog.getByLabel(/Standard rate/);
      assert.equal(await intro.inputValue(), "10"); assert.equal(await months.inputValue(), "3"); assert.equal(await standard.inputValue(), "15");
      if (width === 375) { await intro.fill("8"); await months.fill("6"); await standard.fill("12"); }
      await screenshot("approval-fee");
      const pending = page.waitForResponse(response => /\/api\/admin\/vendors\/\d+\/approve$/.test(response.url()) && response.request().method() === "POST");
      await page.getByTestId("approval-fee-confirm").click();
      const approval = await pending;
      assert.equal(approval.status(), 200);
      const approved = await approval.json();
      assert.equal(Number(approved.commissionIntroductoryRate), width === 375 ? 8 : 10);
      assert.equal(Number(approved.commissionStandardRate), width === 375 ? 12 : 15);
      assert.equal(approved.commissionIntroductoryMonths, width === 375 ? 6 : 3);
      checks.push(`PASS ${width}: Approval prefills actual globals and persists reviewed ${width === 375 ? "custom" : "default"} fee plan`);
      if (width === 1440) {
        await page.goto(base + "/admin/vendors/1", { waitUntil: "networkidle" });
        const form = page.locator(".av-commission-box");
        await form.waitFor();
        await form.getByLabel(/Introductory rate/).fill("9");
        await form.getByLabel(/Introductory (?:period|months)/).fill("5");
        await form.getByLabel(/Standard rate/).fill("13");
        const saved = page.waitForResponse(response => response.url().endsWith("/api/admin/vendors/1/commission") && response.request().method() === "PATCH");
        await form.getByRole("button", { name: /Save/ }).click();
        assert.equal((await saved).status(), 200);
        await page.reload({ waitUntil: "networkidle" });
        assert.equal(Number(await page.locator(".av-commission-box").getByLabel(/Introductory rate/).inputValue()), 9);
        await context.request.patch(base + "/api/admin/vendors/1/commission", { data: { introductoryRate: 10, introductoryMonths: 3, standardRate: 15 } });
        checks.push("PASS: Admin vendor-page three-field edit persists after reload");
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    await fs.writeFile(`${output}/browser-checks.json`, JSON.stringify({ checks, screenshots, errors }, null, 2));
    console.log(JSON.stringify({ checks, screenshots, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
