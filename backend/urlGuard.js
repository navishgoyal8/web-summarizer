import dns from "node:dns/promises";
import net from "node:net";

export class UserError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function isPrivateIPv4(ip) {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isPrivateIPv6(ip) {
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::") return true;
  if (v.startsWith("::ffff:")) {
    const mapped = v.slice(7);
    return net.isIPv4(mapped) ? isPrivateIPv4(mapped) : true;
  }
  return /^(fc|fd|fe[89ab])/.test(v);
}

export async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UserError("That doesn't look like a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new UserError("Only http and https URLs are supported.");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses;
  if (net.isIP(host)) {
    addresses = [{ address: host }];
  } else {
    try {
      addresses = await dns.lookup(host, { all: true });
    } catch {
      throw new UserError("Could not resolve that domain.");
    }
  }

  for (const { address } of addresses) {
    const blocked = net.isIPv4(address) ? isPrivateIPv4(address) : isPrivateIPv6(address);
    if (blocked) throw new UserError("That address is not allowed.");
  }
  return url;
}