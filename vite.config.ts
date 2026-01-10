
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Fix: Define __dirname for ESM compatibility since it's not globally available in Node ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    // Fix: Replaced process.cwd() with '.' to avoid TypeScript 'Process' type errors in some environments
    const env = loadEnv(mode, '.', '');
    return {
      // Set base so production assets work on GitHub Pages. 
      // Using './' makes the paths relative, which is often more flexible for GH Pages.
      base: mode === 'production' ? './' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // Fix: Use the manually defined __dirname for alias resolution
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
