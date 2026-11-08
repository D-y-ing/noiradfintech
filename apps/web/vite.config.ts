import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@agentic-ad-broker/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@agentic-ad-broker/agent': path.resolve(__dirname, '../../packages/agent/src/index.ts'),
    },
  },
  server: {
    // Keep the dev URL aligned with FRONTEND_URL in the root .env.
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['@agentic-ad-broker/shared', '@agentic-ad-broker/agent'],
  },
});
