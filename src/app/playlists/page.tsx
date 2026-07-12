"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";

type Playlist = {
  id: string;
  name: string;
  art: string | null;
  total: number;
  owner: string;
};

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ playlists: Playlist[] }>("/api/playlists")
      .then((d) => setPlaylists(d.playlists))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <main className="container">
      <div className="detail-head">
        <div>
          <p className="kicker">Your library</p>
          <h1 className="display" style={{ fontSize: "2rem", margin: "8px 0 0" }}>
            Pick a playlist to sequence
          </h1>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {!playlists && !error && (
        <p className="status">
          reading your library<span className="dots" />
        </p>
      )}

      {playlists && (
        <div className="grid">
          {playlists.map((p) => (
            <Link key={p.id} href={`/playlists/${p.id}`} className="card" data-hot>
              {p.art ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.art} alt="" />
              ) : (
                <div className="noart">∅</div>
              )}
              <div className="meta">
                <div className="name">{p.name}</div>
                <div className="sub">
                  {p.total} tracks{p.owner ? ` · ${p.owner}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
