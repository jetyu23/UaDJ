import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function accessToken(): Promise<string | null> {
  const c = await cookies();
  return c.get("sp_access")?.value ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

export async function spGet(path: string, token: string): Promise<Response> {
  return fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

/** Follow Spotify's `next` pagination links and return all items. */
export async function pagedItems<T>(
  firstUrl: string,
  token: string
): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = firstUrl;
  while (url) {
    const res: Response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) break;
    const page: { items?: T[]; next: string | null } = await res.json();
    items.push(...(page.items ?? []));
    url = page.next;
  }
  return items;
}
