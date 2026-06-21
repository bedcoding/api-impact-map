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
  // One toggle resizes BOTH columns (graph + detail panel) together, so the
  // workspace height never changes on node click → no layout jump.
  const [expanded, setExpanded] = useState(false);

  // Edges visible under the current platform filter — the single derived input
  // shared by the graph, detail panel and tables.
  const activeEdges = useMemo(
    () => D.edges.filter((e) => platforms.has(e.platform)),
    [platforms],
  );

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      if (next.size === 0) next.add(p); // never empty
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
        <div className="workspace">
          <Graph
            activeEdges={activeEdges}
            platforms={platforms}
            query={query}
            selected={selected}
            onSelect={onSelect}
            onClear={onClear}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
          />
          <DetailPanel
            selected={selected}
            activeEdges={activeEdges}
            platforms={platforms}
            onSelect={onSelect}
            expanded={expanded}
          />
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
