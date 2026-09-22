import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  plugins: [
    {
      name: 'demo-http-responses',
      configureServer(server) {
        server.middlewares.use('/api/demo', (request, response) => {
          const path = new URL(request.url || '/', 'http://localhost').pathname;
          const status = path === '/missing' ? 404 : path === '/error' ? 500 : 200;
          setTimeout(
            () => {
              response.writeHead(status, { 'Content-Type': 'application/json' });
              response.end(JSON.stringify({ status, message: 'DevPulse demonstration response' }));
            },
            path === '/slow' ? 800 : 20,
          );
        });
      },
    },
  ],
});
