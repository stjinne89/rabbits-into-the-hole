import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

/** Hash a device secret as `salt:derivedKey` (both hex). */
export function hashSecret(secret: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(secret, salt, 32);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

/** Constant-time verify a plaintext secret against a stored hash. */
export function verifySecret(secret: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  const derived = scryptSync(secret, salt, expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/** Generate a URL-safe random secret to show the user once. */
export function generateSecret(): string {
  return randomBytes(18).toString("base64url");
}

/** Parse an HTTP Basic `Authorization` header into username/password. */
export function parseBasicAuth(
  header: string | null
): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx === -1) return null;
    return { username: decoded.slice(0, idx), password: decoded.slice(idx + 1) };
  } catch {
    return null;
  }
}
