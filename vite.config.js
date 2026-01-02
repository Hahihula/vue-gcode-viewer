import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'lib') {
    // Library build configuration
    return {
      plugins: [vue()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.js'),
          name: 'VueGcodeViewer',
          fileName: (format) => `vue-gcode-viewer.${format === 'es' ? 'js' : 'umd.cjs'}`
        },
        rollupOptions: {
          // Externalize deps that shouldn't be bundled
          external: ['vue'],
          output: {
            // Global vars for UMD build
            globals: {
              vue: 'Vue'
            },
            // Preserve CSS
            assetFileNames: (assetInfo) => {
              if (assetInfo.name === 'style.css') return 'style.css';
              return assetInfo.name;
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