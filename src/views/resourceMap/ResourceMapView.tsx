import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Edge, Endpoint, Platform, Screen } from "../../types";
import { indexData } from "../../data";
import { useDatasets } from "../../datasets";
import { DataContext, useData } from "../../dataContext";
import { PLATFORMS, methodCls } from "../../constants";
import { Header } from "../../components/Header";
import { DataControls } from "../../components/DataControls";
import { PlatDots, PlatformFilter } from "../../components/shared";
import { groupEndpoints, groupScreens } from "./grouping";
import type { Group } from "./grouping";

type NodeType = "screen" | "ep";
type Axis = "screen" | "api";

interface PathStep {
  type: NodeType;
  id: string;
}

interface NavColumn {
  key: string;
  type: NodeType;
  title: string;
  items: (Screen | Endpoint)[];
  selectedId: string | null;
}

interface LinkSeg {
  key: string;
  d: string;
  x: number;
  y: number;
}

// 리소스맵 뷰: 좌→우 컬럼 드릴다운(Miller columns).
// 항목을 누르면 "방향이 바뀌는" 게 아니라 오른쪽에 연결 목록 컬럼이 누적된다 →
// 보던 컬럼은 그대로 남아 맥락이 유지되고, 화면→API→화면…으로 의존 전파를 무한 추적할 수 있다.
// 선택 항목 → 다음 컬럼 헤더를 잇는 곡선(연결선)으로 "맵"임을 시각화한다.
export function ResourceMapView() {
  const datasets = useDatasets();
  const data = datasets.active;
  const { epById, screenById } = useMemo(() => indexData(data), [data]);

  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));
  const [axis, setAxis] = useState<Axis>("screen");
  const [path, setPath] = useState<PathStep[]>([]);

  // 데이터셋 교체 시 탐색 경로 초기화.
  useEffect(() => setPath([]), [data]);

  const activeEdges = useMemo(
    () => data.edges.filter((e) => platforms.has(e.platform)),
    [data, platforms],
  );

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      if (next.size === 0) next.add(p); // 절대 빈 상태 안 됨
      return next;
    });
  };

  // 시작 축을 바꿀 때만 경로를 리셋(이때만 컬럼이 새로 깔린다). 항목 클릭은 축을 안 건드림.
  const changeAxis = (a: Axis) => {
    if (a === axis) return;
    setAxis(a);
    setPath([]);
  };

  return (
    <DataContext.Provider value={{ data, epById, screenById }}>
      <Header showGeneratedAt={false} actions={<DataControls ds={datasets} variant="header" />} />
      <main>
        {/* 다크 캔버스 한 박스: 상단 툴바 + 컬럼 영역을 같은 톤으로 묶는다. */}
        <div className="rmap">
          <div className="rmap-toolbar">
            <input
              type="search"
              className="rmap-search"
              placeholder="엔드포인트 · 화면 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <PlatformFilter platforms={platforms} onToggle={togglePlatform} />
            <div className="rmap-dir" role="tablist">
              <button
                type="button"
                className={axis === "screen" ? "active" : ""}
                onClick={() => changeAxis("screen")}
              >
                화면부터
              </button>
              <button
                type="button"
                className={axis === "api" ? "active" : ""}
                onClick={() => changeAxis("api")}
              >
                API부터
              </button>
            </div>
          </div>
          <ColumnNav axis={axis} activeEdges={activeEdges} query={query} path={path} onPath={setPath} />
        </div>
      </main>
    </DataContext.Provider>
  );
}

interface ColumnNavProps {
  axis: Axis;
  activeEdges: Edge[];
  query: string;
  path: PathStep[];
  onPath: React.Dispatch<React.SetStateAction<PathStep[]>>;
}

