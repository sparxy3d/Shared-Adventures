// No database writes. Real browser source-selection/fallback tests in a local fixture.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const sharp = require("sharp");
const { build } = require("esbuild");
const { chromium } = require("/mnt/pid2/node_modules/playwright");
const manifest = require("../client/src/lib/curated-photos.json");
(async () => {
  for (const [source, entry] of Object.entries(manifest)) {
    assert.ok(fs.existsSync(`client/public${source}`), "Original retained");
    assert.equal(entry.variants.length, 3);
    for (const [index, v] of entry.variants.entries()) {
      const m = await sharp(`client/public${v.src}`).metadata();
      assert.equal(m.format, "webp"); assert.equal(m.width, Math.min([400, 800, 1600][index], entry.width));
      assert.ok(Math.abs(m.width / m.height - entry.width / entry.height) < 0.01, "Aspect retained");
      assert.equal(m.exif, undefined); assert.equal(m.xmp, undefined);
      assert.equal(fs.statSync(`client/public${v.src}`).size, v.bytes);
    }
  }
  console.log("PASS 42 derivatives: dimensions, WebP, original retained, aspect and metadata");
  const fixture = await build({ stdin: { contents: `
    import React, {useState} from 'react';
    import {createRoot} from 'react-dom/client';
    import ActivityPhoto from './client/src/components/activity-photo';
    import {activityPhotoSource} from './client/src/lib/activity-photos';
    window.source=activityPhotoSource;
    function App(){
      const [src,setSrc]=useState('/images/rafting.png');
      return <><ActivityPhoto id="main" src={src} alt="Rafting" loading="eager" fetchPriority="high" sizes="300px" style={{width:300,height:200,objectFit:'cover'}}/>
      <button onClick={()=>setSrc('/images/pottery.png')}>Select pottery</button>
      <ActivityPhoto id="broken" src="/missing.webp" srcSet="/missing-400.webp 400w, /missing-800.webp 800w" alt="Fallback" loading="eager" sizes="200px" style={{width:200,height:120}}/>
      <ActivityPhoto id="upload" src="/api/listing-images/42/1600.webp" alt="Uploaded" loading="eager" sizes="150px" style={{width:150,height:100}}/>
      <div style={{height:10000}}/><ActivityPhoto id="lazy" src="/images/golf.png" alt="Golf" sizes="200px" style={{width:200,height:140}}/>
      </>;
    }createRoot(document.getElementById('root')).render(<App/>);
  `, resolveDir: process.cwd(), loader: "tsx" }, alias: { "@": path.resolve("client/src") }, bundle: true, write: false, define: { "process.env.NODE_ENV": '"production"' }, jsx: "automatic" });
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(req.url);
    if (req.url === "/") { res.setHeader("Content-Type", "text/html"); return res.end('<div id="root"></div><script src="/fixture.js"></script>'); }
    if (req.url === "/fixture.js") { res.setHeader("Content-Type", "text/javascript"); return res.end(fixture.outputFiles[0].text); }
    const url = req.url.startsWith("/api/listing-images/42/") ? `/images/responsive/pottery-${req.url.split("/").pop().split(".")[0]}.webp` : req.url;
    const file = path.resolve("client/public" + url);
    if (!file.startsWith(path.resolve("client/public") + "/") || !fs.existsSync(file)) { res.statusCode = 404; return res.end(); }
    res.setHeader("Content-Type", "image/webp"); fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
  try {
    for (const dpr of [1, 2]) {
      requests.length = 0;
      const context = await browser.newContext({ viewport: { width: 375, height: 800 }, deviceScaleFactor: dpr });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle" });
      const current = id => page.locator(id).evaluate(i => ({ url: i.currentSrc, set: i.srcset, loaded: i.complete && i.naturalWidth > 0 }));
      assert.match((await current("#main")).url, new RegExp(`rafting-${dpr === 1 ? 400 : 800}\\.webp`));
      assert.match((await current("#upload")).url, /\/42\/400.webp$/);
      assert.ok((await current("#upload")).loaded, "Uploaded fixture image decoded");
      assert.match((await current("#broken")).set, /responsive\/fallback-/);
      assert.ok((await current("#broken")).loaded, "Responsive fallback decoded");
      assert.equal(requests.filter(r => /missing-/.test(r)).length, 1, "No failed-srcset loop");
      assert.ok(!requests.some(r => /golf-/.test(r)), "Below-fold image not requested initially");
      const supplied = await page.evaluate(() => window.source("/api/listing-images/42/1600.webp", "/custom.webp 400w").srcSet);
      assert.equal(supplied, "/custom.webp 400w", "Supplied uploaded srcSet preserved exactly");
      await page.getByRole("button", { name: "Select pottery" }).click();
      await page.waitForFunction(() => document.querySelector("#main").currentSrc.includes("pottery-"));
      await page.locator("#lazy").scrollIntoViewIfNeeded();
      await page.waitForFunction(() => { const i = document.querySelector("#lazy"); return i.complete && i.naturalWidth > 0; });
      assert.ok(requests.some(r => /golf-/.test(r)));
      console.log(`PASS DPR ${dpr}: source choice, uploads, finite fallback, source change, lazy loading`);
      await context.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
