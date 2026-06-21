import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Edge, Platform, Selection } from "../types";
import { D } from "../data";
import { PCOLOR, trunc } from "../constants";

interface Props {
  activeEdges: Edge[];
  platforms: Set<Platform>;
  query: string;
  selected: Selection;
  onSelect: (type: "ep" | "screen", id: string) => void;
  onClear: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

const ROW_H = 26;
const PAD_TOP = 34;
const PAD_BOT = 16;
const EP_W = 320;
const SCR_W = 250;
const EP_X = 14;
const GUTTER = 14; // right inset of the screen column
const MIN_W = 660; // floor so the two columns never overlap on a narrow panel
const NODE_STROKE = "#475569";

interface NodeRowProps {
  type: "ep" | "screen";
  id: string;
  label: string;
  x: number;
  cy: number;
  w: number;
  plats: Platform[];
  tip: string;
  className: string;
  onSelect: (type: "ep" | "screen", id: string) => void;
}

function NodeRow({ type, id, label, x, cy, w, plats, tip, className, onSelect }: NodeRowProps) {
  const top = cy - 11;
  const textX = x + 12 + plats.length * 11;
  const avail = Math.floor((w - 18 - plats.length * 11) / 6.2);
  return (
    <g
      className={className}
      onClick={(ev) => {
        ev.stopPropagation();
        onSelect(type, id);
      }}
    >
      <rect
        x={x}
        y={top}
        width={w}
        height={22}
        rx={6}
        fill="#fff"
        stroke={NODE_STROKE}
        strokeWidth={1.3}
      />
      {plats.map((p, i) => (
        <circle key={p} cx={x + 9 + i * 11} cy={top + 11} r={3.4} fill={PCOLOR[p]} />
      ))}
      <text x={textX} y={top + 15} fill="#1d2330">
        {trunc(label, Math.max(12, avail))}
      </text>
      <title>{tip}</title>
    </g>
  );
}

export function Graph({
  activeEdges,
  platforms,
  query,
  selected,
  onSelect,
  onClear,
  expanded,
  onToggleExpanded,
}: Props) {
  const q = query.trim().toLowerCase();

  // Measure the scroll container so the SVG fills its exact inner width — no
  // horizontal scrollbar, and the screen column always hugs the right edge.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setBoxW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout = which nodes are visible + their positions. Visibility depends on the
  // platform filter (activeEdges) and the search query:
  //   - no query  → every node that has at least one active edge (full graph)
  //   - query     → nodes whose label matches, PLUS their directly-connected
  //                 (1-hop) neighbours.
  // Selection does NOT affect layout — selecting only re-styles nodes in place,
  // so the scroll position and node order never jump.
  const layout = useMemo(() => {
    const epsLive = new Set<string>();
    const scrLive = new Set<string>();
    activeEdges.forEach((e) => {
      epsLive.add(e.endpoint);
      scrLive.add(e.screen);
    });

    // Direct text matches (within the platform-filtered set).
    const matchEp = new Set<string>();
    const matchScr = new Set<string>();
    if (q) {
      D.endpoints.forEach((a) => {
        if (epsLive.has(a.id) && `${a.method} ${a.path}`.toLowerCase().includes(q)) {
          matchEp.add(a.id);
        }
      });
      D.screens.forEach((s) => {
        if (
          scrLive.has(s.id) &&
          (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
        ) {
          matchScr.add(s.id);
        }
      });
    }

    // Visible sets.
    let visEps: Set<string>;
    let visScr: Set<string>;
    if (!q) {
      // No search → show every live node. Read-only alias of the live sets
      // (never mutated below in this branch).
      visEps = epsLive;
      visScr = scrLive;
    } else {
      visEps = new Set(matchEp);
      visScr = new Set(matchScr);
      activeEdges.forEach((e) => {
        if (matchScr.has(e.screen)) visEps.add(e.endpoint);
        if (matchEp.has(e.endpoint)) visScr.add(e.screen);
      });
    }

    const endpoints = D.endpoints
      .filter((a) => visEps.has(a.id))
      .sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
    const screens = D.screens
      .filter((s) => visScr.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Width fits the container exactly (fallback to MIN_W before first measure).
    const W = Math.max(boxW || MIN_W, MIN_W);
    const scrLeft = W - GUTTER - SCR_W;

    const H = Math.max(endpoints.length, screens.length, 1) * ROW_H;
    const total = H + PAD_TOP + PAD_BOT;
    const yOf = (i: number, n: number) => PAD_TOP + (i + 0.5) * (H / n);

    const epY = new Map<string, number>();
    const scrY = new Map<string, number>();
    endpoints.forEach((a, i) => epY.set(a.id, yOf(i, endpoints.length)));
    screens.forEach((s, i) => scrY.set(s.id, yOf(i, screens.length)));

    const x1 = EP_X + EP_W;
    const x2 = scrLeft;
    const dx = (x2 - x1) * 0.45;
    // Draw every active edge whose BOTH endpoints are visible. (We don't add an
    // extra "incident to a match" filter — that would hide a real dependency
    // between two shown neighbour nodes, leaving the subgraph inconsistent.)
    const links = activeEdges
      .filter((e) => epY.has(e.endpoint) && scrY.has(e.screen))
      .map((e, i) => {
        const y1 = epY.get(e.endpoint)!;
        const y2 = scrY.get(e.screen)!;
        return {
          key: `${e.endpoint}__${e.screen}__${e.platform}__${i}`,
          endpoint: e.endpoint,
          screen: e.screen,
          platform: e.platform,
          d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
        };
      });

    return { endpoints, screens, epY, scrY, total, links, matchEp, matchScr, W, scrLeft };
  }, [activeEdges, q, boxW]);

  // Related set for selection highlight (kept separate from layout so selecting
  // never recomputes positions).
  const related = useMemo(() => {
    if (!selected) return null;
    const rel = new Set<string>([selected.type + ":" + selected.id]);
    if (selected.type === "ep") {
      activeEdges
        .filter((e) => e.endpoint === selected.id)
        .forEach((e) => rel.add("screen:" + e.screen));
    } else {
      activeEdges
        .filter((e) => e.screen === selected.id)
        .forEach((e) => rel.add("ep:" + e.endpoint));
    }
    return rel;
  }, [activeEdges, selected]);

  // While a search is active the filter IS the focus, so selection styling
  // (sel/dim/active) is suppressed — otherwise a pre-existing selection would
  // dim the filtered matches to ~12% opacity. Selection state is kept, so
  // clearing the search restores it (and the detail panel still reflects it).
  const nodeClass = (type: "ep" | "screen", id: string, matched: boolean): string => {
    let cls = "node";
    if (matched) cls += " match";
    if (!q && selected) {
      const key = type + ":" + id;
      if (key === selected.type + ":" + selected.id) cls += " sel";
      else if (related && !related.has(key)) cls += " dim";
    }
    return cls;
  };

  const linkClass = (l: { endpoint: string; screen: string }): string => {
    let cls = "link";
    if (!q && selected) {
      const touch =
        (selected.type === "ep" && l.endpoint === selected.id) ||
        (selected.type === "screen" && l.screen === selected.id);
      cls += touch ? " active" : " dim";
    }
    return cls;
  };

  // Header hint text.
  let hint = "";
  if (q) {
    hint = `검색 "${query.trim()}" · 엔드포인트 ${layout.endpoints.length} · 화면 ${layout.screens.length}`;
  } else if (selected) {
    if (selected.type === "ep") {
      const n = new Set(
        activeEdges.filter((e) => e.endpoint === selected.id).map((e) => e.screen),
      ).size;
      hint = `이 엔드포인트 변경 → 영향 화면 ${n}개`;
    } else {
      const n = new Set(
        activeEdges.filter((e) => e.screen === selected.id).map((e) => e.endpoint),
      ).size;
      hint = `이 화면 → 사용 엔드포인트 ${n}개`;
    }
  }

  const empty = q && layout.endpoints.length === 0 && layout.screens.length === 0;

  return (
    <div className="graph-card">
      <div className="card-head">
        <span>
          의존성 그래프 — <span style={{ color: "var(--muted)" }}>API 엔드포인트 (좌)</span> ·{" "}
          <span style={{ color: "var(--muted)" }}>화면 (우)</span>
        </span>
        <span className="hint" role="status" aria-live="polite">
          {hint}
        </span>
      </div>
      <div
        className="graph-scroll"
        ref={scrollRef}
        style={{ height: expanded ? 680 : 300 }}
      >
        <svg
          width={layout.W}
          height={layout.total}
          viewBox={`0 0 ${layout.W} ${layout.total}`}
          onClick={onClear}
        >
          <text className="col-label" x={EP_X} y={20}>
            API 엔드포인트 · {layout.endpoints.length}
          </text>
          <text className="col-label" x={layout.scrLeft} y={20} textAnchor="start">
            화면 · {layout.screens.length}
          </text>

          {empty && (
            <text className="col-label" x={layout.W / 2} y={PAD_TOP + 24} textAnchor="middle">
              검색 결과가 없습니다 · "{query.trim()}"
            </text>
          )}

          <g>
            {layout.links.map((l) => (
              <path key={l.key} className={linkClass(l)} stroke={PCOLOR[l.platform]} d={l.d} />
            ))}
          </g>

          {layout.endpoints.map((a) => {
            const label = `${a.method} ${a.path}`;
            return (
              <NodeRow
                key={a.id}
                type="ep"
                id={a.id}
                label={label}
                x={EP_X}
                cy={layout.epY.get(a.id)!}
                w={EP_W}
                plats={a.platforms.filter((p) => platforms.has(p))}
                tip={`${label} · 영향화면 ${a.screens.length}`}
                className={nodeClass("ep", a.id, layout.matchEp.has(a.id))}
                onSelect={onSelect}
              />
            );
          })}

          {layout.screens.map((s) => (
            <NodeRow
              key={s.id}
              type="screen"
              id={s.id}
              label={s.name}
              x={layout.scrLeft}
              cy={layout.scrY.get(s.id)!}
              w={SCR_W}
              plats={s.platforms.filter((p) => platforms.has(p))}
              tip={`${s.name} [${s.code}] · 사용 엔드포인트 ${s.endpoints.length}`}
              className={nodeClass("screen", s.id, layout.matchScr.has(s.id))}
              onSelect={onSelect}
            />
          ))}
        </svg>
      </div>
      <button
        type="button"
        className="resize-toggle-bar"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        {expanded ? "접기 ▲" : "펼치기 ▼"}
      </button>
    </div>
  );
}
