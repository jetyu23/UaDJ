import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

type Track = { uri: string; id: string; tempo?: number; key?: number; mode?: number };

export async function POST(req: NextRequest) {
  const { playlistId } = await req.json();
  const c = await cookies();
  const token = c.get("sp_access")?.value;
  if (!token || !playlistId) return NextResponse.json({ error: "Unauthorized or missing playlistId" }, { status: 400 });

  // 1) Fetch all playlist tracks
  const tracks: Track[] = [];
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  while (url) {
    const pageRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!pageRes.ok) break;
    const page = await pageRes.json();
    for (const item of page.items ?? []) {
      const t = item.track;
      if (!t?.id || !t?.uri) continue;
      tracks.push({ id: t.id, uri: t.uri });
    }
    url = page.next;
  }
  if (!tracks.length) return NextResponse.json({ error: "No tracks" }, { status: 400 });

  // 2) Fetch audio features (batch 100)
  for (let i = 0; i < tracks.length; i += 100) {
    const ids = tracks.slice(i, i + 100).map(t => t.id).join(",");
    const afRes = await fetch(`https://api.spotify.com/v1/audio-features?ids=${ids}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!afRes.ok) continue;
    const af = await afRes.json();
    for (const f of af.audio_features ?? []) {
      const t = tracks.find(x => x.id === f?.id);
      if (t && f) { t.tempo = f.tempo ?? undefined; t.key = f.key ?? undefined; t.mode = f.mode ?? undefined; }
    }
  }

  // 3) MVP ordering: greedy by BPM+key cost
  const keyDistance = (a: Track, b: Track) => {
    if (a.key == null || b.key == null) return 2;
    const d = Math.abs(a.key - b.key);
    const wrap = Math.min(d, 12 - d);
    const modePenalty = (a.mode !== b.mode) ? 0.5 : 0;
    return wrap / 6 + modePenalty;
  };
  const tempoDistance = (a: Track, b: Track) => {
    if (a.tempo == null || b.tempo == null) return 1;
    // allow octave tempo matching
    const diff = Math.min(
      Math.abs(a.tempo - b.tempo),
      Math.abs(a.tempo * 2 - b.tempo),
      Math.abs(a.tempo - b.tempo * 2)
    );
    return diff / 100;
  };
  const cost = (a: Track, b: Track) => tempoDistance(a, b) + keyDistance(a, b);

  const pool = tracks.slice();
  const ordered: Track[] = [];
  let current = pool.shift()!;
  ordered.push(current);
  while (pool.length) {
    let bestIdx = 0, best = Infinity;
    for (let i = 0; i < pool.length; i++) {
      const cst = cost(current, pool[i]);
      if (cst < best) { best = cst; bestIdx = i; }
    }
    current = pool.splice(bestIdx, 1)[0];
    ordered.push(current);
  }

  // 4) Create a new playlist and add URIs in batches
  const meRes = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${token}` } });
  const userId = (await meRes.json()).id;

  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Mixed by UaDJ", description: "Auto-ordered for smooth transitions", public: false }),
  });
  if (!createRes.ok) return NextResponse.json({ error: "Create playlist failed" }, { status: 500 });
  const created = await createRes.json();

  for (let i = 0; i < ordered.length; i += 100) {
    const uris = ordered.slice(i, i + 100).map(t => t.uri);
    await fetch(`https://api.spotify.com/v1/playlists/${created.id}/tracks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ uris }),
    });
  }

  return NextResponse.json({ ok: true, newPlaylistId: created.id, url: created.external_urls?.spotify });
}