function ColumnNav({ axis, activeEdges, query, path, onPath }: ColumnNavProps) {
  const { data, epById, screenById } = useData();
  const q = query.trim().toLowerCase();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0); // 세로 스크롤·리사이즈 시 연결선 재측정 트리거
  const [links, setLinks] = useState<LinkSeg[]>([]);
  const [svg, setSvg] = useState({ w: 0, h: 0 });

  const columns = useMemo<NavColumn[]>(() => {
    const liveEp = new Set<string>();
    const liveScr = new Set<string>();
    activeEdges.forEach((e) => {
      liveEp.add(e.endpoint);
      liveScr.add(e.screen);
    });
    const linkedEndpoints = (sid: string): Endpoint[] => {
      const ids = new Set(activeEdges.filter((e) => e.screen === sid).map((e) => e.endpoint));
      return data.endpoints.filter((a) => ids.has(a.id));
    };
    const linkedScreens = (eid: string): Screen[] => {
      const ids = new Set(activeEdges.filter((e) => e.endpoint === eid).map((e) => e.screen));
      return data.screens.filter((s) => ids.has(s.id));
    };

    const cols: NavColumn[] = [];
    // 시작 컬럼. 검색은 여기에만 적용한다(탐색 시작점 찾기용).
    if (axis === "screen") {
      const items = data.screens.filter(
        (s) =>
          liveScr.has(s.id) &&
          (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)),
      );
      cols.push({ key: "root", type: "screen", title: `화면 · ${items.length}`, items, selectedId: path[0]?.id ?? null });
    } else {
      const items = data.endpoints.filter(
        (a) => liveEp.has(a.id) && (!q || `${a.method} ${a.path}`.toLowerCase().includes(q)),
      );
      cols.push({ key: "root", type: "ep", title: `API · ${items.length}`, items, selectedId: path[0]?.id ?? null });
    }

    // 경로를 따라 컬럼을 오른쪽으로 누적.
    for (let i = 0; i < path.length; i++) {
      const step = path[i];
      if (step.type === "screen") {
        const items = linkedEndpoints(step.id);
        const s = screenById.get(step.id);
        cols.push({
          key: `${i}:s:${step.id}`,
          type: "ep",
          title: `${s?.name ?? step.id} → API · ${items.length}`,
          items,
          selectedId: path[i + 1]?.id ?? null,
        });
      } else {
        const items = linkedScreens(step.id);
        const a = epById.get(step.id);
        cols.push({
          key: `${i}:e:${step.id}`,
          type: "screen",
          title: `${a ? `${a.method} ${a.path}` : step.id} → 화면 · ${items.length}`,
          items,
          selectedId: path[i + 1]?.id ?? null,
        });
      }
    }
    return cols;
  }, [data, activeEdges, axis, path, q, screenById, epById]);

  // 컬럼이 늘어나면 오른쪽 끝으로 스크롤해 새 컬럼이 보이게.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [columns.length]);

  // 연결선 측정: i번 컬럼의 선택 항목 우측 → (i+1)번 컬럼 헤더 좌측을 잇는 베지어.
  // 콘텐츠 좌표계(스크롤 오프셋 포함)라 가로 스크롤 시 SVG가 함께 움직여 자동 정합.
  useLayoutEffect(() => {
    const nav = scrollRef.current;
    if (!nav) return;
    setSvg({ w: nav.scrollWidth, h: nav.scrollHeight });
    const r0 = nav.getBoundingClientRect();
    const pt = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - r0.left + nav.scrollLeft,
        y: r.top - r0.top + nav.scrollTop,
        w: r.width,
        h: r.height,
      };
    };
    const segs: LinkSeg[] = [];
    for (let i = 0; i < path.length; i++) {
      const from = nav.querySelector(`[data-sel-col="${i}"]`);
      const to = nav.querySelector(`[data-head-col="${i + 1}"]`);
      if (!from || !to) continue;
      const a = pt(from);
      const b = pt(to);
      const x1 = a.x + a.w;
      const y1 = a.y + a.h / 2;
      const x2 = b.x;
      const y2 = b.y + b.h / 2;
      const dx = Math.max(36, (x2 - x1) * 0.5);
      segs.push({
        key: `c${i}`,
        d: `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`,
        x: x2,
        y: y2,
      });
    }
    setLinks(segs);
  }, [path, columns.length, tick, axis, q]);

  // 컬럼 리사이즈 시 재측정(세로 스크롤은 각 컬럼 onScroll에서 tick).
  useLayoutEffect(() => {
    const nav = scrollRef.current;
    if (!nav) return;
    const ro = new ResizeObserver(() => setTick((t) => t + 1));
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // 컬럼 colIndex에서 항목 선택 → 그 컬럼까지의 경로를 자르고 새 스텝 추가(오른쪽 컬럼들은 재생성).
  const onPick = (colIndex: number, type: NodeType, id: string) =>
    onPath((prev) => [...prev.slice(0, colIndex), { type, id }]);

  const bumpTick = () => setTick((t) => t + 1);

  return (
    <div className="rmap-cols-nav" ref={scrollRef}>
      <svg className="rnav-links" width={svg.w} height={svg.h} aria-hidden="true">
        <defs>
          <linearGradient id="rnavGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        {links.map((l) => (
          <g key={l.key}>
            <path className="rnav-link-glow" d={l.d} />
            <path className="rnav-link" d={l.d} />
            <circle className="rnav-link-cap" cx={l.x} cy={l.y} r={3.5} />
          </g>
        ))}
      </svg>
      {columns.map((col, ci) => (
        <ColumnView key={col.key} col={col} colIndex={ci} onPick={onPick} onBodyScroll={bumpTick} />
      ))}
    </div>
  );
}

