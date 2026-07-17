import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GalleryProvider } from '@molecule/app-gallery'

// jsdom/node can't fully render the PhotoSwipe lightbox, so mock the library and
// assert that the provider drives the REAL PhotoSwipe API (dataSource + index +
// init()/close()/destroy()/next()/prev()/goTo() + .on(...) event subscriptions).
const mocks = vi.hoisted(() => {
  class MockPhotoSwipe {
    static instances: MockPhotoSwipe[] = []

    options: { dataSource?: unknown; index?: number; zoom?: boolean; counter?: boolean }
    currIndex: number
    listeners: Record<string, Array<() => void>> = {}

    init = vi.fn()
    close = vi.fn()
    destroy = vi.fn()
    next = vi.fn()
    prev = vi.fn()
    goTo = vi.fn((index: number) => {
      this.currIndex = index
    })

    constructor(options: MockPhotoSwipe['options']) {
      this.options = options
      this.currIndex = options?.index ?? 0
      MockPhotoSwipe.instances.push(this)
    }

    on(event: string, fn: () => void): void {
      ;(this.listeners[event] ||= []).push(fn)
    }

    /** Test helper — simulate PhotoSwipe firing one of its lifecycle events. */
    emit(event: string): void {
      for (const fn of this.listeners[event] || []) {
        fn()
      }
    }
  }

  return { MockPhotoSwipe }
})

vi.mock('photoswipe', () => ({ default: mocks.MockPhotoSwipe }))

const { MockPhotoSwipe } = mocks

// Imported after the mock is registered.
const { createProvider, provider } = await import('../index.js')

