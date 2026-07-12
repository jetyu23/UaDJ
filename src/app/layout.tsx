import type { Metadata } from "next";
import "./globals.css";
import Cursor from "@/components/Cursor";

export const metadata: Metadata = {
  title: "UaDJ — harmonic playlist sequencer",
  description:
    "Reorders your Spotify playlists so every transition lands: key-matched on the Camelot wheel, tempo-locked by BPM.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Cursor />
        <header className="container nav">
          <a href="/" className="wordmark" data-hot>
            UaDJ
          </a>
        </header>
        {children}
      </body>
    </html>
  );
}
