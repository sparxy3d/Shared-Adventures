// Browser acceptance tests against disposable development fixtures only.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || "")) throw Error("Use the isolated fixture URL");
const output = "generated-artifacts/application-fixes";
const errorsOnly = process.argv.includes("--errors-only");
const runId = Date.now();
const executablePath = "/nix/store/d7y5039fgn5432kgkn0cv09hda4a7nxz-playwright-chromium-cjk-1.55.0-1187/chrome-linux/chrome";
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  const records = [], issues = [], checks = [];
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", error => issues.push(error.message));
      const screenshot = async (name, title, top, bottom = top) => {
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const filename = `${name}-${width}.jpg`;
        if (top) {
          const bounds = await page.evaluate(({ top, bottom }) => {
            const a = document.querySelector(top).getBoundingClientRect();
            const b = document.querySelector(bottom).getBoundingClientRect();
            const y = Math.max(0, a.top + scrollY - 16);
            return { x: 0, y, width: innerWidth, height: b.bottom + scrollY + 16 - y, scale: 1 };
          }, { top, bottom });
          const cdp = await context.newCDPSession(page);
          const image = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 86, captureBeyondViewport: true, clip: bounds });
          await fs.writeFile(`${output}/${filename}`, Buffer.from(image.data, "base64"));
          await cdp.detach();
        } else await page.screenshot({ path: `${output}/${filename}`, type: "jpeg", quality: 86 });
        records.push({ filename, title, width });
      };
      await page.goto(base + "/for-vendors/apply", { waitUntil: "networkidle" });
      await page.locator("#vendor-business-name").fill(`Screenshot Studio ${width}`);
      await page.locator("#vendor-contact-name").fill("Test host");
      await page.locator("#vendor-contact-email").fill(`application-shot-${width}-${runId}@test.invalid`);
      await page.locator("#vendor-contact-phone").fill("771234567");
      await page.locator("#vendor-city").selectOption("Colombo");
      await page.locator("#vendor-address").fill("Test workshop meeting place");
      await page.locator("#vendor-description").fill("A local host offering creative workshops and friendly sports.");
      await page.getByTestId("add-activity").click();
      for (const [index, activity] of [
        [0, { name: "Pottery workshop", category: "arts", price: "2500", group: "2", description: "Make a bowl with friends and a local instructor." }],
        [1, { name: "Social futsal", category: "sports", price: "1500", group: "6+", description: "A friendly team game for your next group outing." }],
      ]) {
        await page.locator(`#activity-${index}-name`).fill(activity.name);
        await page.locator(`#activity-${index}-category`).selectOption(activity.category);
        await page.locator(`#activity-${index}-priceAmount`).fill(activity.price);
        await page.locator(`input[name="activities.${index}.groupSizes"][value="${activity.group}"]`).check();
        await page.locator(`#activity-${index}-description`).fill(activity.description);
      }
      await page.locator('input[name="activities.0.differentVisitorPrice"]').locator("..").click();
      await page.locator("#activity-0-visitorPriceUsd").fill("10");
      await screenshot("activities", "Your activities with two independently priced activities", '[data-testid="activities"]');
      const send = page.getByTestId("button-submit-vendor-application");
      await page.evaluate(() => {
        window.__applicationSubmitCount = 0;
        document.querySelector(".v4-form-card").addEventListener("submit", () => window.__applicationSubmitCount++);
      });
      let applicationRequests = 0;
      page.on("request", req => { if (req.method() === "POST" && req.url().endsWith("/api/vendor-applications")) applicationRequests++; });
      await page.locator("#vendor-accept-terms").check();
      await send.click();
      assert.equal(await page.evaluate(() => window.__applicationSubmitCount), 1, "First click must submit even when blur shows errors");
      await page.getByTestId("error-summary").waitFor();
      await page.waitForFunction(() => document.activeElement?.id === "vendor-document-idCopy");
      assert.match(await page.getByTestId("error-summary").innerText(), /Please fix 1 thing before sending/);
      assert.equal(await page.locator("#vendor-document-idCopy").getAttribute("aria-invalid"), "true");
      assert.ok(await page.locator("#vendor-document-idCopy").evaluate(input => { const rect = input.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }));
      assert.equal(applicationRequests, 0);
      checks.push(`PASS ${width}: Missing ID shows summary and inline error, focuses and scrolls to ID, makes no request`);
      const idFile = { name: "test-id.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF") };
      await page.locator("#vendor-document-idCopy").setInputFiles(idFile);
      await page.locator("#vendor-accept-terms").uncheck();
      await send.click();
      assert.equal(await page.evaluate(() => window.__applicationSubmitCount), 2, "Terms blur must not move Send and swallow its click");
      await page.getByTestId("error-summary").waitFor();
      await page.waitForFunction(() => document.activeElement?.id === "vendor-accept-terms", undefined, { timeout: 5000 }).catch(async error => {
        console.log("Terms focus diagnostic", await page.evaluate(() => ({
          active: document.activeElement?.outerHTML,
          invalid: Array.from(document.querySelectorAll('[aria-invalid="true"]')).map(el => el.outerHTML.slice(0, 400)),
          summary: document.querySelector('[data-testid="error-summary"]')?.textContent,
          files: document.querySelector("#vendor-document-idCopy")?.files.length,
        })));
        throw error;
      });
      assert.match(await page.getByTestId("error-summary").innerText(), /Please fix 1 thing before sending/);
      assert.equal(await page.locator("#vendor-accept-terms").getAttribute("aria-invalid"), "true");
      assert.ok(await page.locator("#vendor-accept-terms").evaluate(input => { const rect = input.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; }));
      assert.equal(applicationRequests, 0);
      checks.push(`PASS ${width}: Unticked terms show summary and inline error, focus and scroll to terms, make no request`);
      await page.locator("#vendor-document-idCopy").setInputFiles([]);
      await send.click();
      await page.getByTestId("error-summary").getByText("Please fix 2 things before sending").waitFor();
      await page.waitForFunction(() => getComputedStyle(document.querySelector(".v4-document-upload")).borderTopColor === "rgb(180, 35, 24)", undefined, { timeout: 5000 });
      assert.equal(await page.locator("#vendor-accept-terms").evaluate(element => getComputedStyle(element).outlineColor), "rgb(180, 35, 24)");
      await screenshot("errors", "Missing ID and terms: field errors and counted summary", ".v4-document-fieldset", '[data-testid="button-submit-vendor-application"]');
      if (errorsOnly) { await context.close(); continue; }
      await page.locator("#vendor-document-idCopy").setInputFiles(idFile);
      await page.locator("#vendor-accept-terms").check();
      await page.route("**/api/vendor-applications", route => route.fulfill({ status: 503, contentType: "application/json", body: '{"message":"Test unavailable"}' }));
      await send.click();
      await page.getByTestId("vendor-application-error").waitFor();
      assert.ok((await page.getByTestId("vendor-application-error").innerText()).includes("We couldn't send your application. Please try again."));
      assert.equal(await page.locator("#activity-0-name").inputValue(), "Pottery workshop");
      assert.equal(await page.locator("#vendor-document-idCopy").evaluate(input => input.files.length), 1);
      assert.equal(await page.locator("#vendor-accept-terms").isChecked(), true);
      await page.unroute("**/api/vendor-applications");
      checks.push(`PASS ${width}: Server failure shows clear error and preserves typed fields, attachment and terms`);
      let release;
      const barrier = new Promise(resolve => { release = resolve; });
      await page.route("**/api/vendor-applications", async route => { await barrier; await route.continue(); });
      const result = page.waitForResponse(response => response.request().method() === "POST" && response.url().endsWith("/api/vendor-applications"));
      await send.click();
      await page.getByRole("button", { name: /Sending/ }).waitFor();
      assert.equal(await send.isDisabled(), true);
      release();
      const response = await result;
      assert.equal(response.status(), 200);
      const vendor = await response.json();
      assert.equal(vendor.applicationActivities.length, 2);
      await page.getByTestId("vendor-application-success").waitFor();
      await page.getByText("Thanks. We'll call you within 2 working days to talk it through.", { exact: true }).waitFor();
      assert.equal(await page.locator(".v4-form-card").count(), 0);
      const successBounds = await page.getByTestId("vendor-application-success").boundingBox();
      assert.ok(successBounds && successBounds.y >= 0 && successBounds.y < 1000);
      await screenshot("success", "Application received after a real two-activity submission");
      checks.push(`PASS ${width}: Sending disabled state, real two-activity save and confirmation scroll`);
      const login = await context.request.post(base + "/api/auth/login", { data: { email: "application-admin@test.invalid", password: "ApplicationTest123" } });
      assert.equal(login.status(), 200);
      await page.goto(base + "/admin/applications", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: `Screenshot Studio ${width}`, exact: true }).click();
      const details = page.getByRole("dialog");
      assert.equal(await details.locator(".ad-application-activity").count(), 2);
      const applicationText = await details.innerText();
      for (const value of ["Pottery workshop", "Social futsal", "Arts & Classes", "Sports", "LKR 2,500", "USD 10", "LKR 1,500"]) assert.ok(applicationText.includes(value));
      checks.push(`PASS ${width}: Admin application dialog shows both activities, categories, preferences and whole-unit prices`);
      await details.getByRole("button", { name: "Close", exact: true }).last().click();
      const approval = await context.request.post(base + `/api/admin/vendors/${vendor.id}/approve`, { data: {} });
      assert.equal(approval.status(), 200);
      const draftsResponse = await context.request.get(base + `/api/admin/vendors/${vendor.id}/experiences`);
      const drafts = await draftsResponse.json();
      assert.equal(drafts.length, 2);
      assert.deepEqual(drafts.sort((a, b) => a.title.localeCompare(b.title)).map(item => [item.priceAmount, item.visitorPriceUsd]), [[2500, 10], [1500, null]]);
      assert.ok(drafts.every(item => item.status === "draft"));
      checks.push(`PASS ${width}: Approval of browser-created application creates two drafts at LKR 2500/USD 10 and LKR 1500`);
      await context.request.post(base + "/api/auth/logout");
      await page.goto(base + "/login", { waitUntil: "networkidle" });
      const white = await page.getByTestId("button-login").evaluate(button => getComputedStyle(button).color);
      assert.equal(white, "rgb(255, 255, 255)");
      const email = await page.locator("#login-email").boundingBox();
      const social = await page.locator(".stage-social-actions").boundingBox();
      const buttons = await page.locator(".stage-social").all();
      const first = await buttons[0].boundingBox(), second = await buttons[1].boundingBox();
      assert.ok(Math.abs(social.x - email.x) < 2 && Math.abs(social.width - email.width) < 2);
      assert.ok(Math.abs(first.y - second.y) < 2);
      assert.equal(await page.getByText("Coming soon", { exact: true }).count(), 1);
      assert.equal(await page.locator(".stage-photo-caption").count(), 0);
      assert.ok(await buttons[0].isDisabled() && await buttons[1].isDisabled());
      await screenshot("login", "Login with contained social buttons and white primary label");
      checks.push(`PASS ${width}: Login white label, aligned side-by-side disabled social buttons, single Coming soon, removed caption`);
      await context.close();
    }
    assert.deepEqual(issues, []);
    if (errorsOnly) { console.log("PASS: Updated desktop/phone error screenshots show red document and terms controls, correct counts and scroll/focus"); return; }
    await fs.writeFile(`${output}/browser-checks.json`, JSON.stringify({ screenshots: records, checks, issues }, null, 2));
    console.log(JSON.stringify({ screenshots: records.length, checks, issues }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
