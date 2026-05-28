import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Whitelist of allowed proxy targets
const ALLOWED_PROXY_HOSTS = [
  'http://localhost:5000',
  'http://localhost:5001',
  'http://localhost:8000',
  'https://api.example.com', // Update with your actual production domain
  'https://api.brewspot.com'
];

function resolveProxyTarget(rawTarget) {
  if (!rawTarget) {
    return 'http://localhost:5000';
  }

  try {
    const parsed = new URL(rawTarget);
    const origin = parsed.origin;

    // Check if target is in whitelist
    if (!ALLOWED_PROXY_HOSTS.includes(origin)) {
      console.warn(`[Vite] Proxy target ${origin} not in whitelist. Using default.`);
      return 'http://localhost:5000';
    }

    return origin;
  } catch (error) {
    console.warn(`[Vite] Invalid proxy target URL: ${rawTarget}. Using default.`);
    return 'http://localhost:5000';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = resolveProxyTarget(env.VITE_API_BASE || 'http://localhost:5000');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
