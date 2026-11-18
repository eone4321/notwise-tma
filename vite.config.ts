import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'guide-art',
    resolveId(id) {
      if (id === 'virtual:guide-art') return '\0' + id;
    },
    load(id) {
      if (id !== '\0virtual:guide-art') return;
      const paths = ['brand', 'game'].flatMap(group =>
        readdirSync(fileURLToPath(new URL('./public/' + group, import.meta.url)), { recursive: true })
          .filter(path => /\.(png|jpg|webp|svg)$/i.test(path))
          .map(path => '/' + group + '/' + path.replaceAll('\\', '/')));
      const priority = (path: string) => path.startsWith('/brand/') ? 0 : /\/(stickers|albums)\//.test(path) ? 2 : 1;
      return 'export default ' + JSON.stringify(paths.sort((a, b) => priority(a) - priority(b)));
    },
  }],
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
