import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 독립 실행 앱: 모든 데이터는 app/src 아래에 있음.
// base: "./" 로 자산 경로를 상대 경로로 유지해 프로덕션 빌드를 파일에서 바로 열 수 있게 함.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
