import { HashRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { ResourceMapView } from "./views/resourceMap/ResourceMapView";
import { D_WEB } from "./data.web";

// 라우팅 셸. 메인(/)은 이제 routing-docs 신규(web 전용·코드+실측 검증) 데이터다.
//  · "/" · "/map" · "/web" → 리소스맵 뷰(신규 데이터). routing-docs 폴더가 없으면 기존 data.json으로 폴백.
//  · "/legacy"             → 기존 data.json 리소스맵(비교·보존용). 신규 검증이 끝나면 제거 예정.
//  · "/temp"               → 기존 그래프 뷰(보존용). 직접 #/temp 로 접근.
// (전환 탭 UI는 .viewtabs 스타일로 남겨둠. 다시 노출하려면 <nav> 복원.)
export default function Root() {
  // 메인 번들 = 신규(web). routing-docs 폴더가 없으면 D_WEB이 null → useDatasets 기본값(기존 data.json)으로 폴백.
  const mainBundle = D_WEB ?? undefined;
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ResourceMapView bundle={mainBundle} />} />
        <Route path="/map" element={<ResourceMapView bundle={mainBundle} />} />
        <Route path="/web" element={<ResourceMapView bundle={mainBundle} />} />
        <Route path="/legacy" element={<ResourceMapView />} />
        <Route path="/temp" element={<App />} />
      </Routes>
    </HashRouter>
  );
}
