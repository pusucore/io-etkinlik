import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname), '');
  const apiTarget = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:3001';

  return {
    plugins: [react()],
    base: '/admin/',
    server: {
      port: 5174,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
