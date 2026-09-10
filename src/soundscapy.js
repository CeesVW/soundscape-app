// soundscapy.js
// Data layer for the Soundscape Assessment App.
//
//  - toRecord()          entry (as saved in localStorage "ss_data") -> ISD-shaped record
//  - toCSV() / downloadCSV()  Soundscapy-readable CSV
//  - summarize()         means, SDs, quadrant / descriptor / source / info-value counts
//  - kdeGrid(), massThreshold(), contourSegments()  the density maths behind the plot
//
// Nothing here touches React or the network. When Supabase arrives, only the
// storage side changes (where entries are read from / written to); this file stays.

export const SURVEY_VERSION = "SSA-0.9";

// Column order for the CSV. First block mirrors the International Soundscape
// Database (ISD) naming that Soundscapy expects; second block is app-specific.
export const CSV_COLUMNS = [
  "RecordID", "GroupID", "SessionID", "LocationID",
  "start_time", "end_time", "latitude", "longitude",
  "Language", "Survey_Version",
  "ISOPleasant", "ISOEventful",
  "assessment_type", "quadrant", "descriptors", "sources",
  "information_value", "free_note", "demo",
];

const round2 = x => Math.round(x * 100) / 100;
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ─── Entry -> ISD-shaped record ───────────────────────────────────────────────
// The app collects the two circumplex coordinates directly (sliders), not the
// eight PAQ items. Soundscapy plots from ISOPleasant / ISOEventful, so we export
// those and deliberately do NOT fabricate PAQ1–PAQ8 columns.
export function toRecord(entry, index = 0) {
  const ts = entry.timestamp || new Date().toISOString();
  const location = entry.location || "This device";
  const session = entry.session || `${slug(location)}_${ts.slice(0, 10)}`;
  return {
    RecordID: String(entry.id ?? index),
    GroupID: entry.group || session,        // one respondent per record; group = session for now
    SessionID: session,
    LocationID: location,
    start_time: ts,
    end_time: entry.end_time || ts,
    latitude: entry.latitude ?? "",
    longitude: entry.longitude ?? "",
    Language: entry.language || "eng",
    Survey_Version: SURVEY_VERSION,
    ISOPleasant: round2(entry.valence ?? 0),
    ISOEventful: round2(entry.eventfulness ?? 0),
    assessment_type: entry.assessment_type || "",
    quadrant: entry.quadrant || "",
    descriptors: entry.descriptors || [],
    sources: entry.sources || [],
    information_value: entry.information_value ?? "",
    free_note: entry.free_note || "",
    demo: !!entry.demo,
  };
}

