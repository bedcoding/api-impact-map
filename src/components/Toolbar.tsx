import type { Platform } from "../types";
import { PlatformFilter } from "./shared";

interface Props {
  query: string;
  onQuery: (q: string) => void;
  platforms: Set<Platform>;
  onTogglePlatform: (p: Platform) => void;
  showTip?: boolean; // 우측 설명 텍스트 노출 여부 (기본 true)
}

/** 검색창 + 플랫폼 토글 필터. */
export function Toolbar({ query, onQuery, platforms, onTogglePlatform, showTip = true }: Props) {
  return (
    <div className="toolbar">
      <input
        type="search"
        placeholder="엔드포인트 · 화면 검색"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
      />
      <PlatformFilter platforms={platforms} onToggle={onTogglePlatform} />
      {showTip && (
        <span className="tip">
          노드 클릭 → 영향 범위 표시 · 빈 곳 클릭 → 해제 · 색 = 플랫폼
        </span>
      )}
    </div>
  );
}
