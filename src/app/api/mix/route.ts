import { NextRequest, NextResponse } from "next/server";
import { accessToken, unauthorized, pagedItems } from "@/lib/spotifyServer";
import { getFeaturesBatch } from "@/lib/features";
import { orderTracks } from "@/lib/mix";

const MAX_TRACKS = 150; // free-tier API quota protection

type SpotifyPlaylistItem = {
  track: {
    id: string | null;
    uri: string;
    name: string;
    artists?: { name: string }[];
    album?: { images?: { url: string }[] };
    external_ids?: { isrc?: string };
    is_local?: boolean;
  } | null;
};

export async function POST(req: NextRequest) {
  const token = await accessToken();
  if (!token) return unauthorized();

  if (!process.env.RAPIDAPI_KEY) {
    return NextResponse.json(
      {
        error:
          "RAPIDAPI_KEY is missing from .env.local — add it and restart the dev server",
      },
      { status: 400 }
    );
  }

  const { playlistId, startTrackId } = await req.json().catch(() => ({}));
  if (!playlistId) {
    return NextResponse.json({ error: "missing playlistId" }, { status: 400 });
  }

  const items = await pagedItems<SpotifyPlaylistItem>(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`,
    token
  );

  const tracks = items
    .map((i) => i?.track)
    .filter((t): t is NonNullable<typeof t> => !!t && !!t.id && !t.is_local)
    .map((t) => ({
      id: t.id as string,
      uri: t.uri,
      name: t.name,
      artists: (t.artists ?? []).map((a) => a.name).join(", "),
      art: t.album?.images?.at(-1)?.url ?? null,
      isrc: t.external_ids?.isrc ?? null,
    }));

  if (!tracks.length) {
    return NextResponse.json({ error: "no analysable tracks" }, { status: 400 });
  }
  if (tracks.length > MAX_TRACKS) {
    return NextResponse.json(
      {
        error: `playlist has ${tracks.length} tracks; the free analysis tier caps at ${MAX_TRACKS} per run`,
      },
      { status: 400 }
    );
  }

  const { features, statuses } = await getFeaturesBatch(
    tracks.map((t) => ({ id: t.id, isrc: t.isrc }))
  );

  const enriched = tracks.map((t) => {
    const f = features.get(t.id) ?? null;
    return {
      ...t,
      bpm: f?.bpm ?? null,
      camelot: f?.camelot ?? null,
      energy: f?.energy ?? null,
      hasData: !!(f && (f.bpm || f.camelot)),
    };
  });

  const seedIndex = startTrackId
    ? enriched.findIndex((t) => t.id === startTrackId)
    : -1;

  const result = orderTracks(
    enriched.map((t) => ({ id: t.id, bpm: t.bpm, camelot: t.camelot })),
    seedIndex >= 0 ? seedIndex : undefined
  );

  const analysed = enriched.filter((t) => t.hasData).length;

  if (analysed === 0) {
    const hint = statuses["403"]
      ? "RapidAPI returned 403 for every track — your key isn't subscribed to this API. On rapidapi.com, open 'Track Analysis' by SoundNet → Pricing → subscribe to the free Basic plan, then re-run."
      : statuses["401"]
        ? "RapidAPI returned 401 — the RAPIDAPI_KEY in .env.local is invalid."
        : statuses["429"]
          ? "RapidAPI returned 429 — the free-tier quota is used up for now."
          : `no tracks could be analysed (provider statuses: ${JSON.stringify(statuses)})`;
    return NextResponse.json(
      { error: `Analysis failed for every track. ${hint}` },
      { status: 502 }
    );
  }

  return NextResponse.json({
    tracks: enriched,
    order: result.order,
    transitions: result.transitions,
    avgBefore: result.avgBefore,
    avgAfter: result.avgAfter,
    analysed,
    total: enriched.length,
  });
}
