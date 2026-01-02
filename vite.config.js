import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    // Library build configuration
    return {
      plugins: [vue()],
      build: {
        cssCodeSplit: false,
        lib: {
          entry: resolve(__dirname, 'src/index.js'),
          name: 'VueGcodeViewer',
          fileName: (format) => `vue-gcode-viewer.${format === 'es' ? 'js' : 'umd.cjs'}`,
          formats: ['es', 'umd']
        },
        rollupOptions: {
          // Externalize deps that shouldn't be bundled
          external: ['vue', 'three', 'three-stdlib', 'codemirror', '@codemirror/state', '@codemirror/view', '@codemirror/language', '@codemirror/commands'],
          output: {
            // Global vars for UMD build
            globals: {
              vue: 'Vue',
              three: 'THREE',
              'three-stdlib': 'ThreeStdlib',
              codemirror: 'CodeMirror',
              '@codemirror/state': 'CodemirrorState',
              '@codemirror/view': 'CodemirrorView',
              '@codemirror/language': 'CodemirrorLanguage',
              '@codemirror/commands': 'CodemirrorCommands'
            },
            assetFileNames: (assetInfo) => {
              if (assetInfo.name && assetInfo.name.endsWith('.css')) {
                return 'style.css'
              }
              return assetInfo.name || 'assets/[name][extname]'
            }
          }
        }
      }
    }
  } else {
    // Demo app build configuration
    return {
      plugins: [vue()],
      base: '/vue-gcode-viewer/',
      build: {
        outDir: 'dist-demo',
        assetsDir: 'assets'
      }
    }
  }
})