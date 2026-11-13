/** Controlled DEV-only proxy probe. No documents or application records created. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT || !process.env.REPLIT_DEV_DOMAIN) throw Error("Replit development only");
const { pool } = await import("../server/db");
const { applicationKey, canonicalClientIp } = await import("../server/application-limits");
const observationFile = "/tmp/application-proxy-observation.json";
try {
  if (process.argv.includes("--observe")) {
    // Stop the normal DEV workflow first. This isolated listener has no routes,
    // sessions, files, documents or application writes and exposes no IP details.
    // Observe the SAME ingress path, not internet egress to a different service.
    const nonce = randomUUID();
    const observations: string[] = [];
    const listener = createServer((req, res) => {
      if (req.headers["x-probe-token"] !== nonce) { res.statusCode = 404; res.end(); return; }
      const chain = String(req.headers["x-forwarded-for"] ?? "").split(",").map(s => canonicalClientIp(s.trim()));
      assert.equal(chain.some(ip => ip.startsWith("203.0.113.") || ip.startsWith("198.51.100.")), false,
        "Actual edge must remove our forged forwarding chain");
      assert.ok(chain.length >= 1);
      observations.push(applicationKey("ip", chain[0]));
      res.end("ok");
    });
    try {
      await new Promise<void>(resolve => listener.listen(5000, "0.0.0.0", resolve));
      for (let i = 1; i <= 2; i++) {
        const r = await fetch(`https://${process.env.REPLIT_DEV_DOMAIN}/`, {
          headers: { "x-probe-token": nonce, "X-Forwarded-For": `203.0.113.${i}, 198.51.100.${i}` },
          signal: AbortSignal.timeout(15000),
        });
        assert.equal(r.status, 200); await r.text();
      }
      assert.equal(observations.length, 2); assert.equal(observations[0], observations[1]);
      await writeFile(observationFile, JSON.stringify({ digest: observations[0] }), { mode: 0o600 });
      console.log("PASS independent same-ingress DEV observation: edge removed rotating forged chain; source stable. Restore workflow before enforcement probe.");
    } finally {
      listener.closeAllConnections(); await new Promise<void>(resolve => listener.close(() => resolve()));
    }
    process.exitCode = 0;
  } else {
  const { digest } = JSON.parse(await readFile(observationFile, "utf8")) as { digest: string };
  const prior = await pool.query("SELECT id FROM public.application_submission_attempts WHERE scope='ip' AND key_hash=$1", [digest]);
  assert.equal(prior.rows.length, 0, "Probe egress already has admission state; do not clear someone else's quota");
  try {
    for (let i = 0; i < 4; i++) {
      const form = new FormData(); form.append("application", "{}");
      const result = await fetch(`https://${process.env.REPLIT_DEV_DOMAIN}/api/vendor-applications`, {
        method: "POST", body: form, headers: {
          "X-Forwarded-For": `203.0.113.${i + 1}, 198.51.100.${i + 1}`,
          "X-Real-IP": `192.0.2.${i + 1}`, "True-Client-IP": `192.0.2.${i + 1}`,
        },
      });
      await result.arrayBuffer();
      assert.equal(result.status, i < 3 ? 400 : 429, "Forged headers must not rotate real quota");
    }
    const actual = await pool.query("SELECT id FROM public.application_submission_attempts WHERE scope='ip' AND key_hash=$1", [digest]);
    assert.equal(actual.rows.length, 3, "Trusted IP must match independently observed same-ingress source");
    console.log("PASS actual Replit DEV proxy: independently observed source matched; rotating forged headers did not bypass 3/hour");
  } finally {
    // Only this probe's otherwise-unused keyed state. No application/documents touched.
    await pool.query("DELETE FROM public.application_submission_attempts WHERE scope='ip' AND key_hash=$1", [digest]);
  }
  }
} finally { await pool.end(); }
