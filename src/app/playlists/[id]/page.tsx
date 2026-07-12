"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { parseCamelot, camelotHue } from "@/lib/camelot";
import EnergyCurve from "@/components/EnergyCurve";

type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  art: string | null;
  bpm?: number | null;
  camelot?: string | null;
  energy?: number | null;
  hasData?: boolean;
};

type Transition = {
  from: number;
  to: number;
  cost: number;
  label: "perfect" | "smooth" | "workable" | "rough";
};

type MixResponse = {
  tracks: Track[];
  order: number[];
  transitions: Transition[];
  avgBefore: number;
  avgAfter: number;
  analysed: number;
  total: number;
};

const STATUS_LINES = [
  "pulling the tracklist",
  "asking every track its key",
  "walking the Camelot wheel",
  "beatmatching on paper",
  "sequencing the set",
];

/** Human reason for a transition: the harmonic relation + BPM delta. */
function whyTransition(a: Track, b: Track): string {
  const pa = parseCamelot(a.camelot ?? null);
  const pb = parseCamelot(b.camelot ?? null);
  let rel = "unknown key";
  if (pa && pb) {
    const raw = Math.abs(pa.num - pb.num);
    const d = Math.min(raw, 12 - raw);
    const same = pa.letter === pb.letter;
    rel =
      d === 0 && same
        ? "same key"
        : d === 0
          ? "relative maj/min"
          : d === 1 && same
            ? "wheel neighbour"
            : d === 2 && same
              ? "energy jump"
              : d === 1
                ? "diagonal"
                : `${d} apart on the wheel`;
  }
  let bpm = "";
  if (a.bpm && b.bpm) {
    const d = Math.min(
      Math.abs(a.bpm - b.bpm),
      Math.abs(a.bpm * 2 - b.bpm),
      Math.abs(a.bpm - b.bpm * 2)
    );
    bpm = ` · Δ${Math.round(d)} bpm`;
  }
  const keys = `${a.camelot ?? "?"}→${b.camelot ?? "?"}`;
  return `${keys} · ${rel}${bpm}`;
}

function Row({
  t,
  rail,
  onPick,
  seeded,
}: {
  t: Track;
  rail?: boolean;
  onPick?: () => void;
  seeded?: boolean;
}) {
  const hue = camelotHue(parseCamelot(t.camelot ?? null));
  return (
    <div
      className={`trow${onPick ? " pickable" : ""}${seeded ? " seeded" : ""}`}
      data-hue={hue ?? undefined}
      data-hot={onPick ? true : undefined}
      onClick={onPick}
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      onKeyDown={onPick ? (e) => e.key === "Enter" && onPick() : undefined}
      style={rail && hue ? { borderLeft: `3px solid ${hue}` } : undefined}
      title={onPick ? "Open the set with this track" : undefined}
    >
      {t.art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.art} alt="" />
      ) : (
        <div className="noart-sm" />
      )}
      <div className="tmeta">
        <div className="tname">{t.name}</div>
        <div className="tartist">{t.artists}</div>
      </div>
      <div className="chips">
        {seeded ? <span className="chip seedchip">opener</span> : null}
        {t.bpm ? <span className="chip">{Math.round(t.bpm)} bpm</span> : null}
        {t.camelot && hue ? (
          <span className="chip key" style={{ color: hue }}>
            {t.camelot}
          </span>
        ) : t.hasData === false ? (
          <span className="chip">no data</span>
        ) : null}
      </div>
    </div>
  );
}

