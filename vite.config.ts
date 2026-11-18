import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/react-router/')) return 'react-vendor';
          if (id.includes('/node_modules/motion') || id.includes('/node_modules/framer-motion/')) return 'motion-vendor';
          if (id.includes('/node_modules/@telegram-apps/')) return 'telegram-sdk';
          if (id.includes('/public/data/')) return 'guide-data';
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
  },
});
