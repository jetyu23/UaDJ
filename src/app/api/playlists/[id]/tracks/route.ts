import { NextRequest, NextResponse } from "next/server";
import { accessToken, unauthorized, pagedItems } from "@/lib/spotifyServer";

type SpotifyPlaylistItem = {
  track: {
    id: string | null;
    uri: string;
    name: string;
    artists?: { name: string }[];
    album?: { images?: { url: string }[] };
    is_local?: boolean;
  } | null;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await accessToken();
  if (!token) return unauthorized();
  const { id } = await params;

  const items = await pagedItems<SpotifyPlaylistItem>(
    `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`,
    token
  );

  let skippedLocal = 0;
  const tracks = [];
  for (const item of items) {
    const t = item?.track;
    if (!t) continue;
    if (!t.id || t.is_local) {
      skippedLocal++;
      continue;
    }
    tracks.push({
      id: t.id,
      uri: t.uri,
      name: t.name,
      artists: (t.artists ?? []).map((a) => a.name).join(", "),
      art: t.album?.images?.at(-1)?.url ?? null,
    });
  }

  return NextResponse.json({ tracks, skippedLocal });
}
