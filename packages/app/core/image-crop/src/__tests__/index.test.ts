import { beforeEach, describe, expect, it } from 'vitest'

import type {
  CropData,
  CropperInstance,
  CropperOptions,
  ImageCropProvider,
  OutputOptions,
} from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-image-crop', () => {
  beforeEach(() => {
    setProvider(null as unknown as ImageCropProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile CropData type', () => {
      const data: CropData = {
        x: 10,
        y: 20,
        width: 200,
        height: 150,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      }
      expect(data.width).toBe(200)
    })

    it('should compile OutputOptions type', () => {
      const options: OutputOptions = {
        width: 400,
        height: 300,
        fillColor: '#ffffff',
        quality: 0.9,
      }
      expect(options.quality).toBe(0.9)
    })

    it('should compile OutputOptions with minimal fields', () => {
      const options: OutputOptions = {}
      expect(options.width).toBeUndefined()
    })

    it('should compile CropperOptions type', () => {
      const options: CropperOptions = {
        src: '/photo.jpg',
        aspectRatio: 16 / 9,
        minWidth: 100,
        minHeight: 100,
        maxWidth: 2000,
        maxHeight: 2000,
        circular: false,
        guides: true,
      }
      expect(options.src).toBe('/photo.jpg')
    })

    it('should compile CropperOptions with minimal fields', () => {
      const options: CropperOptions = { src: '/img.png' }
      expect(options.aspectRatio).toBeUndefined()
    })

    it('should compile ImageCropProvider type', () => {
      const provider: ImageCropProvider = {
        name: 'test',
        createCropper: () => ({
          getCroppedCanvas: () => ({}) as HTMLCanvasElement,
          getCropData: () => ({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotate: 0,
            scaleX: 1,
            scaleY: 1,
          }),
          setCropData: () => {},
          reset: () => {},
          rotate: () => {},
          zoom: () => {},
          destroy: () => {},
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
        'ImageCrop provider not configured. Bond an image-crop provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: ImageCropProvider = {
        name: 'test-crop',
        createCropper: () => ({
          getCroppedCanvas: () => ({}) as HTMLCanvasElement,
          getCropData: () => ({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            rotate: 0,
            scaleX: 1,
            scaleY: 1,
          }),
          setCropData: () => {},
          reset: () => {},
          rotate: () => {},
          zoom: () => {},
          destroy: () => {},
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a cropper instance', () => {
      const cropData: CropData = {
        x: 10,
        y: 20,
        width: 200,
        height: 150,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      }
      const mockInstance: CropperInstance = {
        getCroppedCanvas: () => ({}) as HTMLCanvasElement,
        getCropData: () => cropData,
        setCropData: () => {},
        reset: () => {},
        rotate: () => {},
        zoom: () => {},
        destroy: () => {},
      }
      const mockProvider: ImageCropProvider = {
        name: 'test',
        createCropper: () => mockInstance,
      }
      setProvider(mockProvider)

      const cropper = requireProvider().createCropper({ src: '/photo.jpg', aspectRatio: 1 })
      expect(cropper.getCropData()).toEqual(cropData)
    })
  })
})
