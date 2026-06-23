import { useEffect, useRef, useState } from "react";
import type { DatasetsApi } from "../datasets";

// 헤더용 커스텀 스냅샷 드롭다운.
// 기본 <select>는 option에 칩을 못 넣어, 닫힌 버튼엔 [날짜 + "현재" 칩] + 위에 화면·API 메타를,
// 펼친 목록 각 항목엔 [날짜 + 칩 + 메타]를 보여주려고 커스텀으로 구현.
export function SnapshotSelect({ ds }: { ds: DatasetsApi }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭·ESC로 닫기.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = ds.active;
  const activeIsBundle = active.generatedAt === ds.bundledAt;

  return (
    <div className="snap" ref={ref}>
      <span className="snap-meta">
        화면 {active.screens.length} · API {active.endpoints.length}
      </span>
      <button
        type="button"
        className="snap-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="snap-date">{active.generatedAt}</span>
        {activeIsBundle && <span className="snap-chip">현재</span>}
        <span className="snap-caret">▾</span>
      </button>
      {open && (
        <ul className="snap-menu">
          {ds.datasets.map((d) => {
            const isBundle = d.generatedAt === ds.bundledAt;
            const isActive = d.generatedAt === ds.activeAt;
            return (
              <li
                key={d.generatedAt}
                className={isActive ? "sel" : ""}
                onClick={() => {
                  ds.setActiveAt(d.generatedAt);
                  setOpen(false);
                }}
              >
                <span className="snap-date">{d.generatedAt}</span>
                {isBundle && <span className="snap-chip">현재</span>}
                <span className="snap-menu-meta">
                  화면 {d.screens.length} · API {d.endpoints.length}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
