const fs = require("node:fs");
const assert = require("node:assert/strict");
const root = "generated-artifacts/responsive-photos";
const before = JSON.parse(fs.readFileSync(`${root}/before/measurements.json`, "utf8"));
const after = JSON.parse(fs.readFileSync(`${root}/after/measurements.json`, "utf8"));
const manifest = require("../client/src/lib/curated-photos.json");
const originals = Object.fromEntries(Object.entries(manifest).flatMap(([key, value]) => value.variants.map(v => [v.src, key])));
assert.equal(before.length, 12); assert.equal(after.length, 12);
const rows = [];
for (const old of before) {
  const next = after.find(r => r.route === old.route && r.width === old.width && r.dpr === old.dpr);
  assert.ok(next);
  assert.deepEqual(next.errors, []); assert.deepEqual(old.errors, []);
  assert.equal(next.selected.length, old.selected.length);
  for (const [i, img] of next.selected.entries()) {
    assert.equal(originals[img.src] || img.src, old.selected[i].src, "Same underlying artwork and order");
    assert.equal(img.width, old.selected[i].width, "Same rendered width");
    assert.equal(img.height, old.selected[i].height, "Same rendered height");
  }
  assert.ok(next.full.entries.every(i => i.status === 200), "Successful image responses");
  assert.ok(!next.full.entries.some(i => /\/images\/[^/]+\.png$/.test(i.url)), "No original curated PNG downloaded");
  for (const phase of ["initial", "full"]) {
    const b = old[phase], a = next[phase];
    assert.ok(a.bytes < b.bytes, "No byte regression");
    rows.push([old.route, old.width, old.dpr, phase, b.bytes, a.bytes, (100 - 100 * a.bytes / b.bytes).toFixed(1), b.requests, a.requests,
      b.largest.url.split("/").pop(), b.largest.bytes, a.largest.url.split("/").pop(), a.largest.bytes]);
  }
}
const header = ["page", "width", "dpr", "phase", "before_bytes", "after_bytes", "reduction_percent", "before_requests", "after_requests", "before_largest", "before_largest_bytes", "after_largest", "after_largest_bytes"];
fs.writeFileSync(`${root}/download-report.csv`, [header, ...rows].map(row => row.join(",")).join("\n") + "\n");
for (const phase of ["initial", "full"]) {
  console.log(`\n${phase}\n| Page | Width / DPR | Before bytes | After bytes | Saved | Requests before/after | Largest before/after (bytes) |\n|---|---|---:|---:|---:|---|---|`);
  for (const r of rows.filter(r => r[3] === phase)) console.log(`| ${r[0]} | ${r[1]} / ${r[2]} | ${r[4]} | ${r[5]} | ${r[6]}% | ${r[7]}/${r[8]} | ${r[9]} (${r[10]}) / ${r[11]} (${r[12]}) |`);
}
console.log("\nPASS: all 12 cases preserve artwork/order/rendered dimensions; no original PNG, failed image, uncaught browser error or byte regression.");
