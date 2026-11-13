import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { quasar } from '@quasar/vite-plugin';

const quasarVariables = fileURLToPath(new URL('./src/css/quasar.variables.scss', import.meta.url));

export default defineConfig({
  plugins: [vue(), quasar({ sassVariables: quasarVariables })],
  server: { allowedHosts: ['web'] },
});
