import { NextResponse } from "next/server";
import { sha256, randomString } from "@/lib/pkce";

const AUTH_URL = "https://accounts.spotify.com/authorize";
const scopes = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-private",
  "playlist-modify-public",
  "user-read-email"
].join(" ");

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const redirectUri = `${base}/api/auth/callback`;

  const verifier = randomString(64);
  const challenge = await sha256(verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: scopes
  });

  const res = NextResponse.redirect(`${AUTH_URL}?${params.toString()}`);
  res.cookies.set("pkce_verifier", verifier, { httpOnly: true, path: "/", maxAge: 600 });
  return res;
}
