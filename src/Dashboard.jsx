import React, { useMemo, useState } from "react";
import { toRecord, summarize, downloadCSV, kdeGrid, massThreshold, contourSegments } from "./soundscapy.js";
import { generateMockEntries, MOCK_LOCATIONS } from "./mockData.js";

// Dashboard.jsx — results view (cream theme, same as the welcome screen).
// Props come from the app so this file never imports from soundscape-app.jsx:
//   onBack      () => void
//   sources     the app's SOURCES  [{id,label}]
//   wordPool    the app's WORD_POOL [{word,v,e}]  (used by the demo generator)
//   quadLabel   the app's QUAD_LABEL(v,e)         (used by the demo generator)

const T = {
  bg: "#f4f2ed", ink: "#1a1a18", soft: "#6b7268", mute: "#9aaa9a",
  line: "rgba(26,26,24,0.10)", card: "rgba(26,26,24,0.045)", green: "#2d4a38",
};
const SERIF = "'Cormorant Garamond',serif";
const SANS = "'DM Sans',sans-serif";
const LOC_COLORS = ["#5a8a6a", "#c2724f", "#5b7aa3", "#c9a24a", "#8a6a9a", "#6b7268"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtDate = d => d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : "";
const fmtSigned = x => (x > 0 ? "+" : "") + x.toFixed(2);
const label = (t, extra = {}) => (
  <div style={{ fontSize: "10px", letterSpacing: "0.14em", color: T.mute, textTransform: "uppercase", marginBottom: "10px", ...extra }}>{t}</div>
);

function readLocal() {
  try { return JSON.parse(localStorage.getItem("ss_data") || "[]"); } catch { return []; }
}

// ─── Circumplex with median contours ──────────────────────────────────────────
// groups: [{ id, color, points:[{x,y}] }]. One group -> filled density + points.
// Several groups -> 50% contour per group + points (Soundscapy's "simple" density).
function DensityPlot({ groups }) {
  const S = 320, P = 36, W = S - 2 * P;
  const sx = x => P + (x + 1) / 2 * W;
  const sy = y => S - P - (y + 1) / 2 * W;
  const single = groups.length === 1;

  const layers = useMemo(() => groups.map(g => {
    const n = g.points.length;
    const mx = n ? g.points.reduce((a, p) => a + p.x, 0) / n : 0;
    const my = n ? g.points.reduce((a, p) => a + p.y, 0) / n : 0;
    if (n < 3) return { ...g, mean: [mx, my], path: "", cells: [] };
    const k = kdeGrid(g.points);
    const level = massThreshold(k, 0.5);
    const path = contourSegments(k, level)
      .map(([x1, y1, x2, y2]) => `M${sx(x1).toFixed(1)} ${sy(y1).toFixed(1)}L${sx(x2).toFixed(1)} ${sy(y2).toFixed(1)}`)
      .join("");
    const cells = [];
    if (single) {
      const cw = k.step * W / 2;
      for (let j = 0; j < k.res; j++) for (let i = 0; i < k.res; i++) {
        const v = k.grid[j * k.res + i] / k.max;
        if (v < 0.04) continue;
        cells.push({ x: sx(k.lo + i * k.step) - cw / 2, y: sy(k.lo + j * k.step) - cw / 2, w: cw + 0.5, o: v * 0.55 });
      }
    }
    return { ...g, mean: [mx, my], path, cells };
  }), [groups, single]);

  const quad = (x, y, text, color) => (
    <text x={sx(x)} y={sy(y)} fill={color} fontSize="9" fontFamily={SANS} textAnchor="middle" dominantBaseline="middle">{text}</text>
  );
  const axis = (x, y, text, anchor) => (
    <text x={x} y={y} fill={T.mute} fontSize="9" fontFamily={SANS} textAnchor={anchor} letterSpacing="0.06em">{text}</text>
  );

  return (
    <svg viewBox={`0 0 ${S} ${S}`} width="100%" style={{ display: "block", maxWidth: "360px", margin: "0 auto" }}>
      <defs>
        <clipPath id="dp-clip"><rect x={P} y={P} width={W} height={W} /></clipPath>
        <filter id="dp-blur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      {/* quadrant tints, unit circle, axes */}
      <rect x={P} y={P} width={W / 2} height={W / 2} fill="rgba(220,80,75,0.07)" />
      <rect x={P + W / 2} y={P} width={W / 2} height={W / 2} fill="rgba(240,175,40,0.09)" />
      <rect x={P} y={P + W / 2} width={W / 2} height={W / 2} fill="rgba(74,122,195,0.07)" />
      <rect x={P + W / 2} y={P + W / 2} width={W / 2} height={W / 2} fill="rgba(52,185,110,0.08)" />
      <circle cx={S / 2} cy={S / 2} r={W / 2} fill="none" stroke="rgba(26,26,24,0.10)" strokeWidth="1" />
      <circle cx={S / 2} cy={S / 2} r={W / 4} fill="none" stroke="rgba(26,26,24,0.05)" strokeWidth="1" />
      <line x1={P} y1={S / 2} x2={S - P} y2={S / 2} stroke="rgba(26,26,24,0.14)" strokeWidth="1" />
      <line x1={S / 2} y1={P} x2={S / 2} y2={S - P} stroke="rgba(26,26,24,0.14)" strokeWidth="1" />
      <rect x={P} y={P} width={W} height={W} fill="none" stroke="rgba(26,26,24,0.08)" strokeWidth="1" />

      {quad(-0.66, 0.66, "Chaotic", "rgba(190,60,55,0.6)")}
      {quad(0.66, 0.66, "Vibrant", "rgba(190,130,15,0.7)")}
      {quad(-0.66, -0.66, "Monotonous", "rgba(60,100,170,0.6)")}
      {quad(0.66, -0.66, "Calm", "rgba(40,140,85,0.65)")}
      {axis(S - P, S / 2 + 3, "Pleasant", "start")}
      {axis(P, S / 2 + 3, "Unpleasant", "end")}
      {axis(S / 2, P - 8, "Eventful", "middle")}
      {axis(S / 2, S - P + 15, "Uneventful", "middle")}

      {/* density fill (single group only) */}
      {layers.map(l => l.cells.length > 0 && (
        <g key={"f" + l.id} clipPath="url(#dp-clip)" filter="url(#dp-blur)">
          {l.cells.map((c, i) => <rect key={i} x={c.x} y={c.y} width={c.w} height={c.w} fill={l.color} opacity={c.o} />)}
        </g>
      ))}

      {/* points */}
      {layers.map(l => (
        <g key={"p" + l.id}>
          {l.points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="3" fill={l.color} opacity={single ? 0.55 : 0.4} />)}
        </g>
      ))}

      {/* median contours */}
      {layers.map(l => l.path && (
        <path key={"c" + l.id} d={l.path} fill="none" stroke={l.color} strokeWidth="1.8" strokeLinecap="round" opacity="0.95" />
      ))}

      {/* means */}
      {layers.map(l => l.points.length > 0 && (
        <g key={"m" + l.id}>
          <circle cx={sx(l.mean[0])} cy={sy(l.mean[1])} r="5.5" fill={T.bg} stroke={l.color} strokeWidth="2" />
          <circle cx={sx(l.mean[0])} cy={sy(l.mean[1])} r="2" fill={l.color} />
        </g>
      ))}
    </svg>
  );
}

