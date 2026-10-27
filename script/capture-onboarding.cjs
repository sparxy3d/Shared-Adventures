// Development-only screenshot fixtures. No production users or secrets.
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const fs = require("node:fs/promises");
const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || "")) throw Error("Use the isolated test fixture URL");
const output = "generated-artifacts/stage-three";
const executablePath = "/nix/store/d7y5039fgn5432kgkn0cv09hda4a7nxz-playwright-chromium-cjk-1.55.0-1187/chrome-linux/chrome";
let browser;
(async () => {
  await fs.mkdir(output, { recursive: true });
  browser = await chromium.launch({ executablePath, headless: true, args: ["--no-sandbox"] });
  if (process.argv.includes("--activity-only")) {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
      await context.request.post(base + "/api/auth/login", { data: { email: "onboarding-2@test.invalid", password: "OnboardingTest123" } });
      const page = await context.newPage();
      await page.goto(base + "/activity/1", { waitUntil: "networkidle" });
      await page.getByText("Bookings open soon", { exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${output}/bookings-closed-${width}.jpg`, type: "jpeg", quality: 84, fullPage: true });
      await context.close();
    }
    await browser.close();
    console.log("Full activity screenshots include the closed-bookings panel and Notify me.");
    return;
  }
  const records = [];
  const issues = [];
  let temporaryPassword = "OnboardingTest123";
  for (const width of [1440, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    page.on("pageerror", error => issues.push(error.message));
    const login = async id => {
      const response = await context.request.post(base + "/api/auth/login", { data: { email: id === 20 ? "temporary@test.invalid" : `onboarding-${id}@test.invalid`, password: id === 20 ? temporaryPassword : "OnboardingTest123" } });
      if (!response.ok()) throw Error(`Fixture login failed: ${response.status()}`);
    };
    const shot = async (name, title, locator) => {
      await page.locator("body").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) issues.push(`${name} has horizontal overflow at ${width}`);
      const filename = `${name}-${width}.jpg`;
      if (locator) await locator.screenshot({ path: `${output}/${filename}`, type: "jpeg", quality: 84 });
      else await page.screenshot({ path: `${output}/${filename}`, type: "jpeg", quality: 84, fullPage: name === "bookings-closed" });
      records.push({ filename, title, width });
    };
    await login(20);
    await page.goto(base + "/vendor", { waitUntil: "networkidle" });
    await page.waitForURL("**/set-password");
    await page.getByRole("heading", { name: "Set a new password." }).waitFor();
    await shot("set-password", "Required password change");
    // Prove this is a real password change, not just a screenshot of the form.
    await page.locator("#temporary-password").fill(temporaryPassword);
    await page.locator("#new-password").fill(`ChangedScreenshot${width}`);
    await page.locator("#confirm-password").fill(`ChangedScreenshot${width}`);
    await page.getByRole("button", { name: "Save new password" }).click();
    await page.waitForURL(url => url.pathname !== "/set-password");
    // Restore this isolated fixture only for the second viewport.
    if (width === 1440) {
      const response = await context.request.post(base + "/api/auth/logout", { data: {} });
      if (!response.ok()) throw Error("Logout failed");
    }
    await login(2);
    await page.goto(base + "/vendor/listings/1", { waitUntil: "networkidle" });
    const photoSection = page.locator("#section-photo");
    const toggle = photoSection.locator("button.v5-section-toggle");
    if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
    await photoSection.getByText("Your photos", { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector(".listing-photo-loading"));
    await shot("listing-photos", "Listing editor photo section", photoSection);
    await page.goto(base + "/activity/1", { waitUntil: "networkidle" });
    await page.getByText("Bookings open soon", { exact: true }).first().waitFor();
    await shot("bookings-closed", "Activity with bookings closed");
    await page.getByRole("button", { name: "Notify me", exact: true }).first().click();
    await page.getByText("We'll email you once bookings open. We won't use your email for anything else.", { exact: true }).waitFor();
    await shot("notify-dialog", "Notify me privacy and sign-up");
    await login(1);
    await page.goto(base + "/admin/waiting-list", { waitUntil: "networkidle" });
    await page.getByText("awaiting@example.com", { exact: true }).filter({ visible: true }).first().waitFor();
    await shot("waiting-list", "Admin waiting list");
    await page.goto(base + "/admin/settings", { waitUntil: "networkidle" });
    await page.getByText("Show demo content on the public site", { exact: true }).waitFor();
    const section = page.getByText("Show demo content on the public site", { exact: true }).locator("xpath=ancestor::section[1]");
    await shot("admin-switches", "Admin demo and booking switches", await section.count() === 1 ? section : undefined);
    if (width === 1440) {
      const response = await context.request.post(base + "/api/admin/members/20/reset-password", { data: {} });
      if (!response.ok()) throw Error("Fixture password reset failed");
      temporaryPassword = (await response.json()).temporaryPassword;
    }
    await context.close();
  }
  await browser.close();
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Stage 3 screenshots</title><style>body{font:16px system-ui;margin:32px;background:#fff8f1;color:#171717}main{max-width:1600px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}figure{margin:0;background:white;padding:16px;border-radius:16px}img{max-width:100%;height:auto;border:1px solid #ddd}figcaption{margin-bottom:12px}p{line-height:1.5}</style><main><h1>Stage 3: desktop and phone screenshots</h1><p>Isolated development fixtures at 1440px and 375px. Public photo data uses an in-memory test object adapter, not a configured cloud bucket. No production data or real customer details.</p><div class="grid">${(await Promise.all(records.map(async item => `<figure><figcaption>${item.title}, ${item.width}px</figcaption><img alt="${item.title}, ${item.width}px" src="data:image/jpeg;base64,${(await fs.readFile(`${output}/${item.filename}`)).toString("base64")}"></figure>`))).join("")}</div></main></html>`;
  await fs.writeFile(`${output}/screenshots.html`, html);
  await fs.writeFile(`${output}/browser-checks.json`, JSON.stringify({ screenshots: records, issues }, null, 2));
  console.log(JSON.stringify({ screenshots: records.length, issues }));
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
