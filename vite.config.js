import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        about: resolve(__dirname, 'src/about.html'),
        contact: resolve(__dirname, 'src/contact.html'),
        projects: resolve(__dirname, 'src/projects.html'),
        'custom-vector-project': resolve(__dirname, 'src/custom-vector-project.html'),
        'sudoku-rust-project': resolve(__dirname, 'src/sudoku-rust-project.html'),
        'rss-aggregator-project': resolve(__dirname, 'src/rss-aggregator-project.html'),
        'minigrep-project': resolve(__dirname, 'src/minigrep-project.html'),
        'network-security-agent': resolve(__dirname, 'src/network-security-agent.html'),
        'snake-game-project': resolve(__dirname, 'src/snake-game-project.html'),
        'go-embeddings-project': resolve(__dirname, 'src/go-embeddings-project.html'),
        'imdb-review-project': resolve(__dirname, 'src/imdb-review-project.html'),
        'malware-classification': resolve(__dirname, 'src/malware-classification.html'),
        'neural-network-project': resolve(__dirname, 'src/neural-network-project.html'),
        'crypto-library-project': resolve(__dirname, 'src/crypto-library-project.html'),
        '404': resolve(__dirname, 'src/404.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    strictPort: true,
    // Handle clean URLs in development
    proxy: {
      '^/[^.]*/?$': {
        target: 'http://localhost:3000',
        rewrite: (path) => path.replace(/\/$/, '') + '.html'
      }
    }
  },
  preview: {
    port: 3000,
    strictPort: true
  }
}); 