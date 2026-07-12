import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const refresh = req.cookies.get("sp_refresh")?.value;
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  if (!refresh) {
    return NextResponse.json({ error: "no refresh token" }, { status: 401 });
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: clientId,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    return NextResponse.json({ error: "refresh failed" }, { status: 401 });
  }

  const tokens = await tokenRes.json();
  const res = NextResponse.json({ ok: true });
  res.cookies.set("sp_access", tokens.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });
  if (tokens.refresh_token) {
    res.cookies.set("sp_refresh", tokens.refresh_token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
