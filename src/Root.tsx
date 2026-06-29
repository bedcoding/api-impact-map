import { HashRouter, Routes, Route } from "react-router-dom";
import { ResourceMapView } from "./views/resourceMap/ResourceMapView";
import { D_WEB } from "./data.web";

// 라우팅 셸. routing-docs(web 전용·코드+실측 검증) 데이터 단일 뷰.
//  · "/" · "/map" · "/web" → 리소스맵 뷰. (옛 data.json 기반 /legacy·/temp 그래프뷰는 제거됨)
export default function Root() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<ResourceMapView bundle={D_WEB} />} />
        <Route path="/map" element={<ResourceMapView bundle={D_WEB} />} />
        <Route path="/web" element={<ResourceMapView bundle={D_WEB} />} />
      </Routes>
    </HashRouter>
  );
}
