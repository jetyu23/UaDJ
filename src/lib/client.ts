"use client";

/** Fetch JSON; on 401 try one silent token refresh, then retry; else log in. */
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let res = await fetch(url, init);
  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshed.ok) {
      res = await fetch(url, init);
    } else {
      window.location.href = "/api/auth/login";
      throw new Error("redirecting to login");
    }
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
