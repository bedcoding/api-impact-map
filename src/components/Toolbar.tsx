import type { Platform } from "../types";
import { PLABEL, PCOLOR, PLATFORMS } from "../constants";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  platforms: Set<Platform>;
  onTogglePlatform: (p: Platform) => void;
}

/** 검색창 + 플랫폼 토글 필터. */
export function Toolbar({ query, onQuery, platforms, onTogglePlatform }: Props) {
  return (
    <div className="toolbar">
      <input
        type="search"
        placeholder="엔드포인트 · 화면 검색…"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <div className="pfilter">
        {PLATFORMS.map((p) => (
          <label
            key={p}
            className={platforms.has(p) ? "" : "off"}
            onClick={() => onTogglePlatform(p)}
          >
            <span className="dot" style={{ background: PCOLOR[p] }} />
            {PLABEL[p]}
          </label>
        ))}
      </div>
      <span className="tip">
        노드 클릭 → 영향 범위 표시 · 빈 곳 클릭 → 해제 · 색 = 플랫폼
      </span>
    </div>
  );
}
