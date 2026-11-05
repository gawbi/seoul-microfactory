import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 경로는 CI에서 VITE_BASE로 주입한다 (예: /seoul-microfactory/).
// 로컬 개발과 미리보기는 '/'를 쓴다. 저장소 이름을 코드에 박아 두지 않기 위함.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: { target: 'es2020', assetsInlineLimit: 4096 },
})
