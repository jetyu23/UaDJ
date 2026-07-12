/**
 * Camelot wheel — the harmonic-mixing model DJs actually use.
 *
 * 12 positions × 2 modes. Letter A = minor (inner ring), B = major (outer).
 * Compatible transitions:
 *   - same key            (8A → 8A)   seamless
 *   - relative maj/min    (8A → 8B)   seamless
 *   - ±1 on the wheel     (8A → 7A/9A) smooth
 *   - +2 same ring        (8A → 10A)  usable "energy jump"
 * Everything else clashes to a degree that scales with wheel distance.
 *
 * Note: this is deliberately NOT chromatic (semitone) distance. C and G are a
 * fifth apart (7 semitones) but sit adjacent on the wheel and mix perfectly;
 * C and C# are 1 semitone apart and clash. The wheel encodes the circle of
 * fifths, which is the correct geometry for mixing.
 */

export type ParsedCamelot = { num: number; letter: "A" | "B" };

/**
 * Convert a musical key + mode into Camelot notation.
 * key: pitch name ("C", "F#", "Db", ...) OR Spotify's 0-11 pitch class as a
 *      string/number. mode: "1"/"major" = major → B ring, "0"/"minor" = A.
 *
 * The wheel is the circle of fifths: major keys clockwise from C = 8B, minor
 * keys offset by 3 semitones (relative minor). This is derived here rather
 * than read from the provider, since this API returns key+mode, not Camelot.
 */
const PITCH_CLASS: Record<string, number> = {
  C: 0, "B#": 0,
  "C#": 1, DB: 1,
  D: 2,
  "D#": 3, EB: 3,
  E: 4, FB: 4,
  F: 5, "E#": 5,
  "F#": 6, GB: 6,
  G: 7,
  "G#": 8, AB: 8,
  A: 9,
  "A#": 10, BB: 10,
  B: 11, CB: 11,
};

// Major pitch class → Camelot number (the B ring). Circle of fifths:
// C=8B, G=9B, D=10B ... each +7 semitones advances one wheel number.
const MAJOR_TO_CAMELOT: Record<number, number> = {
  0: 8, 7: 9, 2: 10, 9: 11, 4: 12, 11: 1,
  6: 2, 1: 3, 8: 4, 3: 5, 10: 6, 5: 7,
};
// Minor pitch class → Camelot number (the A ring). A minor = 8A, and A minor
// is the relative minor of C major (8B), so a minor key's number equals the
// number of the major key 3 semitones ABOVE it.
const MINOR_TO_CAMELOT: Record<number, number> = Object.fromEntries(
  Object.entries(MAJOR_TO_CAMELOT).map(([pc, num]) => [
    (Number(pc) + 9) % 12, // relative minor sits 3 semitones below major (=+9 mod 12)
    num,
  ])
) as Record<number, number>;

export function toCamelot(
  key: string | number | null | undefined,
  mode: string | number | null | undefined
): string | null {
  if (key == null) return null;

  let pc: number | null = null;
  if (typeof key === "number") pc = ((key % 12) + 12) % 12;
  else if (/^\d+$/.test(key.trim())) pc = ((Number(key) % 12) + 12) % 12;
  else pc = PITCH_CLASS[key.trim().toUpperCase()] ?? null;
  if (pc == null) return null;

  const m = String(mode).trim().toLowerCase();
  const isMajor = m === "1" || m === "1.0" || m === "major" || m === "maj";

  const num = isMajor ? MAJOR_TO_CAMELOT[pc] : MINOR_TO_CAMELOT[pc];
  if (num == null) return null;
  return isMajor ? `${num}B` : `${num}A`;
}

export function parseCamelot(s?: string | null): ParsedCamelot | null {
  if (!s) return null;
  const m = /^([1-9]|1[0-2])\s*([ABab])$/.exec(s.trim());
  if (!m) return null;
  return { num: Number(m[1]), letter: m[2].toUpperCase() as "A" | "B" };
}

export function camelotCost(
  a: ParsedCamelot | null,
  b: ParsedCamelot | null
): number {
  if (!a || !b) return 0.6; // unknown key: mildly discouraged, never fatal
  const raw = Math.abs(a.num - b.num);
  const d = Math.min(raw, 12 - raw);
  const sameRing = a.letter === b.letter;

  if (d === 0) return sameRing ? 0 : 0.08; // same key / relative
  if (d === 1 && sameRing) return 0.1; // wheel neighbour
  if (d === 2 && sameRing) return 0.45; // energy jump — usable
  if (d === 1 && !sameRing) return 0.55; // diagonal — risky
  return Math.min(1, 0.5 + 0.09 * d);
}

export function bpmCost(a?: number | null, b?: number | null): number {
  if (!a || !b) return 0.6;
  // Octave matching: 85 BPM mixes into 170 BPM (half/double time).
  const diff = Math.min(
    Math.abs(a - b),
    Math.abs(a * 2 - b),
    Math.abs(a - b * 2)
  );
  // ~3 BPM is beatmatchable by ear; 16+ needs a hard cut.
  return Math.min(1, diff / 16);
}

export type Mixable = { bpm?: number | null; cam: ParsedCamelot | null };

export function transitionCost(x: Mixable, y: Mixable): number {
  return 0.55 * bpmCost(x.bpm, y.bpm) + 0.45 * camelotCost(x.cam, y.cam);
}

export type TransitionLabel = "perfect" | "smooth" | "workable" | "rough";

export function transitionLabel(cost: number): TransitionLabel {
  if (cost <= 0.12) return "perfect";
  if (cost <= 0.3) return "smooth";
  if (cost <= 0.55) return "workable";
  return "rough";
}

/**
 * Key → colour, matching the convention DJ software uses: the Camelot wheel
 * is a hue circle. Adjacent keys get adjacent hues, so a harmonically ordered
 * playlist reads as a smooth gradient.
 */
export function camelotHue(cam: ParsedCamelot | null): string | null {
  if (!cam) return null;
  const hue = ((cam.num - 1) * 30 + 180) % 360; // 1A starts in the cyans
  const sat = cam.letter === "A" ? 62 : 74;
  const light = cam.letter === "A" ? 58 : 66;
  return `hsl(${hue} ${sat}% ${light}%)`;
}
