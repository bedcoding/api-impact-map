import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { DatasetsApi } from "../datasets";
import { isValidData } from "../data";
import { SnapshotSelect } from "./SnapshotSelect";

interface Props {
  ds: DatasetsApi;
  variant?: "bar" | "header"; // "header" = 다크 헤더에 인라인으로 끼우는 경량 스타일
}

// JSON 내려받기/올리기 + 업로드 스냅샷을 생성일별로 전환하는 컨트롤.
export function DataControls({ ds, variant = "bar" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState<{ text: string; err?: boolean } | null>(null);
  const header = variant === "header";

  // 현재 활성 데이터셋을 JSON 파일로 저장.
  function download() {
    const data = ds.active;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `api-impact-map-${data.generatedAt}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // 파일 선택 → 파싱·검증 후 스냅샷으로 추가(생성일 같으면 교체).
  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 onChange가 또 뜨도록 비움
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isValidData(parsed)) {
        setNote({
          text: "JSON 구조가 올바르지 않습니다 (generatedAt·endpoints·screens·edges·stats 필요).",
          err: true,
        });
        return;
      }
      const replaced = ds.datasets.some((d) => d.generatedAt === parsed.generatedAt);
      ds.addDataset(parsed);
      setNote({
        text: `불러옴 · 생성일 ${parsed.generatedAt}${replaced ? " (기존 교체)" : " (새 스냅샷)"}`,
      });
    } catch {
      setNote({ text: "JSON 파싱 실패 — 파일을 확인해 주세요.", err: true });
    }
  }

  // 다크 헤더용: 커스텀 스냅샷 드롭다운 + JSON 입출력.
  if (header) {
    return (
      <div className="header-data">
        <SnapshotSelect ds={ds} />
        {ds.activeIsUpload && (
          <button type="button" className="hd-btn" onClick={ds.removeActive}>
            스냅샷 삭제
          </button>
        )}
        {note && (
          <span className={`hd-note${note.err ? " err" : ""}`}>{note.text}</span>
        )}
        <div className="hd-actions">
          <button type="button" className="hd-btn" onClick={download}>
            JSON 내려받기
          </button>
          <button
            type="button"
            className="hd-btn primary"
            onClick={() => fileRef.current?.click()}
          >
            JSON 올리기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onFile}
          />
        </div>
      </div>
    );
  }

  // 기본(라이트) 바: 그래프 뷰에서 쓰는 기본 select 기반.
  return (
    <div className="databar">
      <span className="databar-label">데이터 스냅샷</span>
      <select value={ds.activeAt} onChange={(e) => ds.setActiveAt(e.target.value)}>
        {ds.datasets.map((d) => (
          <option key={d.generatedAt} value={d.generatedAt}>
            {d.generatedAt}
            {d.generatedAt === ds.bundledAt ? " (현재)" : ""} · 화면 {d.screens.length} · API{" "}
            {d.endpoints.length}
          </option>
        ))}
      </select>
      {ds.activeIsUpload && (
        <button type="button" className="db-btn" onClick={ds.removeActive}>
          이 스냅샷 삭제
        </button>
      )}
      {note && <span className={`databar-note${note.err ? " err" : ""}`}>{note.text}</span>}
      <div className="databar-actions">
        <button type="button" className="db-btn" onClick={download}>
          JSON 내려받기
        </button>
        <button
          type="button"
          className="db-btn primary"
          onClick={() => fileRef.current?.click()}
        >
          JSON 올리기
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={onFile}
        />
      </div>
    </div>
  );
}
