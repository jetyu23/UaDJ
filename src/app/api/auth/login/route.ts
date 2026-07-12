import { NextRequest, NextResponse } from "next/server";
import { sha256, randomString } from "@/lib/pkce";

const AUTH_URL = "https://accounts.spotify.com/authorize";

const scopes = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-email",
].join(" ");

export async function GET(req: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!clientId || !base) {
    // Send them to the landing page, where the setup panel explains
    // exactly which variables are missing.
    return NextResponse.redirect(new URL("/?setup=1", req.url));
  }

  const redirectUri = `${base}/api/auth/callback`;
  const verifier = randomString(64);
  const challenge = await sha256(verifier);
  const state = randomString(24);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: scopes,
  });

  const res = NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);

  // The classic failure here: the verifier cookie set on one host
  // (localhost) and read on another (127.0.0.1). Browsers treat them as
  // different origins, so the callback sees hasVerifier: false. Fix is
  // consistency — one host everywhere — plus explicit sameSite so the
  // cookie survives the cross-site redirect back from Spotify.
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("pkce_verifier", verifier, cookieOpts);
  res.cookies.set("oauth_state", state, cookieOpts);
  return res;
}
