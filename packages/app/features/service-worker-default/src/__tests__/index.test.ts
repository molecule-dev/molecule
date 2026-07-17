import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('workbox-core', () => ({ clientsClaim: vi.fn() }))
vi.mock('workbox-expiration', () => ({ ExpirationPlugin: vi.fn() }))
vi.mock('workbox-precaching', () => ({
  precacheAndRoute: vi.fn(),
  createHandlerBoundToURL: vi.fn(() => () => {}),
}))
vi.mock('workbox-routing', () => ({ registerRoute: vi.fn() }))
vi.mock('workbox-strategies', () => ({ StaleWhileRevalidate: vi.fn() }))

import { DEFAULT_IMAGE_EXTENSIONS, setupDefaultServiceWorker } from '../index.js'

type NavigationMatcher = (arg: { request: Request; url: URL }) => boolean
type ImageMatcher = (arg: { url: URL }) => boolean

/**
 * Build a service-worker global-scope double.
 *
 * @param opts - `origin` for `location`, and optional `scope` for
 *   `registration` (omit to simulate a scope-less environment).
 * @returns A stand-in `ServiceWorkerGlobalScope`.
 */
function makeSW(opts: { origin?: string; scope?: string | null } = {}): ServiceWorkerGlobalScope {
  const { origin = 'https://example.com', scope = 'https://example.com/' } = opts
  return {
    addEventListener: vi.fn(),
    location: { origin },
    skipWaiting: vi.fn(),
    ...(scope === null ? {} : { registration: { scope } }),
  } as unknown as ServiceWorkerGlobalScope
}

describe('@molecule/app-service-worker-default', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports setupDefaultServiceWorker', () => {
    expect(typeof setupDefaultServiceWorker).toBe('function')
  })

  it('calls clientsClaim + precacheAndRoute + 2 registerRoutes + addEventListener', async () => {
    const { clientsClaim } = await import('workbox-core')
    const { precacheAndRoute } = await import('workbox-precaching')
    const { registerRoute } = await import('workbox-routing')
    const mockSW = makeSW()
    setupDefaultServiceWorker(mockSW, [{ url: '/index.html', revision: 'abc' }])
    expect(clientsClaim).toHaveBeenCalled()
    expect(precacheAndRoute).toHaveBeenCalledWith([{ url: '/index.html', revision: 'abc' }])
    expect(registerRoute).toHaveBeenCalledTimes(2)
    expect(mockSW.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })

  describe('navigation fallback (base path)', () => {
    it('derives the fallback from a root registration scope', async () => {
      const { createHandlerBoundToURL } = await import('workbox-precaching')
      setupDefaultServiceWorker(makeSW({ scope: 'https://example.com/' }), [])
      expect(createHandlerBoundToURL).toHaveBeenCalledWith('/index.html')
    })

    it('respects a non-root base path from the registration scope (NOT hardcoded /index.html)', async () => {
      const { createHandlerBoundToURL } = await import('workbox-precaching')
      setupDefaultServiceWorker(makeSW({ scope: 'https://example.com/app/' }), [])
      expect(createHandlerBoundToURL).toHaveBeenCalledWith('/app/index.html')
      expect(createHandlerBoundToURL).not.toHaveBeenCalledWith('/index.html')
    })

    it('honors an explicit navigationFallback override', async () => {
      const { createHandlerBoundToURL } = await import('workbox-precaching')
      setupDefaultServiceWorker(makeSW({ scope: 'https://example.com/app/' }), [], {
        navigationFallback: '/custom/shell.html',
      })
      expect(createHandlerBoundToURL).toHaveBeenCalledWith('/custom/shell.html')
    })

    it('falls back to /index.html when no registration scope is available', async () => {
      const { createHandlerBoundToURL } = await import('workbox-precaching')
      setupDefaultServiceWorker(makeSW({ scope: null }), [])
      expect(createHandlerBoundToURL).toHaveBeenCalledWith('/index.html')
    })
  })

  describe('image cache route', () => {
    /**
     * Run setup and return the image-route matcher (2nd registerRoute call).
     *
     * @returns The predicate registered for the image cache.
     */
    async function getImageMatcher(): Promise<ImageMatcher> {
      const { registerRoute } = await import('workbox-routing')
      setupDefaultServiceWorker(makeSW(), [])
      const call = (registerRoute as unknown as { mock: { calls: unknown[][] } }).mock.calls[1]!
      return call[0] as ImageMatcher
    }

    it('matches every common web image extension, not just png', async () => {
      const match = await getImageMatcher()
      const origin = 'https://example.com'
      for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'svg', 'ico']) {
        expect(match({ url: new URL(`${origin}/assets/photo.${ext}`) })).toBe(true)
      }
      // Explicitly assert the formerly-missing formats.
      expect(match({ url: new URL(`${origin}/a.jpg`) })).toBe(true)
      expect(match({ url: new URL(`${origin}/a.webp`) })).toBe(true)
    })

    it('is case-insensitive on the extension', async () => {
      const match = await getImageMatcher()
      expect(match({ url: new URL('https://example.com/A.PNG') })).toBe(true)
      expect(match({ url: new URL('https://example.com/B.JPEG') })).toBe(true)
    })

    it('does not match non-image assets or cross-origin images', async () => {
      const match = await getImageMatcher()
      expect(match({ url: new URL('https://example.com/app.js') })).toBe(false)
      expect(match({ url: new URL('https://example.com/data.json') })).toBe(false)
      // Cross-origin image is not same-origin → not cached.
      expect(match({ url: new URL('https://cdn.other.com/logo.png') })).toBe(false)
    })

    it('honors a custom imageExtensions option', async () => {
      const { registerRoute } = await import('workbox-routing')
      setupDefaultServiceWorker(makeSW(), [], { imageExtensions: ['png'] })
      const call = (registerRoute as unknown as { mock: { calls: unknown[][] } }).mock.calls[1]!
      const match = call[0] as ImageMatcher
      expect(match({ url: new URL('https://example.com/a.png') })).toBe(true)
      expect(match({ url: new URL('https://example.com/a.webp') })).toBe(false)
    })
  })

  it('exports the default image extension list', () => {
    expect(DEFAULT_IMAGE_EXTENSIONS).toContain('png')
    expect(DEFAULT_IMAGE_EXTENSIONS).toContain('webp')
    expect(DEFAULT_IMAGE_EXTENSIONS).toContain('svg')
  })

  it('registers the navigation matcher correctly (navigate-only, skips /_ and files)', async () => {
    const { registerRoute } = await import('workbox-routing')
    setupDefaultServiceWorker(makeSW(), [])
    const navCall = (registerRoute as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]!
    const match = navCall[0] as NavigationMatcher
    const nav = (pathname: string) => ({
      request: { mode: 'navigate' } as Request,
      url: new URL(`https://example.com${pathname}`),
    })
    expect(match(nav('/dashboard'))).toBe(true)
    expect(match(nav('/_internal'))).toBe(false)
    expect(match(nav('/logo.png'))).toBe(false)
    expect(
      match({ request: { mode: 'cors' } as Request, url: new URL('https://example.com/x') }),
    ).toBe(false)
  })
})
