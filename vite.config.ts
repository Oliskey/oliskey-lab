import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// mode "demo": a static build that runs the in-browser demo only (no server), served under /lab/ on oliskey.com.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'demo' ? '/lab/' : '/',
  define: { __DEMO_ONLY__: JSON.stringify(mode === 'demo') },
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist', sourcemap: false },
  server: { port: 4380, proxy: { '/api': 'http://localhost:4381', '/s/': 'http://localhost:4381' } },
}));
