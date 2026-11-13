import { createHmac } from "node:crypto";
import { BlockList, isIP } from "node:net";
import type { Request, RequestHandler, Response } from "express";
import { storage } from "./storage";

export type ApplicationAttemptStore = Pick<typeof storage, "reserveApplicationAttempt">;
const internalProxies = new BlockList();
for (const [address, prefix] of [["127.0.0.0", 8], ["10.0.0.0", 8], ["172.16.0.0", 12], ["192.168.0.0", 16], ["169.254.0.0", 16]] as const) {
  internalProxies.addSubnet(address, prefix, "ipv4");
}
for (const [address, prefix] of [["::1", 128], ["fc00::", 7], ["fe80::", 10]] as const) {
  internalProxies.addSubnet(address, prefix, "ipv6");
}

export function canonicalClientIp(value: string | undefined): string {
  if (!value || !isIP(value)) throw new Error("Client address unavailable");
  if (isIP(value) === 4) return value;
  // WHATWG URL canonicalizes equivalent IPv6 forms, including mapped IPv4.
  const normalized = new URL(`http://[${value}]/`).hostname.slice(1, -1);
  const mapped = normalized.match(/^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/);
  if (!mapped) return normalized;
  const parts = [parseInt(mapped[1], 16), parseInt(mapped[2], 16)];
  return [parts[0] >> 8, parts[0] & 255, parts[1] >> 8, parts[1] & 255].join(".");
}

export function applicationKey(scope: "ip" | "email", identity: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret?.trim()) throw new Error("Application admission unavailable");
  return createHmac("sha256", secret).update(`vendor-application:${scope}:${identity}`).digest("hex");
}

/** Application-only proxy boundary; does not change login/waiting-list policies. */
export function applicationClientIp(req: Request): string {
  if (!(process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DEPLOYMENT) || req.app.get("trust proxy") === false) {
    return canonicalClientIp(req.ip);
  }
  const socket = canonicalClientIp(req.socket.remoteAddress);
  const internal = (ip: string) => internalProxies.check(ip, isIP(ip) === 4 ? "ipv4" : "ipv6");
  // A directly connected public peer cannot supply a trusted forwarding chain.
  if (!internal(socket)) return socket;
  const header = req.headers["x-forwarded-for"];
  if (typeof header !== "string" || header.length > 2048) throw Error("Client address unavailable");
  const chain = header.split(",").map(part => canonicalClientIp(part.trim()));
  // Start at the socket, discard only internal proxy hops, stop at the first
  // untrusted/public peer. Never blindly select the leftmost supplied address.
  for (let i = chain.length - 1; i >= 0; i--) {
    if (!internal(chain[i]) || i === 0) return chain[i];
  }
  throw Error("Client address unavailable");
}

function unavailable(res: Response): false {
  res.set("Cache-Control", "no-store").status(503).json({
    message: "We can't accept your application right now. Please try again shortly.",
  });
  return false;
}

export async function admitApplication(
  scope: "ip" | "email", identity: string, res: Response, store: ApplicationAttemptStore = storage,
): Promise<boolean> {
  try {
    const result = await store.reserveApplicationAttempt(scope, applicationKey(scope, identity));
    if (result.allowed) return true;
    const minutes = Math.ceil(result.retryAfter / 60);
    res.set({ "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" }).status(429).json({
      message: `Too many application attempts. Please try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}, or contact hello@freespirit.club for help.`,
      retryAfter: result.retryAfter,
    });
    return false;
  } catch {
    // No error object: driver errors may contain keys/SQL or connection details.
    return unavailable(res);
  }
}

export const limitApplicationIp: RequestHandler = async (req, res, next) => {
  let ip: string;
  try { ip = applicationClientIp(req); }
  catch { unavailable(res); return; }
  if (await admitApplication("ip", ip, res)) next();
};
