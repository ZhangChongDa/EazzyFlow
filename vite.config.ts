
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 加载当前环境下的变量
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // 确保在本地运行和编译时，process.env.API_KEY 能被 VITE_API_KEY 替换
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY || ''),
    },
    optimizeDeps: {
      // 强制重新优化依赖，解决缓存问题
      force: false,
      // 如果特定依赖有问题，可以在这里排除
      exclude: [],
    },
    server: {
      port: 3001,
      open: true,
      cors: true,
      proxy: {
        '/api/email': {
          target: 'https://api.resend.com/emails',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/email/, ''),
        }
      }
    }
  };
});
