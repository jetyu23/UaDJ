import { NextRequest, NextResponse } from "next/server";
import { accessToken, unauthorized, spGet } from "@/lib/spotifyServer";

export async function POST(req: NextRequest) {
  const token = await accessToken();
  if (!token) return unauthorized();

  const { name, uris } = (await req.json().catch(() => ({}))) as {
    name?: string;
    uris?: string[];
  };
  if (!name || !uris?.length) {
    return NextResponse.json({ error: "missing name or uris" }, { status: 400 });
  }

  const meRes = await spGet("/me", token);
  if (!meRes.ok) return unauthorized();
  const me = await meRes.json();

  const createRes = await fetch(
    `https://api.spotify.com/v1/users/${me.id}/playlists`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: "Reordered for harmonic transitions by UaDJ",
        public: false,
      }),
    }
  );
  if (!createRes.ok) {
    return NextResponse.json({ error: "playlist creation failed" }, { status: 500 });
  }
  const created = await createRes.json();

  for (let i = 0; i < uris.length; i += 100) {
    await fetch(`https://api.spotify.com/v1/playlists/${created.id}/tracks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: uris.slice(i, i + 100) }),
    });
  }

  return NextResponse.json({
    ok: true,
    url: created.external_urls?.spotify ?? null,
  });
}