describe('@molecule/app-gallery-photoswipe', () => {
  const sampleItems = [
    {
      src: '/1.jpg',
      width: 800,
      height: 600,
      alt: 'Image 1',
      thumbnail: '/1-thumb.jpg',
      caption: 'One',
    },
    { src: '/2.jpg', width: 1024, height: 768, alt: 'Image 2' },
    { src: '/3.jpg', width: 1920, height: 1080, alt: 'Image 3' },
  ]

  beforeEach(() => {
    MockPhotoSwipe.instances.length = 0
    vi.clearAllMocks()
  })

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

  describe('gallery instance (closed state)', () => {
    it('should not construct PhotoSwipe until open() is called', () => {
      provider.createGallery({ items: sampleItems, startIndex: 1 })
      expect(MockPhotoSwipe.instances).toHaveLength(0)
    })

    it('should report default index 0', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      expect(gallery.getCurrentIndex()).toBe(0)
    })

    it('should report the custom start index', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 2 })
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should navigate next before opening', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.next()
      expect(gallery.getCurrentIndex()).toBe(1)
    })

    it('should not go past last item', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 2 })
      gallery.next()
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should navigate previous before opening', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 2 })
      gallery.previous()
      expect(gallery.getCurrentIndex()).toBe(1)
    })

    it('should not go before first item', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.previous()
      expect(gallery.getCurrentIndex()).toBe(0)
    })

    it('should go to a specific index before opening', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.goTo(2)
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should ignore an invalid index in goTo', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.goTo(10)
      expect(gallery.getCurrentIndex()).toBe(0)
      gallery.goTo(-1)
      expect(gallery.getCurrentIndex()).toBe(0)
    })

    it('should call onClose when close() is called without opening', () => {
      const onClose = vi.fn()
      const gallery = provider.createGallery({ items: sampleItems, onClose })
      gallery.close()
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(MockPhotoSwipe.instances).toHaveLength(0)
    })
  })

  describe('PhotoSwipe wiring (open)', () => {
    it('should construct PhotoSwipe with a dataSource mapped from the items and call init()', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()

      expect(MockPhotoSwipe.instances).toHaveLength(1)
      const pswp = MockPhotoSwipe.instances[0]!

      expect(pswp.options.dataSource).toEqual([
        {
          src: '/1.jpg',
          width: 800,
          height: 600,
          alt: 'Image 1',
          msrc: '/1-thumb.jpg',
          caption: 'One',
        },
        {
          src: '/2.jpg',
          width: 1024,
          height: 768,
          alt: 'Image 2',
          msrc: undefined,
          caption: undefined,
        },
        {
          src: '/3.jpg',
          width: 1920,
          height: 1080,
          alt: 'Image 3',
          msrc: undefined,
          caption: undefined,
        },
      ])
      expect(pswp.init).toHaveBeenCalledTimes(1)
    })

    it('should open at the provided index', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open(2)

      const pswp = MockPhotoSwipe.instances[0]!
      expect(pswp.options.index).toBe(2)
      expect(gallery.getCurrentIndex()).toBe(2)
    })

    it('should open at the configured startIndex when open() gets no argument', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 1 })
      gallery.open()

      expect(MockPhotoSwipe.instances[0]!.options.index).toBe(1)
    })

    it('should ignore an out-of-range open() index and use the current index', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 1 })
      gallery.open(99)

      expect(MockPhotoSwipe.instances[0]!.options.index).toBe(1)
    })

    it('should pass zoom and counter through from GalleryOptions', () => {
      const gallery = provider.createGallery({
        items: sampleItems,
        zoomable: false,
        showCounter: false,
      })
      gallery.open()

      const { zoom, counter } = MockPhotoSwipe.instances[0]!.options
      expect(zoom).toBe(false)
      expect(counter).toBe(false)
    })

    it('should let GalleryOptions override the provider-level PhotoSwipeConfig', () => {
      const p = createProvider({ zoomable: false, showCounter: false })
      const gallery = p.createGallery({ items: sampleItems, zoomable: true })
      gallery.open()

      const { zoom, counter } = MockPhotoSwipe.instances[0]!.options
      expect(zoom).toBe(true) // GalleryOptions wins
      expect(counter).toBe(false) // falls back to provider config
    })

    it('should default zoom and counter to on', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()

      const { zoom, counter } = MockPhotoSwipe.instances[0]!.options
      expect(zoom).toBe(true)
      expect(counter).toBe(true)
    })

    it('should register change, close, and destroy event handlers via .on', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()

      const pswp = MockPhotoSwipe.instances[0]!
      expect(pswp.listeners.change).toHaveLength(1)
      expect(pswp.listeners.close).toHaveLength(1)
      expect(pswp.listeners.destroy).toHaveLength(1)
    })

    it('should not construct a second instance when already open — it navigates the live one', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open(0)
      gallery.open(2)

      expect(MockPhotoSwipe.instances).toHaveLength(1)
      expect(MockPhotoSwipe.instances[0]!.goTo).toHaveBeenCalledWith(2)
    })
  })

  describe('PhotoSwipe wiring (navigation while open)', () => {
    it('should delegate next() to pswp.next()', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()
      gallery.next()
      expect(MockPhotoSwipe.instances[0]!.next).toHaveBeenCalledTimes(1)
    })

    it('should delegate previous() to pswp.prev()', () => {
      const gallery = provider.createGallery({ items: sampleItems, startIndex: 1 })
      gallery.open()
      gallery.previous()
      expect(MockPhotoSwipe.instances[0]!.prev).toHaveBeenCalledTimes(1)
    })

    it('should delegate goTo() to pswp.goTo()', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()
      gallery.goTo(2)
      expect(MockPhotoSwipe.instances[0]!.goTo).toHaveBeenCalledWith(2)
    })

    it('should reflect PhotoSwipe navigation in getCurrentIndex via the change event', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()

      const pswp = MockPhotoSwipe.instances[0]!
      pswp.currIndex = 2
      pswp.emit('change')

      expect(gallery.getCurrentIndex()).toBe(2)
    })
  })

  describe('PhotoSwipe wiring (close / destroy)', () => {
    it('should call the real pswp.close() when closing an open gallery', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()
      gallery.close()
      expect(MockPhotoSwipe.instances[0]!.close).toHaveBeenCalledTimes(1)
    })

    it('should fire onClose when PhotoSwipe emits its close event', () => {
      const onClose = vi.fn()
      const gallery = provider.createGallery({ items: sampleItems, onClose })
      gallery.open()
      MockPhotoSwipe.instances[0]!.emit('close')
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('should build a fresh instance after the previous one is destroyed', () => {
      const gallery = provider.createGallery({ items: sampleItems })
      gallery.open()
      MockPhotoSwipe.instances[0]!.emit('destroy')
      gallery.open()
      expect(MockPhotoSwipe.instances).toHaveLength(2)
    })
  })
})
