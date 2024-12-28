import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',  // Root is the project directory
  build: {
    outDir: 'dist',  // Output directory for production build
  },
  server: {
    open: true,  // Automatically open the browser
  }
});
