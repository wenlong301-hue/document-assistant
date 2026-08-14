import { defineConfig } from 'vite'
import path from 'path'
import UnoCSS from '@unocss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    figmaAssetResolver(),
    UnoCSS(),
    react(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  esbuild: {
    legalComments: 'none',
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@tiptap') || id.includes('prosemirror')) return 'editor';
          if (
            id.includes('html-to-docx')
            || id.includes('mammoth')
            || id.includes('turndown')
            || id.includes('jszip')
            || id.includes('marked')
            || id.includes('dompurify')
          ) return 'document-export';
          if (
            id.includes('node_modules/react-dom')
            || id.includes('node_modules/react/')
            || id.includes('node_modules\\react\\')
            || id.includes('node_modules\\react-dom')
          ) return 'react-vendor';
        },
      },
    },
  },
})
