import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clear,
  getAvailableTypes,
  getCapabilities,
  hasContent,
  onChange,
  read,
  readHtml,
  readImage,
  readText,
  write,
  writeHtml,
  writeImage,
  writeText,
} from '../clipboard.js'
import { setProvider } from '../provider.js'
import type { ClipboardCapabilities, ClipboardContent, ClipboardProvider } from '../types.js'

describe('clipboard/clipboard', () => {
  let mockProvider: ClipboardProvider

  beforeEach(() => {
    mockProvider = {
      write: vi.fn().mockResolvedValue(undefined),
      writeText: vi.fn().mockResolvedValue(undefined),
      writeHtml: vi.fn().mockResolvedValue(undefined),
      writeImage: vi.fn().mockResolvedValue(undefined),
      read: vi.fn().mockResolvedValue({ text: 'test content' } as ClipboardContent),
      readText: vi.fn().mockResolvedValue('test text'),
      readHtml: vi.fn().mockResolvedValue('<p>test</p>'),
      readImage: vi.fn().mockResolvedValue('data:image/png;base64,abc'),
      clear: vi.fn().mockResolvedValue(undefined),
      hasContent: vi.fn().mockResolvedValue(true),
      getAvailableTypes: vi.fn().mockResolvedValue(['text/plain', 'text/html']),
      getCapabilities: vi.fn().mockResolvedValue({
        supported: true,
        canRead: true,
        canWrite: true,
        canReadImage: true,
        canWriteImage: true,
        canReadHtml: true,
      } as ClipboardCapabilities),
      onChange: vi.fn().mockReturnValue(() => {}),
    }

    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('write', () => {
    it('should delegate to provider', async () => {
      const content: ClipboardContent = { text: 'test' }
      await write(content)
      expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
    })

    it('should pass options to provider', async () => {
      const content: ClipboardContent = { text: 'test' }
      const options = { label: 'Test label' }
      await write(content, options)
      expect(mockProvider.write).toHaveBeenCalledWith(content, options)
    })
  })

  describe('writeText', () => {
    it('should delegate to provider', async () => {
      await writeText('hello world')
      expect(mockProvider.writeText).toHaveBeenCalledWith('hello world')
    })
  })

  describe('writeHtml', () => {
    it('should delegate to provider', async () => {
      await writeHtml('<p>Hello</p>')
      expect(mockProvider.writeHtml).toHaveBeenCalledWith('<p>Hello</p>', undefined)
    })

    it('should pass fallback text', async () => {
      await writeHtml('<p>Hello</p>', 'Hello')
      expect(mockProvider.writeHtml).toHaveBeenCalledWith('<p>Hello</p>', 'Hello')
    })
  })

  describe('writeImage', () => {
    it('should delegate to provider with string', async () => {
      await writeImage('data:image/png;base64,abc')
      expect(mockProvider.writeImage).toHaveBeenCalledWith('data:image/png;base64,abc')
    })

    it('should delegate to provider with Blob', async () => {
      const blob = new Blob(['test'], { type: 'image/png' })
      await writeImage(blob)
      expect(mockProvider.writeImage).toHaveBeenCalledWith(blob)
    })
  })

  describe('read', () => {
    it('should delegate to provider', async () => {
      const result = await read()
      expect(result.text).toBe('test content')
      expect(mockProvider.read).toHaveBeenCalledWith(undefined)
    })

    it('should pass options to provider', async () => {
      const options = { preferredTypes: ['text/plain' as const] }
      await read(options)
      expect(mockProvider.read).toHaveBeenCalledWith(options)
    })
  })

  describe('readText', () => {
    it('should delegate to provider', async () => {
      const result = await readText()
      expect(result).toBe('test text')
      expect(mockProvider.readText).toHaveBeenCalled()
    })
  })

  describe('readHtml', () => {
    it('should delegate to provider', async () => {
      const result = await readHtml()
      expect(result).toBe('<p>test</p>')
      expect(mockProvider.readHtml).toHaveBeenCalled()
    })
  })

  describe('readImage', () => {
    it('should delegate to provider', async () => {
      const result = await readImage()
      expect(result).toBe('data:image/png;base64,abc')
      expect(mockProvider.readImage).toHaveBeenCalled()
    })
  })

  describe('clear', () => {
    it('should delegate to provider', async () => {
      await clear()
      expect(mockProvider.clear).toHaveBeenCalled()
    })
  })

  describe('hasContent', () => {
    it('should delegate to provider', async () => {
      const result = await hasContent()
      expect(result).toBe(true)
      expect(mockProvider.hasContent).toHaveBeenCalled()
    })
  })

  describe('getAvailableTypes', () => {
    it('should delegate to provider', async () => {
      const result = await getAvailableTypes()
      expect(result).toEqual(['text/plain', 'text/html'])
      expect(mockProvider.getAvailableTypes).toHaveBeenCalled()
    })
  })

  describe('getCapabilities', () => {
    it('should delegate to provider', async () => {
      const result = await getCapabilities()
      expect(result.supported).toBe(true)
      expect(result.canRead).toBe(true)
      expect(result.canWrite).toBe(true)
      expect(mockProvider.getCapabilities).toHaveBeenCalled()
    })
  })

  describe('onChange', () => {
    it('should delegate to provider', () => {
      const callback = vi.fn()
      const unsubscribe = onChange(callback)
      expect(mockProvider.onChange).toHaveBeenCalledWith(callback)
      expect(typeof unsubscribe).toBe('function')
    })

    it('should return no-op when provider does not support onChange', () => {
      const providerWithoutOnChange = { ...mockProvider }
      delete (providerWithoutOnChange as Partial<ClipboardProvider>).onChange
      setProvider(providerWithoutOnChange)

      const callback = vi.fn()
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const unsubscribe = onChange(callback)

      expect(consoleSpy).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
      consoleSpy.mockRestore()
    })
  })
})
