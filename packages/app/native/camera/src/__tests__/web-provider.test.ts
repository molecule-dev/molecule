// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CameraProvider } from '../types.js'
import { createWebCameraProvider } from '../web-provider.js'

describe('camera/web-provider', () => {
  let provider: CameraProvider
  let mockStream: MediaStream
  let mockTrack: MediaStreamTrack

  beforeEach(() => {
    mockTrack = {
      stop: vi.fn(),
      getCapabilities: vi.fn().mockReturnValue({}),
      applyConstraints: vi.fn().mockResolvedValue(undefined),
    } as unknown as MediaStreamTrack

    mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack]),
      getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
    } as unknown as MediaStream

    // Mock navigator.mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    })

    // Mock navigator.permissions
    Object.defineProperty(navigator, 'permissions', {
      value: {
        query: vi.fn().mockResolvedValue({ state: 'granted' }),
      },
      writable: true,
      configurable: true,
    })

    provider = createWebCameraProvider()
  })

  afterEach(() => {
    provider.destroy()
    vi.restoreAllMocks()
  })

  describe('checkPermission', () => {
    it('should return granted when permission is granted', async () => {
      const result = await provider.checkPermission()
      expect(result).toBe('granted')
    })

    it('should return prompt when permissions API is not available', async () => {
      Object.defineProperty(navigator, 'permissions', {
        value: undefined,
        writable: true,
        configurable: true,
      })

      const newProvider = createWebCameraProvider()
      const result = await newProvider.checkPermission()
      expect(result).toBe('prompt')
      newProvider.destroy()
    })

    it('should return prompt when permissions query fails', async () => {
      Object.defineProperty(navigator, 'permissions', {
        value: {
          query: vi.fn().mockRejectedValue(new Error('Not supported')),
        },
        writable: true,
        configurable: true,
      })

      const newProvider = createWebCameraProvider()
      const result = await newProvider.checkPermission()
      expect(result).toBe('prompt')
      newProvider.destroy()
    })
  })

  describe('requestPermission', () => {
    it('should return granted when getUserMedia succeeds', async () => {
      const result = await provider.requestPermission()
      expect(result).toBe('granted')
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true })
      expect(mockTrack.stop).toHaveBeenCalled()
    })

    it('should return denied when NotAllowedError is thrown', async () => {
      const error = new Error('NotAllowedError')
      error.name = 'NotAllowedError'
      ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(error)

      const result = await provider.requestPermission()
      expect(result).toBe('denied')
    })

    it('should return prompt for other errors', async () => {
      ;(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Other error'),
      )

      const result = await provider.requestPermission()
      expect(result).toBe('prompt')
    })
  })

  describe('getVideo', () => {
    it('should throw error as not supported', async () => {
      await expect(provider.getVideo()).rejects.toThrow('Video recording not supported')
    })
  })

  describe('hasTorch', () => {
    it('should return false when no stream is active', async () => {
      const result = await provider.hasTorch()
      expect(result).toBe(false)
    })

    it('should return true when torch capability is available', async () => {
      const parent = document.createElement('div')

      // Mock video element
      const mockVideo = document.createElement('video')
      // Override srcObject to avoid happy-dom MediaStream validation
      Object.defineProperty(mockVideo, 'srcObject', { value: null, writable: true })
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'video') {
          Object.defineProperty(mockVideo, 'readyState', { value: 4, writable: true })
          mockVideo.play = vi.fn().mockResolvedValue(undefined)
          return mockVideo
        }
        return document.createElement(tag)
      })
      ;(mockTrack.getCapabilities as ReturnType<typeof vi.fn>).mockReturnValue({ torch: true })

      await provider.startPreview({ parent })
      const result = await provider.hasTorch()
      expect(result).toBe(true)
    })
  })

  describe('toggleTorch', () => {
    it('should throw error when preview is not started', async () => {
      await expect(provider.toggleTorch(true)).rejects.toThrow('Preview not started')
    })
  })

  describe('capturePreview', () => {
    it('should throw error when preview is not started', async () => {
      await expect(provider.capturePreview()).rejects.toThrow('Preview not started')
    })
  })

  describe('flipCamera', () => {
    it('should throw error when preview is not started', async () => {
      await expect(provider.flipCamera()).rejects.toThrow('Preview not started')
    })
  })

  describe('destroy', () => {
    it('should clean up resources', () => {
      provider.destroy()
      // Should not throw
      expect(true).toBe(true)
    })
  })
})