// ─── Pleasantness over time ───────────────────────────────────────────────────
function Timeline({ records, colorOf }) {
  const Wd = 320, H = 110, L = 10, R = 10, Tp = 12, B = 22;
  const times = records.map(r => Date.parse(r.start_time)).filter(t => !isNaN(t));
  if (times.length < 2) return null;
  const t0 = Math.min(...times), t1 = Math.max(...times), span = Math.max(t1 - t0, 1);
  const x = t => L + (t - t0) / span * (Wd - L - R);
  const y = v => Tp + (1 - (v + 1) / 2) * (H - Tp - B);
  return (
    <svg viewBox={`0 0 ${Wd} ${H}`} width="100%" style={{ display: "block", maxWidth: "360px", margin: "0 auto" }}>
      <line x1={L} y1={y(0)} x2={Wd - R} y2={y(0)} stroke="rgba(26,26,24,0.18)" strokeWidth="1" strokeDasharray="2 3" />
      <line x1={L} y1={y(1)} x2={Wd - R} y2={y(1)} stroke="rgba(26,26,24,0.06)" strokeWidth="1" />
      <line x1={L} y1={y(-1)} x2={Wd - R} y2={y(-1)} stroke="rgba(26,26,24,0.06)" strokeWidth="1" />
      {records.map((r, i) => {
        const t = Date.parse(r.start_time);
        return isNaN(t) ? null : <circle key={i} cx={x(t)} cy={y(r.ISOPleasant)} r="3" fill={colorOf(r.LocationID)} opacity="0.7" />;
      })}
      <text x={L} y={H - 6} fill={T.mute} fontSize="9" fontFamily={SANS}>{fmtDate(new Date(t0))}</text>
      <text x={Wd - R} y={H - 6} fill={T.mute} fontSize="9" fontFamily={SANS} textAnchor="end">{fmtDate(new Date(t1))}</text>
      <text x={L} y={y(1) + 3} fill={T.mute} fontSize="8" fontFamily={SANS}>pleasant</text>
      <text x={L} y={y(-1) - 3} fill={T.mute} fontSize="8" fontFamily={SANS}>unpleasant</text>
    </svg>
  );
}

