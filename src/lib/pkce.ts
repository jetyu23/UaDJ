export async function sha256(buffer: string) {
  const data = new TextEncoder().encode(buffer);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function randomString(len = 64) {
  const rand = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(rand, b => ("0" + b.toString(16)).slice(-2)).join("");
}
