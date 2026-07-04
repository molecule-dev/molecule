import { describe, expect, it, vi } from 'vitest'

vi.mock('@tailwindcss/vite', () => ({ default: () => ({ name: 'tailwindcss' }) }))
vi.mock('@vitejs/plugin-react', () => ({ default: () => ({ name: 'react' }) }))
vi.mock('vite-plugin-pwa', () => ({
  // Capture the options so tests can assert on the workbox config the real
  // plugin would receive.
  VitePWA: (options: unknown) => ({ name: 'pwa', __options: options }),
}))

import { createDefaultViteConfig, PUSH_SW_FILENAME } from '../index.js'

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
    expect(cfg.server?.proxy).toHaveProperty('/socket.io')
    expect(cfg.build?.outDir).toBe('dist')
    expect(cfg.envPrefix).toBe('VITE_')
  })

  it('proxies /socket.io with websocket upgrade to the same API target as /api', () => {
    // Realtime (@molecule/api-realtime-socketio) attaches its socket.io
    // server to the API's HTTP server, so the dev proxy must forward the
    // websocket upgrade to the same target /api uses — without ws: true,
    // same-origin realtime connections fail in dev.
    const cfg = createDefaultViteConfig({
      APP_NAME: 'TestApp',
      APP_DESCRIPTION: 'A test app',
      BRAND_COLOR: '#ff0000',
    })
    const proxy = cfg.server?.proxy as Record<
      string,
      { target?: unknown; ws?: boolean; changeOrigin?: boolean }
    >
    expect(proxy['/socket.io']).toMatchObject({ ws: true, changeOrigin: true })
    expect(proxy['/socket.io'].target).toBe(proxy['/api'].target)
  })

  it('origin-isolates the dev server so a stuck/looping build cannot freeze the IDE that previews it', () => {
    // Every scaffolded app shares this origin's "site" (localhost/127.0.0.1) with
    // the IDE that frames it as a cross-origin iframe. Without Origin-Agent-Cluster,
    // the renderer can reuse a single process for both, so a hung/looping app build
    // can take the host IDE down with it. Regression guard: this header was present
    // in an unused legacy template but missing here — the generator every scaffolded
    // app actually uses — so no real app ever got the isolation.
    const cfg = createDefaultViteConfig({
      APP_NAME: 'TestApp',
      APP_DESCRIPTION: 'A test app',
      BRAND_COLOR: '#ff0000',
    })
    expect(cfg.server?.headers).toMatchObject({ 'Origin-Agent-Cluster': '?1' })
  })

  it('ships the push service-worker extension: importScripts + emit plugin', () => {
    // The Workbox generateSW output has NO 'push' listener of its own — a
    // delivered web-push displayed nothing until the shared push handler was
    // importScripts-ed into it. Regression guard on both halves of the wiring.
    const cfg = createDefaultViteConfig({
      APP_NAME: 'TestApp',
      APP_DESCRIPTION: 'A test app',
      BRAND_COLOR: '#ff0000',
    })
    const plugins = (cfg.plugins ?? []) as Array<{ name?: string; __options?: unknown }>
    const pwa = plugins.find((p) => p?.name === 'pwa')
    expect(pwa, 'VitePWA plugin present').toBeDefined()
    const workbox = (pwa?.__options as { workbox?: { importScripts?: string[] } })?.workbox
    expect(workbox?.importScripts).toContain(PUSH_SW_FILENAME)
    expect(
      plugins.some((p) => p?.name === 'molecule:push-sw'),
      'push-sw emit plugin present',
    ).toBe(true)
  })
})
