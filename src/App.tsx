import { useEffect, useMemo, useState } from "react";
import type { Platform, Selection, TableTab } from "./types";
import { indexData } from "./data";
import { useDatasets } from "./datasets";
import { DataContext } from "./dataContext";
import { PLATFORMS } from "./constants";
import { Header } from "./components/Header";
import { DataControls } from "./components/DataControls";
import { Toolbar } from "./components/Toolbar";
import { Graph } from "./components/Graph";
import { DetailPanel } from "./components/DetailPanel";
import { Tables } from "./components/Tables";

export default function App() {
  // 데이터셋(번들 + 업로드 스냅샷) 관리. active 가 현재 화면에 쓰이는 데이터.
  const datasets = useDatasets();
  const data = datasets.active;
  const { epById, screenById } = useMemo(() => indexData(data), [data]);

  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));
  const [selected, setSelected] = useState<Selection>(null);
  const [tableTab, setTableTab] = useState<TableTab>("screen");
  const [tableQuery, setTableQuery] = useState("");
  // 토글 하나로 좌우(그래프+상세패널)를 같이 리사이즈 → 노드 클릭해도 워크스페이스 높이가 안 변해서 레이아웃이 안 들썩인다.
  const [expanded, setExpanded] = useState(false);

  // 데이터셋을 바꾸면 이전 선택이 새 데이터셋엔 없을 수 있으니 선택을 해제한다.
  useEffect(() => setSelected(null), [data]);

  // 현재 플랫폼 필터에서 보이는 edge — 그래프·상세패널·표가 공유하는 파생 입력.
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

  const onSelect = (type: "ep" | "screen", id: string) => setSelected({ type, id });
  const onClear = () => setSelected(null);

  return (
    <DataContext.Provider value={{ data, epById, screenById }}>
      <Header />
      <main>
        <DataControls ds={datasets} />
        <Toolbar
          query={query}
          onQuery={setQuery}
          platforms={platforms}
          onTogglePlatform={togglePlatform}
        />
        {/* 그래프 + 상세 패널 + 펼치기 바를 한 박스로 묶는다. 펼치기는 둘 다에
            적용되므로, 바를 이 박스의 푸터로 둬서 '같은 영역 소속'임을 드러낸다. */}
        <div className="workspace-box">
          <div className="workspace">
            <Graph
              activeEdges={activeEdges}
              platforms={platforms}
              query={query}
              selected={selected}
              onSelect={onSelect}
              onClear={onClear}
              expanded={expanded}
            />
            <DetailPanel
              selected={selected}
              activeEdges={activeEdges}
              platforms={platforms}
              onSelect={onSelect}
              expanded={expanded}
            />
          </div>
          <button
            type="button"
            className="resize-toggle-bar workspace-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? "접기 ▲" : "펼치기 ▼"}
          </button>
        </div>
        <Tables
          tab={tableTab}
          onTab={setTableTab}
          query={tableQuery}
          onQuery={setTableQuery}
          activeEdges={activeEdges}
          onSelect={onSelect}
        />
      </main>
    </DataContext.Provider>
  );
}
