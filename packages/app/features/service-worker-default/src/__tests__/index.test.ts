import { describe, expect, it, vi } from 'vitest'

vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() }))
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: vi.fn() }))
vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  createHandlerBoundToURL: vi.fn(() => () => {}),
}))
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn() }))
vi.mock('workbox-strategies', () => ({ StaleWhileRevalidate: vi.fn() }))

import { setupDefaultServiceWorker } from '../index.js'

describe('@molecule/app-service-worker-default', () => {
  it('exports setupDefaultServiceWorker', () => {
    expect(typeof setupDefaultServiceWorker).toBe('function')
  })

  it('calls clientsClaim + precacheAndRoute + 2 registerRoutes + addEventListener', async () => {
    const { clientsClaim } = await import('workbox-core')
    const { precacheAndRoute } = await import('workbox-precaching')
    const { registerRoute } = await import('workbox-routing')
    const mockSW = {
      addEventListener: vi.fn(),
      location: { origin: 'https://example.com' },
      skipWaiting: vi.fn(),
    } as unknown as ServiceWorkerGlobalScope
    setupDefaultServiceWorker(mockSW, [{ url: '/index.html', revision: 'abc' }])
    expect(clientsClaim).toHaveBeenCalled()
    expect(precacheAndRoute).toHaveBeenCalledWith([{ url: '/index.html', revision: 'abc' }])
    expect(registerRoute).toHaveBeenCalledTimes(2)
    expect(mockSW.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
