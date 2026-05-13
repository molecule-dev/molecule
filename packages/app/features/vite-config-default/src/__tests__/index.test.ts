import { describe, expect, it, vi } from 'vitest'

vi.mock('@tailwindcss/vite', () => ({ default: () => ({ name: 'tailwindcss' }) }))
vi.mock('@vitejs/plugin-react', () => ({ default: () => ({ name: 'react' }) }))
vi.mock('vite-plugin-pwa', () => ({ VitePWA: () => ({ name: 'pwa' }) }))

import { createDefaultViteConfig } from '../index.js'

describe('@molecule/app-vite-config-default', () => {
  it('exports createDefaultViteConfig factory', () => {
    expect(typeof createDefaultViteConfig).toBe('function')
  })

  it('returns a UserConfig with plugins, resolve, optimizeDeps, server, build, envPrefix', () => {
    const cfg = createDefaultViteConfig({
      APP_NAME: 'TestApp',
      APP_DESCRIPTION: 'A test app',
      BRAND_COLOR: '#ff0000',
    })
    expect(cfg.plugins).toBeDefined()
    expect(cfg.resolve?.dedupe).toContain('react')
    expect(cfg.optimizeDeps).toBeDefined()
    expect(cfg.server?.proxy).toHaveProperty('/api')
    expect(cfg.server?.proxy).toHaveProperty('/health')
    expect(cfg.build?.outDir).toBe('dist')
    expect(cfg.envPrefix).toBe('VITE_')
  })
})
