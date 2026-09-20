// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@services': path.resolve(__dirname, './src/services'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@context': path.resolve(__dirname, './src/context'),
        '@mocks': path.resolve(__dirname, './src/mocks'),
        '@assets': path.resolve(__dirname, './src/assets')
      }
    },
    server: {
      port: 5173,
      open: true,
      cors: true
    },
    build: {
      outDir: 'dist',
      // ✅ SEGURIDAD: sin sourcemaps en producción (no exponer código fuente)
      sourcemap: !isProd,
      // ✅ RENDIMIENTO: subir el umbral de warning de chunks
      chunkSizeWarningLimit: 1000,
      esbuild: {
        drop: isProd ? ['console', 'debugger'] : []
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            // Solo forzamos chunk propio para las librerías PESADAS y opcionales.
            // El resto lo maneja Rollup automáticamente por ruta (gracias a React.lazy),
            // evitando un chunk "vendor" gigante que se cargue siempre.
            if (id.includes('@excalidraw')) return 'vendor-excalidraw'
            if (id.includes('@react-pdf')) return 'vendor-pdf'
            if (id.includes('xlsx')) return 'vendor-xlsx'
            if (id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-export'
            if (id.includes('@tiptap')) return 'vendor-editor'
            if (id.includes('qrcode') || id.includes('react-webcam') || id.includes('jsqr')) return 'vendor-qr'
            if (id.includes('framer-motion')) return 'vendor-motion'
            if (id.includes('@supabase')) return 'vendor-supabase'
            // Sin catch-all: dejar que Rollup haga el code-splitting automático
          }
        }
      }
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        exclude: ['node_modules/**', 'dist/**']
      }
    }
  }
})
