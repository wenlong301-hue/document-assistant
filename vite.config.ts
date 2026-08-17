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
          // 仅拆「动态 import」重库。勿把启动静态依赖（dompurify/marked/turndown）
          // 与 html-to-docx 打进同一 chunk，否则启动加载时会执行 html-to-docx
          // 并触发 Class extends value undefined（EventEmitter）导致白屏。
          if (
            id.includes('html-to-docx')
            || id.includes('mammoth')
            || id.includes('jszip')
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
