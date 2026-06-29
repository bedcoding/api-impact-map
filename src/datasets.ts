import { useCallback, useEffect, useMemo, useState } from "react";
import type { AppData } from "./types";
import { D, isValidData } from "./data";

const LS_KEY = "api-impact-map.uploads";

// 업로드한 스냅샷은 localStorage에 보관해 새로고침해도 유지한다.
// 깨졌거나(파싱 실패) 용량이 넘치면 조용히 무시하고 메모리로만 동작한다.
function loadUploads(): AppData[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr: unknown = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(isValidData) : [];
  } catch {
    return [];
  }
}

function saveUploads(list: AppData[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* 용량 초과 등 — 무시 */
  }
}

export interface DatasetsApi {
  datasets: AppData[]; // 번들 + 업로드, 생성일 최신순
  active: AppData;
  activeAt: string;
  activeIsUpload: boolean; // 활성이 업로드 스냅샷이라 삭제 가능한지
  bundledAt: string;
  setActiveAt: (at: string) => void;
  addDataset: (data: AppData) => void; // 생성일 같으면 교체(번들도 덮어씀), 다르면 추가 + 활성 전환
  removeActive: () => void; // 활성이 업로드 스냅샷이면 삭제
}

// 번들 기본 데이터셋과 업로드 스냅샷들을 생성일별로 모아 관리한다.
// base: 번들 기본본(기본=기존 data.json). 새 라우트는 D_WEB(routing-docs 신규)을 넘겨 같은 UI를 다른 데이터로 띄운다.
export function useDatasets(base: AppData = D): DatasetsApi {
  const [uploads, setUploads] = useState<AppData[]>(() => loadUploads());
  const [activeAt, setActiveAt] = useState<string>(base.generatedAt);

  useEffect(() => {
    saveUploads(uploads);
  }, [uploads]);

  // 번들을 기본으로 깔고, 같은 생성일의 업로드가 있으면 그 위에 덮어쓴다(업로드 우선).
  // 이래야 '번들을 받아 편집 후 같은 날짜로 재업로드'가 반영된다. 생성일 최신순 정렬.
  const datasets = useMemo(() => {
    const byDate = new Map<string, AppData>();
    byDate.set(base.generatedAt, base);
    uploads.forEach((u) => byDate.set(u.generatedAt, u));
    return [...byDate.values()].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }, [uploads, base]);

  const active = useMemo(
    () => datasets.find((d) => d.generatedAt === activeAt) ?? base,
    [datasets, activeAt, base],
  );

  // 활성 스냅샷이 업로드본인지(삭제 가능 여부). 번들 날짜를 덮어쓴 업로드도 포함된다.
  const activeIsUpload = useMemo(
    () => uploads.some((u) => u.generatedAt === activeAt),
    [uploads, activeAt],
  );

  // 같은 생성일이면 교체, 다르면 추가. 번들과 같은 날짜여도 저장해 번들 위에 덮어쓴다.
  const addDataset = useCallback((data: AppData) => {
    setUploads((prev) => [...prev.filter((u) => u.generatedAt !== data.generatedAt), data]);
    setActiveAt(data.generatedAt);
  }, []);

  // 업로드 스냅샷 삭제. 삭제 후 같은 날짜 번들이 있으면 그게 다시 보이고, 없으면 번들 날짜로.
  const removeActive = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.generatedAt !== activeAt));
    if (activeAt !== base.generatedAt) setActiveAt(base.generatedAt);
  }, [activeAt, base]);

  return {
    datasets,
    active,
    activeAt,
    activeIsUpload,
    bundledAt: base.generatedAt,
    setActiveAt,
    addDataset,
    removeActive,
  };
}