// ─── Horizontal bar list ──────────────────────────────────────────────────────
function Bars({ items, total }) {
  const max = items[0]?.count || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
      {items.map(it => (
        <div key={it.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span>{it.label}</span>
            <span style={{ color: T.soft, fontSize: "12px" }}>{it.count}{total ? ` (${Math.round(it.count / total * 100)}%)` : ""}</span>
          </div>
          <div style={{ height: "5px", background: "rgba(26,26,24,0.07)", borderRadius: "3px" }}>
            <div style={{ height: "100%", width: `${it.count / max * 100}%`, background: T.green, borderRadius: "3px", opacity: 0.75 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ onBack, sources, wordPool, quadLabel, initialLoc = "all" }) {
  const [includeDemo, setIncludeDemo] = useState(true);
  const [loc, setLoc] = useState(initialLoc);
  const local = useMemo(readLocal, []);
  const demo = useMemo(() => generateMockEntries({ wordPool, quadLabel }), [wordPool, quadLabel]);

  const records = useMemo(
    () => [...(includeDemo ? demo : []), ...local].map(toRecord),
    [includeDemo, demo, local]
  );
  const locations = useMemo(() => {
    const order = MOCK_LOCATIONS.map(l => l.id);
    const rank = id => { const i = order.indexOf(id); return i < 0 ? 99 : i; };
    return [...new Set(records.map(r => r.LocationID))].sort((a, b) => rank(a) - rank(b));
  }, [records]);
  const colorOf = id => LOC_COLORS[Math.max(0, locations.indexOf(id)) % LOC_COLORS.length];

  const shown = loc === "all" ? records : records.filter(r => r.LocationID === loc);
  const stats = useMemo(() => summarize(shown), [shown]);
  const groups = useMemo(() => {
    const ids = loc === "all" ? locations : [loc];
    return ids.map(id => ({
      id, color: colorOf(id),
      points: records.filter(r => r.LocationID === id).map(r => ({ x: r.ISOPleasant, y: r.ISOEventful })),
    }));
  }, [loc, locations, records]); // eslint-disable-line react-hooks/exhaustive-deps

  const sourceLabel = id => sources.find(s => s.id === id)?.label || id;
  const topQuad = stats.quadrants[0];
  const infoTotal = stats.info.none + stats.info.some + stats.info.high;

  const pillStyle = active => ({
    padding: "7px 13px", borderRadius: "100px", fontSize: "12px", cursor: "pointer", fontFamily: SANS,
    background: active ? T.ink : "rgba(26,26,24,0.06)", border: "none", color: active ? T.bg : T.ink,
    whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: "7px", flexShrink: 0,
  });
  const card = { background: T.card, borderRadius: "12px", padding: "14px" };
  const section = { marginTop: "30px" };
  const textBtn = { background: "none", border: "none", cursor: "pointer", fontFamily: SANS, fontSize: "13px", color: T.soft, padding: 0 };

  return (
    <div style={{ width: "100%", maxWidth: "420px", color: T.ink, fontFamily: SANS, animation: "ss-fade 0.3s ease both" }}>
      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <button onClick={onBack} style={textBtn}>← Back</button>
        <label onClick={() => setIncludeDemo(x => !x)} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: T.soft, cursor: "pointer", userSelect: "none" }}>
          Demo data
          <span style={{ width: "34px", height: "20px", borderRadius: "10px", background: includeDemo ? T.green : "rgba(26,26,24,0.18)", position: "relative", transition: "background 0.2s" }}>
            <span style={{ position: "absolute", top: "2px", left: includeDemo ? "16px" : "2px", width: "16px", height: "16px", borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
          </span>
        </label>
      </div>

      {label("Results")}
      <h1 style={{ fontFamily: SERIF, fontSize: "40px", fontWeight: 400, lineHeight: 1.08, margin: "0 0 10px" }}>
        How these spaces sound
      </h1>
      <p style={{ color: T.soft, fontSize: "14px", lineHeight: 1.6, margin: "0 0 22px" }}>
        {stats.n === 0
          ? "No assessments yet. Complete one and it will show up here."
          : `${stats.n} assessment${stats.n === 1 ? "" : "s"}${loc === "all" ? ` in ${locations.length} space${locations.length === 1 ? "" : "s"}` : ""}${stats.first ? `, ${fmtDate(stats.first)} – ${fmtDate(stats.last)}` : ""}.`}
        {includeDemo && stats.n > 0 && " Demo data is synthetic."}
      </p>

      {stats.n > 0 && (
        <>
          {/* location filter */}
          <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "6px", marginBottom: "18px" }} className="ss-scroll">
            <button onClick={() => setLoc("all")} style={pillStyle(loc === "all")}>All spaces</button>
            {locations.map(id => (
              <button key={id} onClick={() => setLoc(id)} style={pillStyle(loc === id)}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorOf(id), display: "inline-block" }} />
                {id}
              </button>
            ))}
          </div>

          {/* circumplex */}
          <DensityPlot groups={groups} />
          <p style={{ fontSize: "11px", color: T.mute, lineHeight: 1.5, textAlign: "center", margin: "6px 0 0" }}>
            {groups.length > 1
              ? "Each outline encloses the half of that space's assessments closest to its centre (median contour, Mitchell et al. 2022). Ring = mean."
              : "Shading shows where assessments cluster; the outline encloses the closest half. Ring = mean."}
          </p>

          {/* summary: comparison table for all spaces, cards for a single space */}
          {loc === "all" && locations.length > 1 ? (
            <div style={section}>
              {label("By space")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", columnGap: "14px", rowGap: "9px", fontSize: "13px", alignItems: "center" }}>
                {["", "n", "P", "E"].map((h, i) => (
                  <div key={i} style={{ fontSize: "10px", color: T.mute, letterSpacing: "0.08em", textAlign: i ? "right" : "left" }}>{h}</div>
                ))}
                {locations.map(id => {
                  const s = summarize(records.filter(r => r.LocationID === id));
                  return (
                    <React.Fragment key={id}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: colorOf(id), flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{id}</span>
                        <span style={{ color: T.mute, fontSize: "11px", whiteSpace: "nowrap" }}>{s.quadrants[0]?.label}</span>
                      </div>
                      <div style={{ textAlign: "right", color: T.soft }}>{s.n}</div>
                      <div style={{ textAlign: "right", fontFamily: SERIF, fontSize: "16px" }}>{fmtSigned(s.pleasant.mean)}</div>
                      <div style={{ textAlign: "right", fontFamily: SERIF, fontSize: "16px" }}>{fmtSigned(s.eventful.mean)}</div>
                    </React.Fragment>
                  );
                })}
              </div>
              <p style={{ fontSize: "11px", color: T.mute, margin: "10px 0 0", lineHeight: 1.5 }}>P = mean pleasantness, E = mean eventfulness (−1 to +1). Label = most common quadrant.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", ...section }}>
              {[
                { t: "Pleasantness", v: fmtSigned(stats.pleasant.mean), s: `sd ${stats.pleasant.sd.toFixed(2)}` },
                { t: "Eventfulness", v: fmtSigned(stats.eventful.mean), s: `sd ${stats.eventful.sd.toFixed(2)}` },
                { t: "Most common", v: topQuad?.label || "–", s: topQuad ? `${Math.round(topQuad.count / stats.n * 100)}% of entries` : "" },
              ].map(c => (
                <div key={c.t} style={card}>
                  <div style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: T.mute, marginBottom: "6px" }}>{c.t}</div>
                  <div style={{ fontFamily: SERIF, fontSize: "24px", lineHeight: 1.1 }}>{c.v}</div>
                  <div style={{ fontSize: "11px", color: T.soft, marginTop: "4px" }}>{c.s}</div>
                </div>
              ))}
            </div>
          )}

          {/* timeline */}
          <div style={section}>
            {label("Pleasantness over time")}
            <Timeline records={shown} colorOf={colorOf} />
          </div>

          {/* descriptors + sources */}
          {stats.descriptors.length > 0 && (
            <div style={section}>
              {label("Most chosen descriptors")}
              <Bars items={stats.descriptors.slice(0, 8)} total={stats.n} />
            </div>
          )}
          {stats.sources.length > 0 && (
            <div style={section}>
              {label("Sounds that stood out")}
              <Bars items={stats.sources.slice(0, 6).map(s => ({ ...s, label: sourceLabel(s.label) }))} total={stats.n} />
            </div>
          )}

          {/* information value */}
          {infoTotal > 0 && (
            <div style={section}>
              {label("Information value")}
              <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "10px" }}>
                <div style={{ width: `${stats.info.none / infoTotal * 100}%`, background: "rgba(26,26,24,0.15)" }} />
                <div style={{ width: `${stats.info.some / infoTotal * 100}%`, background: "rgba(45,74,56,0.45)" }} />
                <div style={{ width: `${stats.info.high / infoTotal * 100}%`, background: T.green }} />
              </div>
              <div style={{ display: "flex", gap: "18px", fontSize: "12px", color: T.soft }}>
                <span>None {Math.round(stats.info.none / infoTotal * 100)}%</span>
                <span>Some {Math.round(stats.info.some / infoTotal * 100)}%</span>
                <span>High {Math.round(stats.info.high / infoTotal * 100)}%</span>
              </div>
            </div>
          )}

          {/* export */}
          <div style={{ ...section, marginTop: "40px" }}>
            <button
              onClick={() => downloadCSV(shown, `soundscape_${loc === "all" ? "all" : loc.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`)}
              style={{ width: "100%", padding: "16px 20px", borderRadius: "100px", fontSize: "14px", cursor: "pointer", fontFamily: SANS, letterSpacing: "0.04em", background: T.green, border: "none", color: "white", fontWeight: 500 }}>
              Export CSV for Soundscapy
            </button>
            <p style={{ fontSize: "11px", color: T.mute, textAlign: "center", margin: "10px 0 0", lineHeight: 1.5 }}>
              {shown.length} rows, ISD column names, ISOPleasant / ISOEventful included.
            </p>
          </div>
        </>
      )}
    </div>
  );
}