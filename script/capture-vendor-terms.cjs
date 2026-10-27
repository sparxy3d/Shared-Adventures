// Only use the disposable server from test-multi-activity-applications.ts --screenshots.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || "") || new URL(base).port === "5000") {
  throw Error("Use the disposable fixture server, never the main application");
}
const output = "generated-artifacts/vendor-terms-final";

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "/nix/store/d7y5039fgn5432kgkn0cv09hda4a7nxz-playwright-chromium-cjk-1.55.0-1187/chrome-linux/chrome",
    args: ["--no-sandbox"],
  });
  const errors = [];
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(base + "/vendor-terms", { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("article h2").count(), 10);
      assert.equal(await page.locator("article table").count(), 1);
      assert.equal(await page.locator("article ol li").count(), 5);
      assert.equal(await page.locator("article").getByText(/draft|0\.9|pending legal review|final version coming soon/i).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.locator(".vendor-terms-toc").isVisible(), width === 1440);
      if (width === 1440) assert.equal(await page.locator(".vendor-terms-toc a").count(), 10);
      await page.screenshot({ path: `${output}/top-${width}.jpg`, type: "jpeg", quality: 85 });
      const clip = await page.evaluate(() => {
        const heading = document.getElementById("5-our-fee-and-your-payouts");
        const next = document.getElementById("6-cancellations-no-shows-and-refunds");
        const y = heading.getBoundingClientRect().top + scrollY - 16;
        return { x: 0, y, width: innerWidth, height: next.getBoundingClientRect().top + scrollY - y, scale: 1 };
      });
      const cdp = await context.newCDPSession(page);
      const section = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 85, captureBeyondViewport: true, clip });
      await fs.writeFile(`${output}/section-5-${width}.jpg`, Buffer.from(section.data, "base64"));
      await cdp.detach();

      await page.goto(base + "/for-vendors/apply", { waitUntil: "networkidle" });
      const label = page.locator('label[for="vendor-accept-terms"]');
      assert.equal((await label.innerText()).trim(), "I agree to the vendor terms");
      const link = label.locator("a");
      assert.equal(await link.getAttribute("href"), "/vendor-terms");
      assert.equal(await link.getAttribute("target"), "_blank");
      await page.locator("#vendor-accept-terms").focus();
      await page.keyboard.press("Tab");
      const [popup] = await Promise.all([page.waitForEvent("popup"), link.click()]);
      await popup.waitForLoadState("networkidle");
      assert.ok(popup.url().endsWith("/vendor-terms"));
      assert.equal(await popup.locator("article h2").count(), 10);
      await popup.close();
      await label.click({ position: { x: 12, y: 10 } });
      assert.equal(await page.locator("#vendor-accept-terms").isChecked(), true);
      await page.locator("#vendor-accept-terms").uncheck();
      await page.locator("#vendor-accept-terms").focus();
      await page.keyboard.press("Tab");
      await label.locator("..").locator("..").screenshot({
        path: `${output}/checkbox-${width}.jpg`, type: "jpeg", quality: 90,
      });

      assert.equal((await context.request.post(base + "/api/auth/login", {
        data: { email: "application-admin@test.invalid", password: "ApplicationTest123" },
      })).status(), 200);
      const response = await context.request.get(base + "/api/admin/vendors");
      assert.equal(response.status(), 200);
      const vendors = await response.json();
      const old = vendors.find(vendor => vendor.contactEmail === "two-activities@test.invalid");
      const current = vendors.find(vendor => vendor.contactEmail === "legacy-application@test.invalid");
      assert.ok(old && current);
      for (const [vendor, version] of [[old, "0.9"], [current, "1.0"]]) {
        await page.goto(base + `/admin/vendors/${vendor.id}`, { waitUntil: "networkidle" });
        const metadata = page.locator(".av-metadata");
        await metadata.waitFor();
        assert.equal(await metadata.locator("strong").first().innerText(), version);
        const accepted = await metadata.locator("strong").nth(1).innerText();
        assert.match(accepted, /\d{1,2}:\d{2}/);
        assert.ok(!(await metadata.innerText()).includes("Not recorded"));
      }
      await context.request.post(base + "/api/auth/logout");
      console.log(`PASS ${width}: 10 sections, lists/table, no overflow, new-tab checkbox, admin 1.0 and historical 0.9 with acceptance time; screenshots saved`);
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log("PASS zero browser page errors");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
