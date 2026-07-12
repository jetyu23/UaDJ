import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = req.cookies.get("pkce_verifier")?.value;
  const expectedState = req.cookies.get("oauth_state")?.value;

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const redirectUri = `${base}/api/auth/callback`;

  if (!code || !verifier || !state || state !== expectedState) {
    console.log("[auth] callback missing/invalid", {
      hasCode: !!code,
      hasVerifier: !!verifier,
      stateOk: !!state && state === expectedState,
      base,
    });
    return NextResponse.redirect(new URL("/?auth=failed", base));
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
    console.log("[auth] token exchange failed", tokenRes.status);
    return NextResponse.redirect(new URL("/?auth=failed", base));
  }

  const tokens = await tokenRes.json();
  const res = NextResponse.redirect(new URL("/playlists", base));

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
  // One-shot cookies: clean up after use.
  res.cookies.set("pkce_verifier", "", { path: "/", maxAge: 0 });
  res.cookies.set("oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}
