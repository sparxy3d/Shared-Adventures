/** Browser-only response fixtures. Every non-read API request is intercepted. */
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
  try {
    await fs.mkdir("generated-artifacts/application-limits", { recursive: true });
    for (const width of [375, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      let requests = 0;
      await context.route("**/api/**", async route => {
        const req = route.request();
        if (["GET", "HEAD"].includes(req.method())) return route.continue();
        if (new URL(req.url()).pathname === "/api/vendor-applications") {
          requests++;
          const status = requests === 1 ? 429 : 503;
          return route.fulfill({ status, contentType: "application/json", headers: { "Retry-After": "3600" },
            body: JSON.stringify({ message: status === 429
              ? "Too many application attempts. Please try again in 60 minutes, or contact hello@freespirit.club for help."
              : "We can't accept your application right now. Please try again shortly." }) });
        }
        return route.abort("blockedbyclient");
      });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(`https://${process.env.REPLIT_DEV_DOMAIN}/for-vendors/apply`, { waitUntil: "networkidle" });
      for (const [id, value] of Object.entries({
        "vendor-business-name": "Browser fixture business", "vendor-contact-name": "Fixture host",
        "vendor-contact-phone": "771234567", "vendor-contact-email": "feedback@test.invalid",
        "vendor-address": "Fixture meeting place", "activity-0-name": "Fixture workshop",
        "activity-0-priceAmount": "2500",
      })) await page.locator(`#${id}`).fill(value);
      await page.locator("#vendor-city").selectOption("Colombo");
      await page.locator('[data-field="activity-0-category"]').selectOption("arts");
      await page.locator('label').filter({ has: page.locator('input[name="activities.0.groupSizes"][value="2"]') }).click();
      await page.locator('textarea[name="description"]').fill("A synthetic application used only in browser fixtures.");
      await page.locator("#vendor-document-idCopy").setInputFiles({
        name: "fixture-id.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\nfixture"),
      });
      await page.locator("#vendor-accept-terms").check();
      await page.getByTestId("button-submit-vendor-application").click();
      await page.getByTestId("vendor-application-error").waitFor();
      assert.match(await page.getByTestId("vendor-application-error").innerText(), /60 minutes/);
      for (const status of [429, 503]) {
        assert.equal(await page.locator("#vendor-business-name").inputValue(), "Browser fixture business");
        assert.equal(await page.locator("#vendor-document-idCopy").evaluate(i => i.files.length), 1);
        assert.equal(await page.locator("#vendor-document-idCopy").evaluate(i => i.files[0].name), "fixture-id.pdf");
        assert.equal(await page.getByTestId("button-submit-vendor-application").isEnabled(), true);
        if (status === 429) {
          await page.getByTestId("vendor-application-error").screenshot({ path: `generated-artifacts/application-limits/error-${width}.jpg` });
          await page.getByRole("button", { name: "Retry application" }).click();
          await page.waitForFunction(() => document.querySelector('[data-testid="vendor-application-error"]')?.textContent.includes("can't accept"));
        }
      }
      assert.equal(requests, 2);
      console.log(`PASS ${width}px: 429 retry time and 503 shown; inputs and selected file retained; manual retry only; no real submissions`);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
