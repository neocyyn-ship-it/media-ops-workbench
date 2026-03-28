export const SITE_AUTH_COOKIE = "media_ops_gate";

const SITE_AUTH_NAMESPACE = "media-ops-workbench:v1";
const DEFAULT_SITE_PASSWORD = "123";

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toHex(new Uint8Array(digest));
}

export function getSitePassword() {
  return process.env.SITE_PASSWORD?.trim() || DEFAULT_SITE_PASSWORD;
}

export async function createSiteAuthToken(password = getSitePassword()) {
  return sha256(`${SITE_AUTH_NAMESPACE}:${password}`);
}

export async function isValidSiteAuthToken(token?: string | null) {
  if (!token) return false;
  return token === (await createSiteAuthToken());
}
