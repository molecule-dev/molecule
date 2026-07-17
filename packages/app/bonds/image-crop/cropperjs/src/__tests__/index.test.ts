// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// cropperjs is mocked: jsdom has no real canvas cropping and never fires image
// `load`, so a real Cropper would produce empty output. Mocking the library lets
// us assert the REAL wiring — that the provider constructs a Cropper with the
// mapped options and that each provider method delegates to the matching cropperjs
// call with the right args (and that getCroppedCanvas returns the cropper's canvas,
// not the old `{}` placeholder).
const { mockCropperInstance, mockCroppedCanvas, mockCropData, MockCropper } = vi.hoisted(() => {
  const mockCroppedCanvas = { nodeName: 'CANVAS' } as unknown as HTMLCanvasElement
  const mockCropData = {
    x: 5,
    y: 10,
    width: 100,
    height: 80,
    rotate: 90,
    scaleX: -1,
    scaleY: 1,
  }
  const mockCropperInstance = {
    getCroppedCanvas: vi.fn(() => mockCroppedCanvas),
    getData: vi.fn(() => ({ ...mockCropData })),
    setData: vi.fn(),
    reset: vi.fn(),
    rotate: vi.fn(),
    zoom: vi.fn(),
    scale: vi.fn(),
    destroy: vi.fn(),
  }
  const MockCropper = vi.fn(function () {
    return mockCropperInstance
  })
  return { mockCropperInstance, mockCroppedCanvas, mockCropData, MockCropper }
})

vi.mock('cropperjs', () => ({
  default: MockCropper,
}))

// Import after mocking.
import type { CropData, ImageCropProvider } from '@molecule/app-image-crop'

import { createProvider, provider } from '../index.js'

/** Convenience: the options object passed to the most recent `new Cropper(...)`. */
const lastCropperOptions = () => MockCropper.mock.calls[MockCropper.mock.calls.length - 1][1]
/** Convenience: the element passed to the most recent `new Cropper(...)`. */
const lastCropperElement = () =>
  MockCropper.mock.calls[MockCropper.mock.calls.length - 1][0] as HTMLImageElement

describe('@molecule/app-image-crop-cropperjs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('cropperjs')
    })

    it('should conform to ImageCropProvider interface', () => {
      const p: ImageCropProvider = provider
      expect(typeof p.createCropper).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('cropperjs')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ guides: false, background: false, viewMode: 2 })
      expect(p.name).toBe('cropperjs')
    })
  })

  describe('createCropper — constructs a real Cropper', () => {
    it('mounts a Cropper on an <img> element carrying the src', () => {
      provider.createCropper({ src: '/photo.jpg' })

      expect(MockCropper).toHaveBeenCalledTimes(1)
      const element = lastCropperElement()
      expect(element.tagName).toBe('IMG')
      expect(element.getAttribute('src')).toBe('/photo.jpg')
    })

    it('maps aspectRatio onto the cropperjs option', () => {
      provider.createCropper({ src: '/photo.jpg', aspectRatio: 1 })
      expect(lastCropperOptions()).toMatchObject({ aspectRatio: 1 })
    })

    it('omits aspectRatio when not provided (stays free-form)', () => {
      provider.createCropper({ src: '/photo.jpg' })
      expect(lastCropperOptions()).not.toHaveProperty('aspectRatio')
    })

    it('maps minWidth/minHeight onto minCropBoxWidth/minCropBoxHeight', () => {
      provider.createCropper({ src: '/photo.jpg', minWidth: 200, minHeight: 150 })
      expect(lastCropperOptions()).toMatchObject({
        minCropBoxWidth: 200,
        minCropBoxHeight: 150,
      })
    })

    it('defaults viewMode to 1 and guides/background to true', () => {
      provider.createCropper({ src: '/photo.jpg' })
      expect(lastCropperOptions()).toMatchObject({
        viewMode: 1,
        guides: true,
        background: true,
      })
    })

    it('applies provider config defaults (guides/background/viewMode)', () => {
      const p = createProvider({ guides: false, background: false, viewMode: 3 })
      p.createCropper({ src: '/photo.jpg' })
      expect(lastCropperOptions()).toMatchObject({
        viewMode: 3,
        guides: false,
        background: false,
      })
    })

    it('per-cropper guides overrides the provider config default', () => {
      const p = createProvider({ guides: false })
      p.createCropper({ src: '/photo.jpg', guides: true })
      expect(lastCropperOptions()).toMatchObject({ guides: true })
    })
  })

  describe('cropper instance — delegates to cropperjs', () => {
    it('getCroppedCanvas returns the cropper canvas (not a placeholder {})', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const canvas = cropper.getCroppedCanvas()

      expect(mockCropperInstance.getCroppedCanvas).toHaveBeenCalledTimes(1)
      expect(canvas).toBe(mockCroppedCanvas)
      // The old stub returned `{}` — assert we did NOT.
      expect(canvas).not.toEqual({})
    })

    it('getCroppedCanvas maps output + min/max options onto getCroppedCanvas', () => {
      const cropper = provider.createCropper({
        src: '/photo.jpg',
        minWidth: 50,
        minHeight: 40,
        maxWidth: 400,
        maxHeight: 300,
      })
      cropper.getCroppedCanvas({ width: 200, height: 160, fillColor: '#ffffff' })

      expect(mockCropperInstance.getCroppedCanvas).toHaveBeenCalledWith({
        width: 200,
        height: 160,
        fillColor: '#ffffff',
        minWidth: 50,
        minHeight: 40,
        maxWidth: 400,
        maxHeight: 300,
      })
    })

    it('getCroppedCanvas passes an empty options object when nothing to map', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.getCroppedCanvas()
      expect(mockCropperInstance.getCroppedCanvas).toHaveBeenCalledWith({})
    })

    it('does NOT forward quality to getCroppedCanvas (encode-time only)', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.getCroppedCanvas({ quality: 0.8 })
      expect(mockCropperInstance.getCroppedCanvas).toHaveBeenCalledWith({})
    })

    it('getCropData returns cropperjs getData() output', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const data = cropper.getCropData()

      expect(mockCropperInstance.getData).toHaveBeenCalledTimes(1)
      expect(data).toEqual(mockCropData)
    })

    it('setCropData delegates to cropperjs setData with the data', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const data: CropData = {
        x: 10,
        y: 20,
        width: 300,
        height: 200,
        rotate: 45,
        scaleX: 2,
        scaleY: 2,
      }
      cropper.setCropData(data)
      expect(mockCropperInstance.setData).toHaveBeenCalledWith(data)
    })

    it('reset delegates to cropperjs reset', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.reset()
      expect(mockCropperInstance.reset).toHaveBeenCalledTimes(1)
    })

    it('rotate delegates to cropperjs rotate with the degrees', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.rotate(90)
      expect(mockCropperInstance.rotate).toHaveBeenCalledWith(90)
    })

    it('zoom delegates to cropperjs zoom with the ratio', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.zoom(0.5)
      expect(mockCropperInstance.zoom).toHaveBeenCalledWith(0.5)
    })

    it('destroy calls cropperjs destroy and removes the image element', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const element = lastCropperElement()
      const removeSpy = vi.spyOn(element, 'remove')

      cropper.destroy()

      expect(mockCropperInstance.destroy).toHaveBeenCalledTimes(1)
      expect(removeSpy).toHaveBeenCalledTimes(1)
    })
  })
})
