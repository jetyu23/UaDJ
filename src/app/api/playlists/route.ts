import { NextResponse } from "next/server";
import { accessToken, unauthorized, pagedItems } from "@/lib/spotifyServer";

type SpotifyPlaylist = {
  id: string;
  name: string;
  images?: { url: string }[];
  tracks?: { total?: number };
  owner?: { display_name?: string };
};

export async function GET() {
  const token = await accessToken();
  if (!token) return unauthorized();

  const items = await pagedItems<SpotifyPlaylist>(
    "https://api.spotify.com/v1/me/playlists?limit=50",
    token
  );

  const playlists = items
    .filter((p) => p && p.id)
    .map((p) => ({
      id: p.id,
      name: p.name,
      art: p.images?.[0]?.url ?? null,
      total: p.tracks?.total ?? 0,
      owner: p.owner?.display_name ?? "",
    }));

  return NextResponse.json({ playlists });
}
