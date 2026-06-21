import { D } from "../data";

/** 상단 다크 헤더: 제목·부제·통계 칩. */
export function Header() {
  const s = D.stats;
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
        <div className="stat">
          <span>생성 {D.generatedAt}</span>
        </div>
      </div>
    </header>
  );
}
