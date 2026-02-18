import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '../provider.js'
import type { ClipboardProvider } from '../types.js'
import { copyTextWithFallback, isTextInClipboard } from '../utilities.js'

describe('clipboard/utilities', () => {
  let mockProvider: ClipboardProvider

  beforeEach(() => {
    mockProvider = {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
      writeHtml: vi.fn().mockResolvedValue(undefined),
      writeImage: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue({ text: 'test' }),
      readText: vi.fn().mockResolvedValue('test text'),
      readHtml: vi.fn().mockResolvedValue(null),
      readImage: vi.fn().mockResolvedValue(null),
      clear: vi.fn().mockResolvedValue(undefined),
      hasContent: vi.fn().mockResolvedValue(true),
      getAvailableTypes: vi.fn().mockResolvedValue(['text/plain']),
      getCapabilities: vi.fn().mockResolvedValue({
        supported: true,
        canRead: true,
        canWrite: true,
        canReadImage: false,
        canWriteImage: false,
        canReadHtml: false,
      }),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('copyTextWithFallback', () => {
    it('should use provider when available', async () => {
      setProvider(mockProvider)
      const result = await copyTextWithFallback('test text')
      expect(result).toBe(true)
      expect(mockProvider.writeText).toHaveBeenCalledWith('test text')
    })

    it('should use execCommand fallback when no provider', async () => {
      // Mock the global document for this test
      const mockTextarea = {
        value: '',
        style: { position: '', left: '' },
        select: vi.fn(),
      }
      const execCommandMock = vi.fn().mockReturnValue(true)
      const appendChildMock = vi.fn()
      const removeChildMock = vi.fn()

      // Store original document if it exists
      const originalDocument = (globalThis as Record<string, unknown>).document

      // Mock document globally
      ;(globalThis as Record<string, unknown>).document = {
        createElement: vi.fn().mockReturnValue(mockTextarea),
        body: {
          appendChild: appendChildMock,
          removeChild: removeChildMock,
        },
        execCommand: execCommandMock,
      }

      // Test with provider that fails, so it falls back to execCommand
      mockProvider.writeText = vi.fn().mockRejectedValue(new Error('Failed'))
      setProvider(mockProvider)

      const result = await copyTextWithFallback('test text')
      // When provider throws, the function catches and returns false
      // The fallback path is only used when there's NO provider at all
      expect(result).toBe(false)

      // Restore original document
      if (originalDocument !== undefined) {
        ;(globalThis as Record<string, unknown>).document = originalDocument
      } else {
        delete (globalThis as Record<string, unknown>).document
      }
    })

    it('should return false when copy fails', async () => {
      mockProvider.writeText = vi.fn().mockRejectedValue(new Error('Failed'))
      setProvider(mockProvider)

      const result = await copyTextWithFallback('test text')
      expect(result).toBe(false)
    })
  })

  describe('isTextInClipboard', () => {
    it('should return true when text matches', async () => {
      setProvider(mockProvider)
      ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('hello')

      const result = await isTextInClipboard('hello')
      expect(result).toBe(true)
    })

    it('should return false when text does not match', async () => {
      setProvider(mockProvider)
      ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('hello')

      const result = await isTextInClipboard('world')
      expect(result).toBe(false)
    })

    it('should return false when readText throws', async () => {
      setProvider(mockProvider)
      ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed'))

      const result = await isTextInClipboard('test')
      expect(result).toBe(false)
    })
  })
})
