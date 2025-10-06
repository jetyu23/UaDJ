// src/app/playlists/page.tsx
import { cookies } from "next/headers";

async function getPlaylists() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sp_access")?.value;
  if (!token) return [];

  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=20", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Your Playlists</h1>
      <ul className="space-y-3">
        {playlists.map((p: any) => (
          <li key={p.id} className="border rounded-xl p-4">
            <div className="font-medium">{p.name}</div>
            <div className="text-sm opacity-70">{p.tracks?.total} tracks</div>
          </li>
        ))}
        {!playlists.length && <p>No playlists found (or not authenticated).</p>}
      </ul>
    </main>
  );
}
