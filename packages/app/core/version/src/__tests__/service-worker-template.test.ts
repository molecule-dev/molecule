import { describe, expect, it } from 'vitest'

import { generateServiceWorkerTemplate } from '../service-worker-template.js'

describe('generateServiceWorkerTemplate', () => {
  it('generates valid TypeScript with workbox imports', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).toContain("import { clientsClaim } from 'workbox-core'")
    expect(result).toContain("import { ExpirationPlugin } from 'workbox-expiration'")
    expect(result).toContain(
      "import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'",
    )
    expect(result).toContain("import { registerRoute } from 'workbox-routing'")
    expect(result).toContain("import { StaleWhileRevalidate } from 'workbox-strategies'")
  })

  it('includes webworker reference and global scope declaration', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).toContain('/// <reference lib="webworker" />')
    expect(result).toContain('declare const self: ServiceWorkerGlobalScope')
  })

  it('includes precaching and app-shell routing', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).toContain('clientsClaim()')
    expect(result).toContain('precacheAndRoute(self.__WB_MANIFEST)')
    expect(result).toContain("createHandlerBoundToURL('/index.html')")
  })

  it('includes image caching with default 50 max entries', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).toContain("cacheName: 'images'")
    expect(result).toContain('new ExpirationPlugin({ maxEntries: 50 })')
    expect(result).toContain("url.pathname.endsWith('.png')")
  })

  it('includes SKIP_WAITING message handler', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).toContain("case 'SKIP_WAITING':")
    expect(result).toContain('self.skipWaiting()')
  })

  it('excludes push notification handlers by default', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).not.toContain("addEventListener('push'")
    expect(result).not.toContain('showNotification')
    expect(result).not.toContain('onnotificationclick')
    expect(result).not.toContain("case 'WINDOW_FOCUSED':")
  })

  it('includes push notification handlers when enabled', () => {
    const result = generateServiceWorkerTemplate({ pushNotifications: true })

    expect(result).toContain("addEventListener('push'")
    expect(result).toContain('showNotification')
    expect(result).toContain('removeNotifications')
    expect(result).toContain('getFocusedClient')
    expect(result).toContain('focusWindow')
    expect(result).toContain('self.onnotificationclick')
    expect(result).toContain("case 'WINDOW_FOCUSED':")
  })

  it('respects custom maxImageCacheEntries', () => {
    const result = generateServiceWorkerTemplate({ maxImageCacheEntries: 100 })

    expect(result).toContain('new ExpirationPlugin({ maxEntries: 100 })')
  })

  it('supports additional image cache extensions', () => {
    const result = generateServiceWorkerTemplate({
      imageCacheExtensions: ['jpg', 'webp'],
    })

    expect(result).toContain('png')
    expect(result).toContain('jpg')
    expect(result).toContain('webp')
    expect(result).not.toContain("endsWith('.png')")
  })

  it('uses simple endsWith for single extension', () => {
    const result = generateServiceWorkerTemplate()

    expect(result).toContain("url.pathname.endsWith('.png')")
  })

  it('uses regex for multiple extensions', () => {
    const result = generateServiceWorkerTemplate({
      imageCacheExtensions: ['jpg'],
    })

    expect(result).toMatch(/\/\\\.\(png\|jpg\)\$\//)
  })

  it('generates a complete file with all default options', () => {
    const result = generateServiceWorkerTemplate()

    // Should start with the reference directive
    expect(result.startsWith('/// <reference lib="webworker" />')).toBe(true)
    // Should end with a newline
    expect(result.endsWith('\n')).toBe(true)
    // Should not contain undefined or null artifacts
    expect(result).not.toContain('undefined')
    expect(result).not.toContain('null')
  })

  it('generates a complete file with all options enabled', () => {
    const result = generateServiceWorkerTemplate({
      pushNotifications: true,
      maxImageCacheEntries: 200,
      imageCacheExtensions: ['jpg', 'webp', 'svg'],
    })

    expect(result).toContain('new ExpirationPlugin({ maxEntries: 200 })')
    expect(result).toContain("addEventListener('push'")
    expect(result).toContain('jpg')
    expect(result).toContain('webp')
    expect(result).toContain('svg')
  })
})
