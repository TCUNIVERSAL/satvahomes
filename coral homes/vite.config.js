import { defineConfig } from 'vite';

export default defineConfig({
  // Babylon loads its shaders with dynamic imports; pre-bundling breaks them in dev.
  optimizeDeps: { exclude: ['@babylonjs/core'] },
  build: { chunkSizeWarningLimit: 2500 },
});
