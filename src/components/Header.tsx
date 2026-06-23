import type { ReactNode } from "react";
import { useData } from "../dataContext";

/** 상단 다크 헤더: 제목·부제·통계 칩. 우측 actions 슬롯에 데이터 컨트롤 등을 끼울 수 있다. */
export function Header({
  actions,
  showGeneratedAt = true,
}: {
  actions?: ReactNode;
  showGeneratedAt?: boolean;
}) {
  const { data } = useData();
  const s = data.stats;
  const items: [string, number][] = [
    ["화면", s.screens],
    ["엔드포인트", s.endpoints],
    ["연결", s.edges],
    ["iOS 화면", s.iosScreens],
    ["Android 화면", s.androidScreens],
    ["Web 화면", s.webScreens],
  ];
  return (
    <header>
      <h1>크로스플랫폼 API 영향도 맵</h1>
      <div className="sub">
        iOS · Android · Web 화면 ↔ API 엔드포인트 매핑 · 엔드포인트 변경 시
        영향받는 화면(플랫폼별) 시각화
      </div>
      <div className="stats">
        {items.map(([k, v]) => (
          <div className="stat" key={k}>
            <b>{v ?? "—"}</b>
            <span>{k}</span>
          </div>
        ))}
        {showGeneratedAt && (
          <div className="stat">
            <span>생성 {data.generatedAt}</span>
          </div>
        )}
        {actions && <div className="header-actions">{actions}</div>}
      </div>
    </header>
  );
}
