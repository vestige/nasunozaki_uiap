import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/nasunozaki_uiap/',
  plugins: [react()],
});
