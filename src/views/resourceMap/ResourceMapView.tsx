import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { AppData, Edge, Endpoint, Platform, Screen } from "../../types";
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

// 컬럼은 최대 4뎁스까지만(하드 차단). 4번째 컬럼에서는 더 드릴다운하지 않는다.
const MAX_COLS = 4;
// 컬럼 폭·간격·좌우 패딩은 styles.css(.rnav-col width, .rmap-cols-nav gap/padding)와 반드시 동기화.
const COL_W = 320;
const COL_GAP = 16; // 기본·최소 컬럼 간격
const PAD_X = 16; // 컬럼 영역 좌우 패딩

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
  parentId?: string; // 이 컬럼이 파생된 부모 노드(드릴다운). root엔 없음 → 검증 배지 표시 안 함
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
// bundle: 표시할 데이터 번들(라우트가 D_WEB을 넘김). 생략 시 useDatasets 기본 폴백(샘플).
export function ResourceMapView({ bundle }: { bundle?: AppData } = {}) {
  const datasets = useDatasets(bundle);
  const data = datasets.active;
  const { epById, screenById } = useMemo(() => indexData(data), [data]);

  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));
  const [axis, setAxis] = useState<Axis>("screen");
  const [path, setPath] = useState<PathStep[]>([]);
  const [leftMode, setLeftMode] = useState<"verify" | "platform">("verify"); // 필터·왼쪽 점 기준: 검증 vs 플랫폼
  const [verifySet, setVerifySet] = useState<Set<string>>(
    () => new Set(["both", "code", "runtime"]),
  );

  // 데이터셋 교체 시 탐색 경로 초기화.
  useEffect(() => setPath([]), [data]);

  // 활성 모드에 따라 edge 필터: 플랫폼 모드=플랫폼별, 검증 모드=검증방식(코드/실측/코드+실측)별.
  const activeEdges = useMemo(
    () =>
      leftMode === "platform"
        ? data.edges.filter((e) => platforms.has(e.platform))
        : data.edges.filter((e) => verifySet.has(e.source ?? "code")),
    [data, platforms, verifySet, leftMode],
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

  const toggleVerify = (k: string) => {
    setVerifySet((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      if (next.size === 0) next.add(k); // 절대 빈 상태 안 됨
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
            {leftMode === "platform" ? (
              <PlatformFilter platforms={platforms} onToggle={togglePlatform} />
            ) : (
              <VerifyFilter active={verifySet} onToggle={toggleVerify} />
            )}
            <div className="rmap-dir" role="tablist" title="필터·왼쪽 점을 무엇 기준으로 볼지">
              <button
                type="button"
                className={leftMode === "verify" ? "active" : ""}
                onClick={() => setLeftMode("verify")}
              >
                검증
              </button>
              <button
                type="button"
                className={leftMode === "platform" ? "active" : ""}
                onClick={() => setLeftMode("platform")}
              >
                플랫폼
              </button>
            </div>
          </div>
          <ColumnNav
            axis={axis}
            activeEdges={activeEdges}
            query={query}
            path={path}
            onPath={setPath}
            leftMode={leftMode}
          />
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
  leftMode: "verify" | "platform";
}

function ColumnNav({ axis, activeEdges, query, path, onPath, leftMode }: ColumnNavProps) {
  const { data, epById, screenById } = useData();
  const q = query.trim().toLowerCase();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tick, setTick] = useState(0); // 세로 스크롤·리사이즈 시 연결선 재측정 트리거
  const [links, setLinks] = useState<LinkSeg[]>([]);
  const [svg, setSvg] = useState({ w: 0, h: 0 });
  const [gapPx, setGapPx] = useState(COL_GAP); // 4컬럼이 가용 폭을 채우도록 늘린 컬럼 간격

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
          parentId: step.id, // 부모=화면 → 각 API 행 배지 = edge(화면,API).source
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
          parentId: step.id, // 부모=API → 각 화면 행 배지 = edge(화면,API).source
        });
      }
    }
    return cols;
  }, [data, activeEdges, axis, path, q, screenById, epById]);

  // (화면,API) 매핑의 검증 방식 조회맵 — 드릴다운 컬럼 항목 배지에 쓴다. key = `screen\tendpoint`.
  const edgeSource = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of activeEdges) if (e.source) m.set(`${e.screen}\t${e.endpoint}`, e.source);
    return m;
  }, [activeEdges]);

  // 시작 컬럼(root) 항목의 대표 검증값: 그 화면/API가 가진 연결 중 가장 강한 것(both>runtime>code).
  const nodeRep = useMemo(() => {
    const rank: Record<string, number> = { both: 3, runtime: 2, code: 1 };
    const m = new Map<string, string>();
    for (const e of activeEdges) {
      const s = e.source ?? "code";
      for (const id of [e.screen, e.endpoint]) {
        const cur = m.get(id);
        if (!cur || rank[s] > (rank[cur] ?? 0)) m.set(id, s);
      }
    }
    return m;
  }, [activeEdges]);

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

  // 컬럼 리사이즈 시 재측정 + 컬럼 간격 재계산(세로 스크롤은 각 컬럼 onScroll에서 tick).
  // 좌우 패딩은 PAD_X로 고정하고, 4컬럼이 가용 폭을 꽉 채우도록 컬럼 사이 간격만 늘린다.
  // → 4뎁스일 때 우측 여백이 사라지고 좌우가 PAD_X로 일정해진다.
  // 1~3뎁스에서는 간격이 고정이라 우측만 더 비어 보인다(의도).
  useLayoutEffect(() => {
    const nav = scrollRef.current;
    if (!nav) return;
    const measure = () => {
      const free = nav.clientWidth - PAD_X * 2 - MAX_COLS * COL_W;
      setGapPx(Math.max(COL_GAP, Math.floor(free / (MAX_COLS - 1))));
      setTick((t) => t + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  // 컬럼 colIndex에서 항목 선택 → 그 컬럼까지의 경로를 자르고 새 스텝 추가(오른쪽 컬럼들은 재생성).
  // 마지막(4번째) 컬럼은 더 열지 않는다 → 4뎁스 하드 차단.
  const onPick = (colIndex: number, type: NodeType, id: string) => {
    if (colIndex >= MAX_COLS - 1) return;
    onPath((prev) => [...prev.slice(0, colIndex), { type, id }]);
  };

  const bumpTick = () => setTick((t) => t + 1);

  return (
    <div className="rmap-cols-nav" ref={scrollRef} style={{ gap: gapPx }}>
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
        <ColumnView
          key={col.key}
          col={col}
          colIndex={ci}
          onPick={onPick}
          onBodyScroll={bumpTick}
          locked={ci >= MAX_COLS - 1}
          edgeSource={edgeSource}
          nodeRep={nodeRep}
          leftMode={leftMode}
        />
      ))}
    </div>
  );
}

