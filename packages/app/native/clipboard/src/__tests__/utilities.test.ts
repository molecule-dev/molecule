import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

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

    /**
     * Gives the test a document whose copy command records the selected field's text.
     *
     * @param result - What the command reports.
     * @returns The texts it copied, the command, and a function that puts the document back.
     */
    const stubDocument = (
      result: boolean,
    ): { copied: string[]; execCommand: ReturnType<typeof vi.fn>; restore: () => void } => {
      const copied: string[] = []
      const field = { value: '', style: { position: '', left: '' }, select: vi.fn() }
      const execCommand = vi.fn((command: string) => {
        if (command === 'copy' && result) copied.push(field.value)
        return result
      })
      const globals = globalThis as Record<string, unknown>
      const original = globals.document
      globals.document = {
        createElement: vi.fn(() => field),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
        execCommand,
      }
      const restore = (): void => {
        if (original !== undefined) globals.document = original
        else delete globals.document
      }
      return { copied, execCommand, restore }
    }

    it('copies with the copy command when the provider refuses', async () => {
      mockProvider.writeText = vi.fn().mockRejectedValue(new Error('Write permission denied'))
      setProvider(mockProvider)
      const doc = stubDocument(true)
      try {
        expect(await copyTextWithFallback('test text')).toBe(true)
        expect(mockProvider.writeText).toHaveBeenCalledWith('test text')
        expect(doc.copied).toEqual(['test text'])
      } finally {
        doc.restore()
      }
    })

    it('copies with the copy command when no provider is bonded', async () => {
      unbond('clipboard')
      const doc = stubDocument(true)
      try {
        expect(await copyTextWithFallback('test text')).toBe(true)
        expect(doc.copied).toEqual(['test text'])
      } finally {
        doc.restore()
      }
    })

    it('returns false when the provider refuses and the copy command fails', async () => {
      mockProvider.writeText = vi.fn().mockRejectedValue(new Error('Write permission denied'))
      setProvider(mockProvider)
      const doc = stubDocument(false)
      try {
        expect(await copyTextWithFallback('test text')).toBe(false)
        expect(doc.execCommand).toHaveBeenCalledWith('copy')
      } finally {
        doc.restore()
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
