import {
  parseCamelot,
  transitionCost,
  transitionLabel,
  type TransitionLabel,
} from "./camelot";

export type MixInput = { id: string; bpm: number | null; camelot: string | null };

export type Transition = {
  from: number; // index into the ORIGINAL track array
  to: number;
  cost: number;
  label: TransitionLabel;
};

export type MixResult = {
  order: number[]; // indices into the original array, optimised sequence
  transitions: Transition[];
  avgAfter: number;
  avgBefore: number;
};

/**
 * Ordering a playlist for minimal total transition cost is an open Travelling
 * Salesman path. Exact solutions are infeasible past ~20 tracks, so:
 *   1. greedy nearest-neighbour from several candidate starts,
 *   2. keep the best path,
 *   3. one bounded 2-opt sweep to untangle the greedy tour's crossings.
 * For playlist sizes (< 150) this runs in milliseconds and lands close
 * enough to optimal that transitions are what matter, not the last 2%.
 */
export function orderTracks(
  tracks: MixInput[],
  startIndex?: number
): MixResult {
  const n = tracks.length;
  const pc = tracks.map((t) => ({ bpm: t.bpm, cam: parseCamelot(t.camelot) }));

  // Pairwise cost matrix.
  const C: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 0 : transitionCost(pc[i], pc[j])))
  );

  const seq = (path: number[]) => {
    let total = 0;
    for (let k = 1; k < path.length; k++) total += C[path[k - 1]][path[k]];
    return total;
  };

  const greedy = (start: number) => {
    const used = new Array<boolean>(n).fill(false);
    const path = [start];
    used[start] = true;
    let cur = start;
    for (let k = 1; k < n; k++) {
      let bi = -1;
      let bc = Infinity;
      for (let j = 0; j < n; j++) {
        if (!used[j] && C[cur][j] < bc) {
          bc = C[cur][j];
          bi = j;
        }
      }
      used[bi] = true;
      path.push(bi);
      cur = bi;
    }
    return path;
  };

  // Candidate starts: the lowest-BPM track (a natural warm-up opener) plus a
  // spread of others. Greedy quality is start-sensitive; this hedges it.
  let best: number[] = [];
  if (startIndex != null && startIndex >= 0 && startIndex < n) {
    // The user chose the opener — honour it and sequence from there.
    best = greedy(startIndex);
  } else {
    const byBpm = [...tracks.keys()].sort(
      (a, b) => (tracks[a].bpm ?? 999) - (tracks[b].bpm ?? 999)
    );
    const starts = new Set<number>([byBpm[0]]);
    const k = Math.min(15, n);
    for (let i = 0; i < k; i++) starts.add(Math.floor((i * n) / k));

    let bestCost = Infinity;
    for (const s of starts) {
      const p = greedy(s);
      const c = seq(p);
      if (c < bestCost) {
        bestCost = c;
        best = p;
      }
    }
  }

  // 2-opt: reverse any segment whose reversal lowers total cost. Costs are
  // asymmetric-safe here because transitionCost(a,b) === transitionCost(b,a).
  const path = best.slice();
  let improved = true;
  let sweeps = 0;
  while (improved && sweeps++ < 3) {
    improved = false;
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        const delta =
          C[path[i - 1]][path[j]] +
          C[path[i]][path[j + 1]] -
          C[path[i - 1]][path[i]] -
          C[path[j]][path[j + 1]];
        if (delta < -1e-9) {
          const seg = path.slice(i, j + 1).reverse();
          path.splice(i, seg.length, ...seg);
          improved = true;
        }
      }
    }
  }

  const transitions: Transition[] = [];
  for (let m = 1; m < path.length; m++) {
    const cost = C[path[m - 1]][path[m]];
    transitions.push({
      from: path[m - 1],
      to: path[m],
      cost,
      label: transitionLabel(cost),
    });
  }

  const before = [...tracks.keys()];
  const avgBefore = n > 1 ? seq(before) / (n - 1) : 0;
  const avgAfter = n > 1 ? seq(path) / (n - 1) : 0;

  return { order: path, transitions, avgAfter, avgBefore };
}
