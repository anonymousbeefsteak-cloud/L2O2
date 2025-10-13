import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'taiwanese-snack-shop-ordering' with the name of your GitHub repository.
  // For example, if your repository URL is https://github.com/user/my-liff-app,
  // then the base should be '/my-liff-app/'.
  base: '/L2O2/',
})
