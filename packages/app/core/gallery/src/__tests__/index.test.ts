import { beforeEach, describe, expect, it } from 'vitest'

import type { GalleryInstance, GalleryItem, GalleryOptions, GalleryProvider } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-gallery', () => {
  beforeEach(() => {
    setProvider(null as unknown as GalleryProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile GalleryItem type', () => {
      const item: GalleryItem = {
        src: '/images/photo.jpg',
        thumbnail: '/images/photo-thumb.jpg',
        width: 1920,
        height: 1080,
        alt: 'A beautiful photo',
        caption: 'Taken in 2024',
      }
      expect(item.src).toBe('/images/photo.jpg')
      expect(item.width).toBe(1920)
    })

    it('should compile GalleryItem with minimal fields', () => {
      const item: GalleryItem = {
        src: '/img.jpg',
        width: 800,
        height: 600,
      }
      expect(item.thumbnail).toBeUndefined()
    })

    it('should compile GalleryOptions type', () => {
      const options: GalleryOptions = {
        items: [{ src: '/img.jpg', width: 800, height: 600 }],
        startIndex: 0,
        onClose: () => {},
        showThumbnails: true,
        showCounter: true,
        zoomable: false,
      }
      expect(options.items).toHaveLength(1)
    })

    it('should compile GalleryInstance type', () => {
      const instance: GalleryInstance = {
        open: () => {},
        close: () => {},
        next: () => {},
        previous: () => {},
        goTo: () => {},
        getCurrentIndex: () => 0,
      }
      expect(instance.getCurrentIndex()).toBe(0)
    })

    it('should compile GalleryProvider type', () => {
      const provider: GalleryProvider = {
        name: 'test',
        createGallery: () => ({
          open: () => {},
          close: () => {},
          next: () => {},
          previous: () => {},
          goTo: () => {},
          getCurrentIndex: () => 0,
        }),
      }
      expect(provider.name).toBe('test')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'Gallery provider not configured. Bond a gallery provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: GalleryProvider = {
        name: 'test-gallery',
        createGallery: () => ({
          open: () => {},
          close: () => {},
          next: () => {},
          previous: () => {},
          goTo: () => {},
          getCurrentIndex: () => 0,
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a gallery instance', () => {
      const mockInstance: GalleryInstance = {
        open: () => {},
        close: () => {},
        next: () => {},
        previous: () => {},
        goTo: () => {},
        getCurrentIndex: () => 2,
      }
      const mockProvider: GalleryProvider = {
        name: 'test',
        createGallery: () => mockInstance,
      }
      setProvider(mockProvider)

      const gallery = requireProvider().createGallery({
        items: [
          { src: '/1.jpg', width: 800, height: 600 },
          { src: '/2.jpg', width: 800, height: 600 },
          { src: '/3.jpg', width: 800, height: 600 },
        ],
      })
      expect(gallery.getCurrentIndex()).toBe(2)
    })
  })
})