function ColumnView({
  col,
  colIndex,
  onPick,
  onBodyScroll,
}: {
  col: NavColumn;
  colIndex: number;
  onPick: (colIndex: number, type: NodeType, id: string) => void;
  onBodyScroll: () => void;
}) {
  const groups =
    col.type === "screen"
      ? (groupScreens(col.items as Screen[]) as Group<Screen | Endpoint>[])
      : (groupEndpoints(col.items as Endpoint[]) as Group<Screen | Endpoint>[]);

  return (
    <div className="rnav-col">
      <div className="rnav-col-head" data-head-col={colIndex} title={col.title}>
        {col.title}
      </div>
      <div className="rnav-col-body" onScroll={onBodyScroll}>
        {col.items.length === 0 ? (
          <div className="rnav-empty">연결된 항목이 없습니다</div>
        ) : (
          groups.map((g) => (
            <div className="rnav-group" key={g.key}>
              <div className="rnav-group-head">
                <span className="rnav-group-title">{g.label}</span>
                <span className="rnav-group-count">{g.items.length}</span>
              </div>
              <ul className="rnav-list">
                {g.items.map((item) => {
                  const isSel = col.selectedId === item.id;
                  if (col.type === "screen") {
                    const s = item as Screen;
                    return (
                      <li
                        key={s.id}
                        data-sel-col={isSel ? colIndex : undefined}
                        className={`rnav-item${isSel ? " sel" : ""}`}
                        title={`${s.name} [${s.code}]`}
                        onClick={() => onPick(colIndex, "screen", s.id)}
                      >
                        <PlatDots plats={s.platforms} />
                        <span className="rnav-label">{s.name}</span>
                      </li>
                    );
                  }
                  const a = item as Endpoint;
                  return (
                    <li
                      key={a.id}
                      data-sel-col={isSel ? colIndex : undefined}
                      className={`rnav-item${isSel ? " sel" : ""}`}
                      title={`${a.method} ${a.path}`}
                      onClick={() => onPick(colIndex, "ep", a.id)}
                    >
                      <span className={`badge ${methodCls(a.method)}`}>{a.method}</span>
                      <span className="rnav-label codeline">{a.path}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
