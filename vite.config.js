import { defineConfig } from 'vite'
export default defineConfig({
  base: './',
  server: {
    open: true,
    port: 8080
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})