import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Base path des assets.
 *
 * GitHub Pages sert le site depuis https://<user>.github.io/<repo>/ : le build doit
 * donc être généré avec `--base=/<repo>/`. On lit ici la variable d'environnement
 * BASE_PATH (définie dans le workflow GitHub Actions à partir du nom du dépôt) pour
 * éviter d'écrire le nom du repo en dur.
 *
 * En local, BASE_PATH est absent -> base = '/' (http://localhost:5173/).
 */
const rawBase = (process.env.BASE_PATH ?? '/').trim()
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    // hls.js + React Router tiennent largement sous cette limite : on évite juste
    // le warning inutile du chunk "player".
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          player: ['hls.js'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  preview: {
    port: 4173,
  },
})