export default function PlaylistDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [mix, setMix] = useState<MixResponse | null>(null);
  const [seed, setSeed] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saveName, setSaveName] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api<{ tracks: Track[]; skippedLocal: number }>(
      `/api/playlists/${id}/tracks`
    )
      .then((d) => {
        setTracks(d.tracks);
        setSkipped(d.skippedLocal);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const analyse = async (seedId?: string | null) => {
    const chosen = seedId === undefined ? seed : seedId;
    setSeed(chosen ?? null);
    setBusy(true);
    setError(null);
    setSavedUrl(null);
    setStatusIdx(0);
    timer.current = setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_LINES.length),
      2600
    );
    try {
      const res = await api<MixResponse>("/api/mix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId: id,
          startTrackId: chosen ?? undefined,
        }),
      });
      setMix(res);
      setSaveName("UaDJ mix");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (timer.current) clearInterval(timer.current);
      setBusy(false);
    }
  };

  const save = async () => {
    if (!mix) return;
    setSaving(true);
    setError(null);
    try {
      const uris = mix.order.map((i) => mix.tracks[i].uri);
      const res = await api<{ url: string | null }>("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: saveName || "UaDJ mix", uris }),
      });
      setSavedUrl(res.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const flowScore = (avg: number) => Math.round((1 - avg) * 100);

  const orderedTracks = useMemo(
    () => (mix ? mix.order.map((i) => mix.tracks[i]) : []),
    [mix]
  );

  const seedName =
    seed &&
    (mix?.tracks.find((t) => t.id === seed)?.name ??
      tracks?.find((t) => t.id === seed)?.name);

  return (
    <main className="container">
      <div className="detail-head">
        <div>
          <p className="kicker">Playlist</p>
          <h1 className="display" style={{ fontSize: "2rem", margin: "8px 0 0" }}>
            {tracks ? `${tracks.length} tracks` : "…"}
          </h1>
          {skipped > 0 && (
            <p className="note">{skipped} local tracks skipped (no Spotify ID)</p>
          )}
          {seedName && (
            <p className="note">
              opener: {seedName}{" "}
              <button className="linklike" onClick={() => analyse(null)} data-hot>
                × clear
              </button>
            </p>
          )}
        </div>
        <button
          className="btn"
          onClick={() => analyse()}
          disabled={busy || !tracks}
          data-hot
        >
          {busy ? "Sequencing…" : mix ? "Re-run" : "Analyse & sequence"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {busy && (
        <p className="status">
          {STATUS_LINES[statusIdx]}
          <span className="dots" />
        </p>
      )}

      {!busy && !mix && tracks && (
        <div style={{ padding: "22px 0 60px" }}>
          <p className="col-title">Current order — click a track to open the set with it</p>
          <div style={{ display: "grid", gap: 6 }}>
            {tracks.map((t, i) => (
              <Row
                key={t.uri + i}
                t={t}
                onPick={() => analyse(t.id)}
                seeded={seed === t.id}
              />
            ))}
          </div>
        </div>
      )}

      {mix && !busy && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="num">
                {flowScore(mix.avgBefore)} →{" "}
                <span className="zap">{flowScore(mix.avgAfter)}</span>
              </div>
              <div className="lab">flow score</div>
            </div>
            <div className="stat">
              <div className="num">
                {
                  mix.transitions.filter(
                    (t) => t.label === "perfect" || t.label === "smooth"
                  ).length
                }
                /{mix.transitions.length}
              </div>
              <div className="lab">clean transitions</div>
            </div>
            <div className="stat">
              <div className="num">
                {mix.analysed}/{mix.total}
              </div>
              <div className="lab">tracks analysed</div>
            </div>
          </div>

          <EnergyCurve values={mix.order.map((i) => mix.tracks[i].energy ?? null)} />

          <div className="savebox">
            <input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="New playlist name"
              aria-label="New playlist name"
            />
            <button className="btn" onClick={save} disabled={saving} data-hot>
              {saving ? "Saving…" : "Save to Spotify"}
            </button>
            {savedUrl && (
              <a className="btn ghost" href={savedUrl} target="_blank" data-hot>
                Open in Spotify ↗
              </a>
            )}
          </div>

          <div className="columns">
            <div>
              <p className="col-title">Before — click a track to reopen with it</p>
              <div style={{ display: "grid", gap: 6 }}>
                {mix.tracks.map((t, i) => (
                  <Row
                    key={"b" + t.uri + i}
                    t={t}
                    onPick={() => analyse(t.id)}
                    seeded={seed === t.id}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="col-title">After — key colours should flow</p>
              <div>
                {orderedTracks.map((t, i) => (
                  <div key={"a" + t.uri + i}>
                    {i > 0 && (
                      <div
                        className={`gap ${mix.transitions[i - 1].label}`}
                        title={whyTransition(orderedTracks[i - 1], t)}
                      >
                        <span className="tick" />
                        <span className="tlab">
                          {mix.transitions[i - 1].label}
                        </span>
                        <span className="why">
                          {whyTransition(orderedTracks[i - 1], t)}
                        </span>
                      </div>
                    )}
                    <Row t={t} rail seeded={i === 0 && seed === t.id} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
