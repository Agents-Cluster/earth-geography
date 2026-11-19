import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (
            id.includes('node_modules/d3-geo') ||
            id.includes('node_modules/topojson-client') ||
            id.includes('node_modules/world-atlas')
          ) {
            return 'geo';
          }
        },
      },
    },
  },
});
