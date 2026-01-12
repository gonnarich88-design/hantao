
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '')
  
  return {
    plugins: [react()],
    // This allows using process.env.API_KEY in the code.
    // We map it to VITE_GOOGLE_AI_KEY from your Easypanel setup.
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_GOOGLE_AI_KEY || env.API_KEY)
    },
    build: {
      outDir: 'dist',
    },
    server: {
      host: true
    }
  }
})
    