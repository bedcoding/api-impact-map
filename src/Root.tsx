import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { ResourceMapView } from "./views/resourceMap/ResourceMapView";

// 라우팅 셸.
//  · "/"      → 리소스맵 뷰(메인).
//  · "/map"   → 리소스맵 뷰(기존 URL 호환).
//  · "/temp"  → 기존 그래프 뷰(보존용). 상단 전환 탭은 일단 숨김 — 직접 #/temp 로 접근.
// (전환 탭 UI는 .viewtabs 스타일로 남겨둠. 다시 노출하려면 아래 <nav> 복원.)
export default function Root() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ResourceMapView />} />
        <Route path="/map" element={<ResourceMapView />} />
        <Route path="/temp" element={<App />} />
      </Routes>
    </HashRouter>
  );
}
