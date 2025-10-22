import { cookies } from "next/headers";

async function getPlaylists() {
  const c = await cookies();
  const token = c.get("sp_access")?.value;
  if (!token) return [];
  const res = await fetch("https://api.spotify.com/v1/me/playlists?limit=50", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.items ?? [];
}

export default async function PlaylistsPage() {
  const playlists = await getPlaylists();

  async function mix(playlistId: string) {
    "use server";
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mix`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playlistId }),
      cache: "no-store",
    });
  }

  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold mb-6">Your Playlists</h1>
      <ul className="space-y-3">
        {playlists.map((p: any) => (
          <li key={p.id} className="border rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              <div className="text-sm opacity-70">{p.tracks?.total} tracks</div>
            </div>
            <form action={async () => { await mix(p.id); }}>
              <button className="rounded-lg border px-3 py-1 hover:bg-black hover:text-white">Mix this</button>
            </form>
          </li>
        ))}
        {!playlists.length && <p>No playlists found (or not authenticated).</p>}
      </ul>
    </main>
  );
}
