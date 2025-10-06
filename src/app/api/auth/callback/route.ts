// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const verifier = req.cookies.get("pkce_verifier")?.value;
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const redirectUri = `${base}/api/auth/callback`;

  if (!code || !verifier) {
    console.log("callback: missing", { hasCode: !!code, hasVerifier: !!verifier, base, redirectUri });
    return NextResponse.redirect(new URL("/", req.url));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: verifier,
  });

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    console.log("callback: tokenRes not ok", tokenRes.status);
    return NextResponse.redirect(new URL("/", req.url));
  }

  const tokens = await tokenRes.json();
  console.log("callback: got tokens", { hasAccess: !!tokens.access_token, expires: tokens.expires_in });

  const res = NextResponse.redirect(`${base}/playlists`);

  // DEV-friendly cookie flags
  res.cookies.set("sp_access", tokens.access_token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in, // seconds
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
