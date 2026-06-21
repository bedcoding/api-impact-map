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
}

const ROW_H = 26;
const PAD_TOP = 34;
const PAD_BOT = 16;
const EP_W = 320;
const SCR_W = 250;
const EP_X = 14;
const GUTTER = 14; // 화면 컬럼 우측 여백
const MIN_W = 660; // 좁은 패널에서도 두 컬럼이 안 겹치게 하는 최소 폭
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
}: Props) {
  const q = query.trim().toLowerCase();

  // 스크롤 컨테이너 폭을 측정해 SVG가 안쪽 폭을 정확히 채우게 함 — 가로 스크롤 없고, 화면 컬럼이 항상 오른쪽 끝에 붙음.
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

  // 레이아웃 = 어떤 노드가 보이나 + 그 위치. 가시성은 플랫폼 필터(activeEdges)와 검색어에 따라 결정:
  //   - 검색 없음 → active edge가 하나라도 있는 모든 노드(전체 그래프)
  //   - 검색 있음 → 라벨이 매칭되는 노드 + 그에 직접 연결된 (1-hop) 이웃.
  // 선택은 레이아웃에 영향 없음 — 선택은 제자리에서 스타일만 바꿈 → 스크롤 위치와 노드 순서가 안 튐.
  const layout = useMemo(() => {
    const epsLive = new Set<string>();
    const scrLive = new Set<string>();
    activeEdges.forEach((e) => {
      epsLive.add(e.endpoint);
      scrLive.add(e.screen);
    });

    // 직접 텍스트 매칭 (플랫폼 필터된 집합 내).
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

    // 보이는 집합.
    let visEps: Set<string>;
    let visScr: Set<string>;
    if (!q) {
      // 검색 없음 → 모든 live 노드 표시. live 집합의 읽기 전용 별칭 (이 분기에서는 변경하지 않음).
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

    // 컨테이너에 폭을 정확히 맞춤 (첫 측정 전엔 MIN_W로 대체).
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
    // 양쪽 끝이 모두 보이는 active edge를 전부 그림. ("매칭에 인접한 것만" 같은 추가 필터는 두지 않음 — 그러면 보이는 두 이웃 노드 사이의 실제 의존이 숨겨져 부분 그래프가 일관성을 잃음.)
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

  // 선택 하이라이트용 관련 집합 (레이아웃과 분리 → 선택해도 위치 재계산 안 함).
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

  // 검색 중에는 필터가 곧 포커스라 선택 스타일(sel/dim/active)을 억제 — 안 그러면 기존 선택이 필터된 매칭을 ~12% 투명도로 dim 처리해버림. 선택 상태는 유지되므로 검색을 지우면 복원됨(상세 패널도 계속 반영).
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

  // 헤더 힌트 텍스트.
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
    </div>
  );
}