// 검증값 → 라벨·색. both=코드+실측(초록)·runtime=실측(파랑)·code=코드(회색).
const V_LABEL: Record<string, string> = { both: "코드+실측", runtime: "실측", code: "코드" };
// 검증 신호등: 코드+실측=진초록 · 실측=노랑 · 코드=회색 (신뢰도 순, 서로 뚜렷이 구분).
const V_COLOR: Record<string, string> = { both: "#22c55e", runtime: "#facc15", code: "#94a3b8" };

// 행 왼쪽 점. 검증 모드=검증 색점(직접 연결(=드릴다운) 아니면 빈 점), 플랫폼 모드=플랫폼 신호등.
function LeftDot({
  mode,
  plats,
  source,
}: {
  mode: "verify" | "platform";
  plats: Platform[];
  source?: string;
}) {
  if (mode === "platform") return <PlatDots plats={plats} />;
  const color = source ? V_COLOR[source] : undefined;
  return (
    <span className="platdots">
      <span
        className={`pd${color ? "" : " vdot-none"}`}
        style={color ? { background: color } : undefined}
        title={source ? `검증: ${V_LABEL[source]}` : "직접 연결 아님(시작 컬럼)"}
      />
    </span>
  );
}

// 검증방식 필터(툴바): 코드+실측·실측·코드 on/off. PlatformFilter와 같은 룩앤필.
const VERIFY_OPTS = [
  { key: "both", label: "코드+실측" },
  { key: "runtime", label: "실측" },
  { key: "code", label: "코드" },
];
function VerifyFilter({ active, onToggle }: { active: Set<string>; onToggle: (k: string) => void }) {
  return (
    <div className="pfilter">
      {VERIFY_OPTS.map((o) => (
        <label
          key={o.key}
          className={active.has(o.key) ? "" : "off"}
          onClick={() => onToggle(o.key)}
        >
          <span className="dot" style={{ background: V_COLOR[o.key] }} />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function ColumnView({
  col,
  colIndex,
  onPick,
  onBodyScroll,
  locked,
  edgeSource,
  nodeRep,
  leftMode,
}: {
  col: NavColumn;
  colIndex: number;
  onPick: (colIndex: number, type: NodeType, id: string) => void;
  onBodyScroll: () => void;
  locked: boolean;
  edgeSource: Map<string, string>;
  nodeRep: Map<string, string>;
  leftMode: "verify" | "platform";
}) {
  const groups =
    col.type === "screen"
      ? (groupScreens(col.items as Screen[]) as Group<Screen | Endpoint>[])
      : (groupEndpoints(col.items as Endpoint[]) as Group<Screen | Endpoint>[]);

  return (
    <div className={`rnav-col${locked ? " locked" : ""}`}>
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
                    const url = s.url ? s.url.replace(/^https?:\/\//, "") : "";
                    const src = col.parentId
                      ? edgeSource.get(`${s.id}\t${col.parentId}`)
                      : nodeRep.get(s.id);
                    return (
                      <li
                        key={s.id}
                        data-sel-col={isSel ? colIndex : undefined}
                        className={`rnav-item${isSel ? " sel" : ""}`}
                        title={url ? `${s.name}\n${s.url}` : `${s.name} [${s.code}]`}
                        onClick={() => onPick(colIndex, "screen", s.id)}
                      >
                        <LeftDot mode={leftMode} plats={s.platforms} source={src} />
                        <span className="rnav-slabel">
                          <span className="rnav-srow">
                            {s.url ? (
                              <HomeLinkButton urls={[s.url]} triggerLabel={url} />
                            ) : (
                              <span className="rnav-smain">{s.name}</span>
                            )}
                          </span>
                          {s.url ? <span className="rnav-ssub">{s.name}</span> : null}
                        </span>
                      </li>
                    );
                  }
                  const a = item as Endpoint;
                  const src = col.parentId
                    ? edgeSource.get(`${col.parentId}\t${a.id}`)
                    : nodeRep.get(a.id);
                  return (
                    <li
                      key={a.id}
                      data-sel-col={isSel ? colIndex : undefined}
                      className={`rnav-item${isSel ? " sel" : ""}`}
                      title={a.summary ? `${a.summary}\n${a.method} ${a.path}` : `${a.method} ${a.path}`}
                      onClick={() => onPick(colIndex, "ep", a.id)}
                    >
                      <LeftDot mode={leftMode} plats={a.platforms} source={src} />
                      <span className={`badge ${methodCls(a.method)}`}>{a.method}</span>
                      <span className="rnav-slabel">
                        <span className="rnav-srow">
                          <span className="rnav-smain mono">{a.path}</span>
                        </span>
                        {a.summary ? <span className="rnav-ssub">{a.summary}</span> : null}
                      </span>
                      <HomeLinkButton urls={a.homepage ?? []} />
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

function LinkIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

// 라이브 페이지 링크: 클릭해도 바로 이동하지 않고 URL 목록 팝오버를 띄운다(확인 후 각 URL 클릭 시 새 탭).
// 팝오버는 컬럼의 overflow 클립을 피하려 body로 portal하고, 위치는 버튼 기준 fixed 좌표로 잡는다.
// triggerLabel: 주면 고리 아이콘 대신 그 텍스트(=URL)를 트리거로 쓴다 — 화면 행 URL이 "실수 클릭 즉시 이동"되지 않게.
function HomeLinkButton({ urls, triggerLabel }: { urls: string[]; triggerLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (document.getElementById("rnav-pop")?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    // 컬럼/페이지 스크롤·리사이즈 시 fixed 팝오버가 버튼과 어긋나므로 닫는다(capture로 내부 스크롤도 포착).
    const onShift = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onShift, true);
    window.addEventListener("resize", onShift);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onShift, true);
      window.removeEventListener("resize", onShift);
    };
  }, [open]);

  if (!urls.length) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 드릴다운(행 클릭)과 분리
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const W = 320;
      const estH = Math.min(320, 30 + urls.length * 30); // 팝오버 대략 높이
      const left = Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8));
      // 아래로 펼치면 뷰포트를 넘는 경우 버튼 위로 펼친다.
      const top =
        r.bottom + 6 + estH > window.innerHeight - 8 ? Math.max(8, r.top - estH - 6) : r.bottom + 6;
      setPos({ left, top });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={
          triggerLabel ? `rnav-surl-btn${open ? " on" : ""}` : `rnav-link-btn${open ? " on" : ""}`
        }
        title={triggerLabel ? "클릭 → 라이브 페이지 링크 열기" : `라이브 페이지 ${urls.length}개 보기`}
        aria-label="라이브 페이지 링크 보기"
        onClick={toggle}
      >
        {triggerLabel ? (
          triggerLabel
        ) : (
          <>
            <LinkIcon />
            <span className="rnav-link-n">{urls.length}</span>
          </>
        )}
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            id="rnav-pop"
            className="rnav-pop"
            style={{ left: pos.left, top: pos.top }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rnav-pop-head">
              라이브 페이지{urls.length > 1 ? ` · ${urls.length}` : ""}
            </div>
            <ul className="rnav-pop-list">
              {urls.map((u) => (
                <li key={u}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    title={u}
                    onClick={() => setOpen(false)}
                  >
                    {u.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
