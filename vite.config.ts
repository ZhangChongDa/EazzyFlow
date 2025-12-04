import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use '.' as cwd to avoid TypeScript issues with process.cwd() in some environments
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react()],
    define: {
      // Safely inject API key, fallback to empty string if missing to prevent build errors
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
    }
  };
});