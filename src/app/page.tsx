export default function Home() {
  const base = process.env.NEXT_PUBLIC_BASE_URL!; // http://127.0.0.1:3000
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="max-w-md text-center space-y-6">
        <h1 className="text-3xl font-bold">UaDJ</h1>
        <p>Optimise your playlist order for smoother transitions.</p>
        <a
          href={`${base}/api/auth/login`}
          className="inline-block rounded-xl px-5 py-3 border hover:bg-black hover:text-white transition"
        >
          Connect Spotify
        </a>
      </div>
    </main>
  );
}
