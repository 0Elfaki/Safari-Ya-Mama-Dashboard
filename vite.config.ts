import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist-webdash',
    // recharts is ~550 kB minified on its own; it gets its own cached chunk, loaded only by chart pages.
    chunkSizeWarningLimit: 600,
    rollupOptions: { output: { manualChunks: { charts: ['recharts'], supabase: ['@supabase/supabase-js'], map: ['leaflet'] } } },
  },
  // 5173 belongs to the website project. If 5180 is taken Vite moves to the next free port.
  server: { port: 5180 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
