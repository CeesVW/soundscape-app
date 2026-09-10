// mockData.js
// Synthetic demo entries so the dashboard can be shown before the backend exists.
// Deterministic (seeded), so the demo looks identical on every device and every reload.
// Entries have exactly the same shape as real ones in localStorage "ss_data",
// plus `location`, `session` and `demo: true`.
//
// To change the story: edit MOCK_LOCATIONS (centre, spread, n, sources, notes).
// Delete this file when real data arrives.

export const MOCK_LOCATIONS = [
  {
    id: "Ward B, 4-bed room",
    center: [-0.36, 0.26], spread: [0.26, 0.32], n: 20, hours: [7, 21],
    sources: { voices: 0.8, medical: 0.6, alarms: 0.5, footsteps: 0.55, hvac: 0.35, music: 0.05 },
    info: [0.30, 0.45, 0.25],
    notes: [
      "Alarm from the bed opposite kept going for minutes",
      "Visitors talking across the room",
      "Cart wheels in the corridor, door left open",
      "Quiet spell after lunch, just the ventilation",
      "Nurse handover audible from the hallway",
    ],
  },
  {
    id: "Outpatient waiting area",
    center: [-0.05, 0.50], spread: [0.28, 0.22], n: 18, hours: [8, 17],
    sources: { voices: 0.9, footsteps: 0.6, alarms: 0.3, music: 0.35, traffic: 0.15, hvac: 0.2 },
    info: [0.50, 0.40, 0.10],
    notes: [
      "Number announcements over the speaker every minute",
      "TV on in the corner, nobody watching",
      "Children playing near the reception",
      "Coffee machine and sliding doors",
    ],
  },
  {
    id: "ICU corridor, night",
    center: [-0.42, -0.45], spread: [0.24, 0.24], n: 14, hours: [22, 29],
    sources: { hvac: 0.85, medical: 0.7, alarms: 0.55, footsteps: 0.3, voices: 0.25 },
    info: [0.15, 0.40, 0.45],
    notes: [
      "Constant hum, quite oppressive at night",
      "Monitor tones every few seconds, hard to ignore",
      "Very still, one alarm far away",
      "Ventilation dominates everything",
    ],
  },
  {
    id: "Rooftop garden",
    center: [0.58, -0.46], spread: [0.22, 0.24], n: 16, hours: [9, 19],
    sources: { nature: 0.85, water: 0.4, voices: 0.5, traffic: 0.4, hvac: 0.1 },
    info: [0.85, 0.15, 0.0],
    notes: [
      "Birds, some traffic from the street below",
      "Wind in the leaves, someone on the phone",
      "Fountain running, very restful",
      "Helicopter passed over, otherwise calm",
    ],
  },
];

// ─── Seeded random ────────────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gaussian = rnd => {
  const u = 1 - rnd(), v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const pad2 = n => String(n).padStart(2, "0");

// ─── Generator ────────────────────────────────────────────────────────────────
// wordPool: the app's WORD_POOL ({word, v, e}); quadLabel: the app's QUAD_LABEL(v, e).
// Passed in rather than imported so this file never imports from the app (no circular imports).
export function generateMockEntries({ wordPool, quadLabel, seed = 12913, startDate = "2026-08-17", days = 24 } = {}) {
  const rnd = mulberry32(seed);
  const t0 = Date.parse(startDate + "T00:00:00Z");
  const entries = [];
  let id = 1;

  for (const loc of MOCK_LOCATIONS) {
    for (let i = 0; i < loc.n; i++) {
      const v = clamp(loc.center[0] + gaussian(rnd) * loc.spread[0], -1, 1);
      const e = clamp(loc.center[1] + gaussian(rnd) * loc.spread[1], -1, 1);

      // timestamp: random day in range, hour within the location's typical window
      const day = Math.floor(rnd() * days);
      const hour = loc.hours[0] + Math.floor(rnd() * (loc.hours[1] - loc.hours[0]));
      const minute = Math.floor(rnd() * 60);
      const t = new Date(t0 + day * 86400000 + hour * 3600000 + minute * 60000);
      const timestamp = t.toISOString();

      // descriptors: 1–3 words from the 8 nearest to (v, e), biased towards the closest
      const nearest = wordPool
        .map(w => ({ word: w.word, d: Math.hypot(w.v - v, w.e - e) }))
        .sort((a, b) => a.d - b.d).slice(0, 8);
      const r = rnd();
      const k = r < 0.35 ? 1 : r < 0.8 ? 2 : 3;
      const descriptors = [];
      while (descriptors.length < k) {
        const w = nearest[Math.floor(Math.pow(rnd(), 1.7) * nearest.length)].word;
        if (!descriptors.includes(w)) descriptors.push(w);
      }

      // sources: each with its own probability for this location
      const sources = Object.entries(loc.sources).filter(([, p]) => rnd() < p).map(([s]) => s);

      // information value: weighted None / Some / High
      const ir = rnd();
      const information_value = ir < loc.info[0] ? 0 : ir < loc.info[0] + loc.info[1] ? 0.5 : 1;

      const free_note = rnd() < 0.3 ? loc.notes[Math.floor(rnd() * loc.notes.length)] : "";

      entries.push({
        id: `demo-${pad2(id++)}`,
        timestamp,
        assessment_type: rnd() < 0.85 ? "moment" : "space",
        valence: +v.toFixed(2),
        eventfulness: +e.toFixed(2),
        descriptors,
        sources,
        information_value,
        quadrant: quadLabel(v, e),
        free_note,
        location: loc.id,
        session: `${loc.id}|${timestamp.slice(0, 10)}`,
        demo: true,
      });
    }
  }
  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}