// ─── CSV ──────────────────────────────────────────────────────────────────────
function csvCell(v) {
  if (Array.isArray(v)) v = v.join("; ");
  if (v === null || v === undefined) v = "";
  v = String(v);
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCSV(records) {
  const head = CSV_COLUMNS.join(",");
  const rows = records.map(r => CSV_COLUMNS.map(c => csvCell(r[c])).join(","));
  return [head, ...rows].join("\n");
}

export function downloadCSV(records, filename = "soundscape_assessments.csv") {
  const blob = new Blob([toCSV(records)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Summary statistics ───────────────────────────────────────────────────────
function meanSd(arr) {
  const n = arr.length;
  if (!n) return { mean: 0, sd: 0 };
  const mean = arr.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)) : 0;
  return { mean, sd };
}

function countBy(list) {
  const m = new Map();
  for (const k of list) m.set(k, (m.get(k) || 0) + 1);
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

export function summarize(records) {
  const n = records.length;
  const p = meanSd(records.map(r => r.ISOPleasant));
  const e = meanSd(records.map(r => r.ISOEventful));
  const quadrants = countBy(records.map(r => r.quadrant).filter(Boolean));
  const descriptors = countBy(records.flatMap(r => r.descriptors));
  const sources = countBy(records.flatMap(r => r.sources));
  const info = { none: 0, some: 0, high: 0 };
  for (const r of records) {
    if (r.information_value === 0) info.none++;
    else if (r.information_value === 0.5) info.some++;
    else if (r.information_value === 1) info.high++;
  }
  const times = records.map(r => Date.parse(r.start_time)).filter(t => !isNaN(t));
  return {
    n,
    pleasant: p, eventful: e,
    quadrants, descriptors, sources, info,
    first: times.length ? new Date(Math.min(...times)) : null,
    last: times.length ? new Date(Math.max(...times)) : null,
  };
}

// ─── Density (Gaussian KDE on a grid) ─────────────────────────────────────────
// Same idea as the seaborn KDE Soundscapy uses: sum of Gaussians, bandwidth by
// Scott's rule scaled by bwAdjust (Soundscapy's default is 1.2).
export function kdeGrid(points, { res = 56, lo = -1.15, hi = 1.15, bwAdjust = 1.2 } = {}) {
  const n = points.length;
  if (n < 2) return null;
  const sdOf = arr => Math.max(meanSd(arr).sd, 0.05);
  const scott = Math.pow(n, -1 / 6);
  const hx = Math.max(0.08, scott * sdOf(points.map(p => p.x)) * bwAdjust);
  const hy = Math.max(0.08, scott * sdOf(points.map(p => p.y)) * bwAdjust);
  const step = (hi - lo) / (res - 1);
  const grid = new Float64Array(res * res);
  const norm = 1 / (n * 2 * Math.PI * hx * hy);
  let max = 0, total = 0;
  for (let j = 0; j < res; j++) {
    const y = lo + j * step;
    for (let i = 0; i < res; i++) {
      const x = lo + i * step;
      let s = 0;
      for (const p of points) {
        const dx = (x - p.x) / hx, dy = (y - p.y) / hy;
        s += Math.exp(-0.5 * (dx * dx + dy * dy));
      }
      const v = s * norm;
      grid[j * res + i] = v;
      if (v > max) max = v;
      total += v;
    }
  }
  return { grid, res, lo, hi, step, max, total, hx, hy };
}

// Density value such that cells at or above it hold `frac` of the total mass.
// frac = 0.5 gives the "median contour" of Mitchell et al. (2022) / Soundscapy's
// density_type="simple".
export function massThreshold(k, frac = 0.5) {
  const sorted = Array.from(k.grid).sort((a, b) => b - a);
  let acc = 0;
  for (const v of sorted) {
    acc += v;
    if (acc >= frac * k.total) return v;
  }
  return 0;
}

// Marching squares. Returns line segments [x1, y1, x2, y2] in data coordinates.
// Segments are drawn individually, so no polygon assembly is needed.
const MS_CASES = [
  [], [[0, 3]], [[0, 1]], [[3, 1]],
  [[1, 2]], [[0, 3], [1, 2]], [[0, 2]], [[3, 2]],
  [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]],
  [[1, 3]], [[0, 1]], [[0, 3]], [],
];
export function contourSegments(k, level) {
  const { grid, res, lo, step } = k;
  const segs = [];
  const val = (i, j) => grid[j * res + i];
  for (let j = 0; j < res - 1; j++) {
    for (let i = 0; i < res - 1; i++) {
      // corners: c0=(i,j) c1=(i+1,j) c2=(i+1,j+1) c3=(i,j+1)
      const c = [val(i, j), val(i + 1, j), val(i + 1, j + 1), val(i, j + 1)];
      const idx = (c[0] >= level) | ((c[1] >= level) << 1) | ((c[2] >= level) << 2) | ((c[3] >= level) << 3);
      const cases = MS_CASES[idx];
      if (!cases.length) continue;
      const cx = [i, i + 1, i + 1, i], cy = [j, j, j + 1, j + 1];
      const edgePoint = e => {
        const a = e, b = (e + 1) % 4;
        const t = (level - c[a]) / (c[b] - c[a] || 1e-9);
        return [lo + (cx[a] + (cx[b] - cx[a]) * t) * step, lo + (cy[a] + (cy[b] - cy[a]) * t) * step];
      };
      for (const [ea, eb] of cases) {
        const [x1, y1] = edgePoint(ea), [x2, y2] = edgePoint(eb);
        segs.push([x1, y1, x2, y2]);
      }
    }
  }
  return segs;
}