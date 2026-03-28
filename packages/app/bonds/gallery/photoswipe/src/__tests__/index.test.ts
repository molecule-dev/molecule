import { describe, expect, it, vi } from 'vitest'

import type { GalleryProvider } from '@molecule/app-gallery'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-gallery-photoswipe', () => {
  const sampleItems = [
    { src: '/1.jpg', width: 800, height: 600, alt: 'Image 1' },
    { src: '/2.jpg', width: 1024, height: 768, alt: 'Image 2' },
    { src: '/3.jpg', width: 1920, height: 1080, alt: 'Image 3' },
  ]

  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('photoswipe')
    })

    it('should conform to GalleryProvider interface', () => {
      const p: GalleryProvider = provider
      expect(typeof p.createGallery).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('photoswipe')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ zoomable: false })
      expect(p.name).toBe('photoswipe')
    })
  })

  describe('gallery instance', () => {
    it('should create with default index 0', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      expect(gallery.getCurrentIndex()).toBe(0)
    })

    it('should create with custom start index', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 2 })
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should open at specific index', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open(1)
      expect(gallery.getCurrentIndex()).toBe(1)
    })

    it('should navigate next', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.next()
      expect(gallery.getCurrentIndex()).toBe(1)
    })

    it('should not go past last item', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 2 })
      gallery.next()
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should navigate previous', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 2 })
      gallery.previous()
      expect(gallery.getCurrentIndex()).toBe(1)
    })

    it('should not go before first item', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.previous()
      expect(gallery.getCurrentIndex()).toBe(0)
    })

    it('should go to specific index', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.goTo(2)
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should ignore invalid index in goTo', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.goTo(10)
      expect(gallery.getCurrentIndex()).toBe(0)
      gallery.goTo(-1)
      expect(gallery.getCurrentIndex()).toBe(0)
    })

    it('should call onClose when closing', () => {
      const onClose = vi.fn()
      const gallery = provider.createGallery({ items: sampleItems, onClose })
      gallery.close()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
