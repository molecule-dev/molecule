import { describe, expect, it } from 'vitest'

import type { ImageCropProvider } from '@molecule/app-image-crop'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-image-crop-cropperjs', () => {
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
      const p = createProvider({ guides: false, background: false })
      expect(p.name).toBe('cropperjs')
    })
  })

  describe('cropper instance', () => {
    it('should create with default crop data', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const data = cropper.getCropData()
      expect(data.x).toBe(0)
      expect(data.y).toBe(0)
      expect(data.rotate).toBe(0)
      expect(data.scaleX).toBe(1)
      expect(data.scaleY).toBe(1)
    })

    it('should respect minWidth and minHeight', () => {
      const cropper = provider.createCropper({
        src: '/photo.jpg',
        minWidth: 200,
        minHeight: 150,
      })
      const data = cropper.getCropData()
      expect(data.width).toBe(200)
      expect(data.height).toBe(150)
    })

    it('should set crop data', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const newData = { x: 10, y: 20, width: 300, height: 200, rotate: 90, scaleX: 2, scaleY: 2 }
      cropper.setCropData(newData)
      expect(cropper.getCropData()).toEqual(newData)
    })

    it('should not mutate original data on get', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const data1 = cropper.getCropData()
      data1.x = 999
      const data2 = cropper.getCropData()
      expect(data2.x).toBe(0)
    })

    it('should reset crop data', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.setCropData({
        x: 50,
        y: 50,
        width: 500,
        height: 500,
        rotate: 45,
        scaleX: 3,
        scaleY: 3,
      })
      cropper.reset()
      const data = cropper.getCropData()
      expect(data.x).toBe(0)
      expect(data.y).toBe(0)
      expect(data.rotate).toBe(0)
      expect(data.scaleX).toBe(1)
    })

    it('should rotate', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.rotate(90)
      expect(cropper.getCropData().rotate).toBe(90)
      cropper.rotate(90)
      expect(cropper.getCropData().rotate).toBe(180)
    })

    it('should wrap rotation at 360', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.rotate(270)
      cropper.rotate(180)
      expect(cropper.getCropData().rotate).toBe(90)
    })

    it('should zoom', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.zoom(0.5)
      expect(cropper.getCropData().scaleX).toBe(1.5)
      expect(cropper.getCropData().scaleY).toBe(1.5)
    })

    it('should not zoom below 0.1', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      cropper.zoom(-5)
      expect(cropper.getCropData().scaleX).toBeGreaterThanOrEqual(0.1)
    })

    it('should return a canvas element from getCroppedCanvas', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      const canvas = cropper.getCroppedCanvas()
      expect(canvas).toBeDefined()
    })

    it('should destroy without error', () => {
      const cropper = provider.createCropper({ src: '/photo.jpg' })
      expect(() => cropper.destroy()).not.toThrow()
    })
  })
})
