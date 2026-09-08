import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import process from 'node:process'
import { resolveDemoConfig } from './src/endpoints'

export default defineConfig(({ command, mode }) => {
  resolveDemoConfig(loadEnv(mode, process.cwd(), 'VITE_'), command === 'build' && mode === 'production')
  return {
    plugins: [vue()],
    resolve: { dedupe: ['vue'] },
    test: { environment: 'jsdom' },
  }
})
