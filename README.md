# UaDJ — harmonic playlist sequencer

Reorders a Spotify playlist so consecutive tracks are harmonically and
rhythmically compatible, built for Spotify's
DJ mix feature. Reads each track's key and tempo, scores every possible
transition on the Camelot wheel, and sequences the playlist to minimise
total transition cost. Saves the result as a new playlist; never touches
the original.

## Why this needed a rebuild

The first version used Spotify's `/v1/audio-features` endpoint for BPM and
key. Spotify deprecated it for new apps on **27 November 2024** with no
replacement, which killed the original data layer overnight. This version
isolates audio analysis behind a provider interface (`src/lib/features.ts`)
and sources BPM + key from Music Metrics' Spotify Audio Features API instead
(Camelot is derived from key + mode in `src/lib/camelot.ts`),
so the next provider change is a one-file swap rather than a rewrite.

## How the sequencing works

- **Key distance is wheel distance, not semitone distance.** The Camelot
  wheel encodes the circle of fifths: `8A → 7A / 9A / 8B` are clean mixes.
  Chromatic distance gets this exactly backwards (C→G clashes by semitone
  math but mixes perfectly), so the cost function works on the wheel.
- **BPM distance allows octave matching** (85 BPM mixes into 170).
- Ordering is an open travelling-salesman path: multi-start greedy
  nearest-neighbour, then a bounded 2-opt pass. Milliseconds for playlist
  sizes, close enough to optimal that it doesn't matter.
- Each key gets its conventional hue, so a well-sequenced playlist renders
  as a smooth colour gradient — you can see the mix working before you
  hear it.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `SPOTIFY_CLIENT_ID` — from [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
     Set the app's redirect URI to exactly `http://127.0.0.1:3000/api/auth/callback`.
   - `RAPIDAPI_KEY` — subscribe (free tier) to "Spotify Audio Features /
     Track Analysis" by Music Metrics on RapidAPI. Subscribing to the
     specific API matters; the key alone returns 403.
3. `npm run dev`
4. Open **http://127.0.0.1:3000** — the IP, not `localhost`. They are
   different origins to a browser; mixing them silently drops the PKCE
   cookie and login loops back to the home page.

## Notes and limits

- Free-tier analysis quota: runs are capped at 150 tracks and results are
  cached in-process, so re-running a playlist doesn't re-spend quota.
- Tracks the provider doesn't know get a neutral cost and a "no data" chip rather than breaking the sequence.
- Auth is Spotify's PKCE flow with a state check; tokens live in httpOnly
  cookies and refresh silently once before asking you to log in again.

  ## Demo

https://github.com/user-attachments/assets/c2036ca0-5808-4db4-86b9-7c5a34e269de
  


