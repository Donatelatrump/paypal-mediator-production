import { defineConfig, loadEnv } from 'vite';
import { publicEnvironment } from './runtime-config.mjs';

export default defineConfig(({ mode }) => {
  const environment = publicEnvironment({
    ...loadEnv(mode, process.cwd(), ''),
    ...process.env,
  });
  return {
    define: Object.fromEntries(
      Object.entries(environment).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value),
      ]),
    ),
    server: { host: '0.0.0.0', port: 3000, strictPort: true },
  };
});
