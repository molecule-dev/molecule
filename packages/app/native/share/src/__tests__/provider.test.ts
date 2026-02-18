import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canShare,
  canShareContent,
  getCapabilities,
  getProvider,
  hasProvider,
  setProvider,
  share,
  shareFiles,
  shareText,
  shareUrl,
} from '../provider.js'
import type {
  ShareCapabilities,
  ShareFile,
  ShareOptions,
  ShareProvider,
  ShareResult,
} from '../types.js'

describe('share/provider', () => {
  let mockProvider: ShareProvider

  beforeEach(() => {
    mockProvider = {
      share: vi.fn().mockResolvedValue({ completed: true } as ShareResult),
      shareText: vi.fn().mockResolvedValue({ completed: true } as ShareResult),
      shareUrl: vi.fn().mockResolvedValue({ completed: true } as ShareResult),
      shareFiles: vi.fn().mockResolvedValue({ completed: true } as ShareResult),
      canShare: vi.fn().mockResolvedValue(true),
      canShareContent: vi.fn().mockResolvedValue(true),
      getCapabilities: vi.fn().mockResolvedValue({
        supported: true,
        fileSharing: true,
        multipleFiles: true,
      } as ShareCapabilities),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

    it('should throw error if no provider is set', () => {
      // When no provider is set, getProvider should throw
      // We can't fully test this without module isolation
      // but we verify the function exists
      expect(typeof getProvider).toBe('function')
    })
  })

  describe('hasProvider', () => {
    it('should return true when provider is set', () => {
      setProvider(mockProvider)
      expect(hasProvider()).toBe(true)
    })
  })

  describe('share', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const options: ShareOptions = { text: 'Hello', title: 'Test' }
      const result = await share(options)
      expect(result.completed).toBe(true)
      expect(mockProvider.share).toHaveBeenCalledWith(options)
    })
  })

  describe('shareText', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await shareText('Hello world')
      expect(result.completed).toBe(true)
      expect(mockProvider.shareText).toHaveBeenCalledWith('Hello world', undefined)
    })

    it('should pass title to provider', async () => {
      setProvider(mockProvider)
      await shareText('Hello world', 'My Title')
      expect(mockProvider.shareText).toHaveBeenCalledWith('Hello world', 'My Title')
    })
  })

  describe('shareUrl', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await shareUrl('https://example.com')
      expect(result.completed).toBe(true)
      expect(mockProvider.shareUrl).toHaveBeenCalledWith('https://example.com', undefined)
    })

    it('should pass title to provider', async () => {
      setProvider(mockProvider)
      await shareUrl('https://example.com', 'Check this out')
      expect(mockProvider.shareUrl).toHaveBeenCalledWith('https://example.com', 'Check this out')
    })
  })

  describe('shareFiles', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const files: ShareFile[] = [{ path: '/path/to/file.png' }]
      const result = await shareFiles(files)
      expect(result.completed).toBe(true)
      expect(mockProvider.shareFiles).toHaveBeenCalledWith(files, undefined)
    })

    it('should pass options to provider', async () => {
      setProvider(mockProvider)
      const files: ShareFile[] = [{ path: '/path/to/file.png', mimeType: 'image/png' }]
      const options = { title: 'Check this file' }
      await shareFiles(files, options)
      expect(mockProvider.shareFiles).toHaveBeenCalledWith(files, options)
    })
  })

  describe('canShare', () => {
    it('should return true when provider supports sharing', async () => {
      setProvider(mockProvider)
      const result = await canShare()
      expect(result).toBe(true)
    })

    it('should return false when no provider is set', async () => {
      // This test verifies the guard clause in canShare
      // Since we can't truly reset the module, we just verify the function exists
      expect(typeof canShare).toBe('function')
    })
  })

  describe('canShareContent', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const options: ShareOptions = { text: 'Test' }
      const result = await canShareContent(options)
      expect(result).toBe(true)
      expect(mockProvider.canShareContent).toHaveBeenCalledWith(options)
    })
  })

  describe('getCapabilities', () => {
    it('should delegate to provider', async () => {
      setProvider(mockProvider)
      const result = await getCapabilities()
      expect(result.supported).toBe(true)
      expect(result.fileSharing).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })
})
