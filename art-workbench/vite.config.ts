import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [react(), ...(process.env.PORTABLE_BUILD === '1' ? [viteSingleFile()] : [])],
  build: { outDir: process.env.PORTABLE_BUILD === '1' ? 'portable' : 'dist', assetsInlineLimit: process.env.PORTABLE_BUILD === '1' ? 20_000_000 : 0 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
