import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/L2O2/', // 改成您的實際儲存庫名稱
})
