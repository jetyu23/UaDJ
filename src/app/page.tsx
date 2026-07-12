import Wheel from "@/components/Wheel";
import { envStatus } from "@/lib/env";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const sp = await searchParams;
  const failed = sp?.auth === "failed";
  const env = envStatus();
  const setupIncomplete = !env.authReady || !env.rapidApi;

  return (
    <main>
      <section className="container hero">
        <div>
          <p className="kicker">Harmonic playlist sequencer</p>
          <h1 className="display">
            Order your playlist
            <br />
            like a <span className="zap">DJ</span> would.
          </h1>
          <p className="lede">
            UaDJ reads the key and tempo of every track, walks the Camelot
            wheel, and reorders your playlist so each transition actually
            lands — built for Spotify&apos;s DJ mix feature.
          </p>

          {setupIncomplete && (
            <div className="setup">
              <p className="setup-title">Finish setup — .env.local</p>
              <ul>
                {!env.clientId && (
                  <li>
                    <code>SPOTIFY_CLIENT_ID</code> — from
                    developer.spotify.com/dashboard
                  </li>
                )}
                {!env.baseUrl && (
                  <li>
                    <code>NEXT_PUBLIC_BASE_URL</code> —{" "}
                    <code>http://127.0.0.1:3000</code>
                  </li>
                )}
                {!env.rapidApi && (
                  <li>
                    <code>RAPIDAPI_KEY</code> — Music Metrics &quot;Spotify Audio
                    Features / Track Analysis&quot; on RapidAPI (free tier);
                    needed at the analyse step
                  </li>
                )}
              </ul>
              <p className="setup-note">
                The file lives at the project root, next to package.json.
                Next.js reads it only at boot — restart{" "}
                <code>npm run dev</code> after saving.
              </p>
            </div>
          )}

          {failed && !setupIncomplete && (
            <p className="error">
              Spotify sign-in didn&apos;t complete. Hit connect and try again.
            </p>
          )}

          <p style={{ marginTop: 26 }}>
            {env.authReady ? (
              <a className="btn" href="/api/auth/login" data-hot>
                Connect Spotify
              </a>
            ) : (
              <span className="btn disabled">Connect Spotify</span>
            )}
          </p>
          <p className="hero-foot">
            creates a reordered copy · never edits your original · nothing
            stored
          </p>
        </div>
        <Wheel />
      </section>

      <section className="container steps">
        <div className="step">
          <div className="snum">01</div>
          <div className="slab">Read</div>
          <p className="stext">Every track&apos;s key and BPM, pulled per song.</p>
        </div>
        <div className="step">
          <div className="snum">02</div>
          <div className="slab">Sequence</div>
          <p className="stext">
            Shortest path around the Camelot wheel — neighbours mix, clashes
            don&apos;t.
          </p>
        </div>
        <div className="step">
          <div className="snum">03</div>
          <div className="slab">Save</div>
          <p className="stext">A new playlist in your library. Original untouched.</p>
        </div>
      </section>
    </main>
  );
}
