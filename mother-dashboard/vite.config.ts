import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    // recharts alone is ~550 kB minified; it is split into its own cached chunk.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: { manualChunks: { charts: ['recharts'], motion: ['framer-motion'], forms: ['react-hook-form', 'zod', '@hookform/resolvers'] } },
    },
  },
  server: { port: 5173, strictPort: true },
});
