import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // By default, only env variables prefixed with `VITE_` are loaded
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Explicitly define which env variables to expose
    define: {
      'import.meta.env.VITE_TMDB_API_KEY': JSON.stringify(env.VITE_TMDB_API_KEY),
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID),
      'import.meta.env.VITE_DTD_API_KEY': JSON.stringify(env.VITE_DTD_API_KEY),
      'import.meta.env.VITE_DEBUG_MODE': JSON.stringify(env.VITE_DEBUG_MODE),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(env.VITE_APP_ENV),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(env.VITE_APP_VERSION),
      'import.meta.env.VITE_ENABLE_AVAILABILITY': JSON.stringify(env.VITE_ENABLE_AVAILABILITY),
      'import.meta.env.VITE_ENABLE_TRIGGER_WARNINGS': JSON.stringify(env.VITE_ENABLE_TRIGGER_WARNINGS),
    },
    
    server: {
      port: 3000,
      open: true
    },
    
    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          }
        }
      }
    }
  };
});
