import { defineConfig } from 'vite';

export default defineConfig({
  // Environment variable configuration
  envPrefix: 'VITE_',
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
      },
    },
  },
  
  // Server configuration
  server: {
    port: 3000,
    open: true,
  },
  
  // Preview configuration
  preview: {
    port: 4173,
  },
});
