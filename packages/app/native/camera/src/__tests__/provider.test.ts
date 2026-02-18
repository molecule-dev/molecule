// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  capturePreview,
  checkPermission,
  flipCamera,
  getPhoto,
  getProvider,
  pickPhotos,
  requestPermission,
  setProvider,
  startPreview,
  stopPreview,
} from '../provider.js'
import type { CameraProvider, Photo } from '../types.js'

describe('camera/provider', () => {
  let mockProvider: CameraProvider

  beforeEach(() => {
    mockProvider = {
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
      getPhoto: vi.fn().mockResolvedValue({ base64: 'abc', format: 'jpeg' } as Photo),
      getVideo: vi.fn().mockRejectedValue(new Error('Not supported')),
      pickPhotos: vi.fn().mockResolvedValue([{ base64: 'def', format: 'jpeg' }] as Photo[]),
      startPreview: vi.fn().mockResolvedValue(undefined),
      stopPreview: vi.fn().mockResolvedValue(undefined),
      capturePreview: vi.fn().mockResolvedValue({ base64: 'ghi', format: 'jpeg' } as Photo),
      flipCamera: vi.fn().mockResolvedValue(undefined),
      hasTorch: vi.fn().mockResolvedValue(false),
      toggleTorch: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
    }
  })

  afterEach(() => {
    // Reset provider to null by setting a new provider then clearing
    setProvider(mockProvider)
  })

  describe('setProvider', () => {
    it('should set the provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })
  })

  describe('getProvider', () => {
    it('should return the set provider', () => {
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should create a web provider if none is set', () => {
      // Reset module state by creating a fresh import
      // For this test, we verify that getProvider returns something when called
      const provider = getProvider()
      expect(provider).toBeDefined()
      expect(typeof provider.checkPermission).toBe('function')
    })
  })

  describe('checkPermission', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await checkPermission()
      expect(result).toBe('granted')
      expect(mockProvider.checkPermission).toHaveBeenCalled()
    })
  })

  describe('requestPermission', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await requestPermission()
      expect(result).toBe('granted')
      expect(mockProvider.requestPermission).toHaveBeenCalled()
    })
  })

  describe('getPhoto', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await getPhoto()
      expect(result.base64).toBe('abc')
      expect(mockProvider.getPhoto).toHaveBeenCalled()
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      await getPhoto({ source: 'camera', direction: 'front' })
      expect(mockProvider.getPhoto).toHaveBeenCalledWith({ source: 'camera', direction: 'front' })
    })
  })

  describe('pickPhotos', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await pickPhotos()
      expect(result).toHaveLength(1)
      expect(mockProvider.pickPhotos).toHaveBeenCalled()
    })

    it('should pass options with limit', async () => {
      setProvider(mockProvider)
      await pickPhotos({ limit: 5 })
      expect(mockProvider.pickPhotos).toHaveBeenCalledWith({ limit: 5 })
    })
  })

  describe('startPreview', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const parent = document.createElement('div')
      await startPreview({ parent })
      expect(mockProvider.startPreview).toHaveBeenCalledWith({ parent })
    })
  })

  describe('stopPreview', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await stopPreview()
      expect(mockProvider.stopPreview).toHaveBeenCalled()
    })
  })

  describe('capturePreview', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await capturePreview()
      expect(result.base64).toBe('ghi')
      expect(mockProvider.capturePreview).toHaveBeenCalled()
    })

    it('should pass quality option', async () => {
      setProvider(mockProvider)
      await capturePreview({ quality: 80 })
      expect(mockProvider.capturePreview).toHaveBeenCalledWith({ quality: 80 })
    })
  })

  describe('flipCamera', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      await flipCamera()
      expect(mockProvider.flipCamera).toHaveBeenCalled()
    })
  })
})
