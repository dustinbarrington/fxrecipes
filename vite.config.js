import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_VERSION__: JSON.stringify(process.env.VITE_BUILD_VERSION || new Date().toISOString()),
  },
})
