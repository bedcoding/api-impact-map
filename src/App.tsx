import { useMemo, useState } from "react";
import type { Platform, Selection, TableTab } from "./types";
import { D } from "./data";
import { PLATFORMS } from "./constants";
import { Header } from "./components/Header";
import { Toolbar } from "./components/Toolbar";
import { Graph } from "./components/Graph";
import { DetailPanel } from "./components/DetailPanel";
import { Tables } from "./components/Tables";

export default function App() {
  const [query, setQuery] = useState("");
  const [platforms, setPlatforms] = useState<Set<Platform>>(new Set(PLATFORMS));
  const [selected, setSelected] = useState<Selection>(null);
  const [tableTab, setTableTab] = useState<TableTab>("screen");
  const [tableQuery, setTableQuery] = useState("");
  // 토글 하나로 좌우(그래프+상세패널)를 같이 리사이즈 → 노드 클릭해도 워크스페이스 높이가 안 변해서 레이아웃이 안 들썩인다.
  const [expanded, setExpanded] = useState(false);

  // 현재 플랫폼 필터에서 보이는 edge — 그래프·상세패널·표가 공유하는 파생 입력.
  const activeEdges = useMemo(
    () => D.edges.filter((e) => platforms.has(e.platform)),
    [platforms],
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
    <>
      <Header />
      <main>
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
    </>
  );
}
