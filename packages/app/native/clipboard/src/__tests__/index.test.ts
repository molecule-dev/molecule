/**
 * `@molecule/app-clipboard`
 * Comprehensive tests for clipboard module exports and integration
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import everything from the main module to test exports
import {
  clear,
  type ClipboardCapabilities,
  type ClipboardChangeEvent,
  type ClipboardContent,
  // Types (testing that they're exported)
  type ClipboardDataType,
  type ClipboardProvider,
  // Utilities
  copyTextWithFallback,
  getAvailableTypes,
  getCapabilities,
  getProvider,
  hasContent,
  hasProvider,
  isTextInClipboard,
  onChange,
  read,
  readHtml,
  readImage,
  type ReadOptions,
  readText,
  // Provider management
  setProvider,
  // Clipboard functions
  write,
  writeHtml,
  writeImage,
  type WriteOptions,
  writeText,
} from '../index.js'

/**
 * Creates a mock clipboard provider with all required methods
 */
function createMockProvider(overrides: Partial<ClipboardProvider> = {}): ClipboardProvider {
  return {
    write: vi.fn().mockResolvedValue(undefined),
    writeText: vi.fn().mockResolvedValue(undefined),
    writeHtml: vi.fn().mockResolvedValue(undefined),
    writeImage: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue({ text: 'default text' } as ClipboardContent),
    readText: vi.fn().mockResolvedValue('default text'),
    readHtml: vi.fn().mockResolvedValue('<p>default html</p>'),
    readImage: vi.fn().mockResolvedValue('data:image/png;base64,defaultImage'),
    clear: vi.fn().mockResolvedValue(undefined),
    hasContent: vi.fn().mockResolvedValue(true),
    getAvailableTypes: vi.fn().mockResolvedValue(['text/plain']),
    getCapabilities: vi.fn().mockResolvedValue({
      supported: true,
      canRead: true,
      canWrite: true,
      canReadImage: true,
      canWriteImage: true,
      canReadHtml: true,
    } as ClipboardCapabilities),
    onChange: vi.fn().mockReturnValue(() => {}),
    ...overrides,
  }
}

describe('@molecule/app-clipboard', () => {
  let mockProvider: ClipboardProvider

  beforeEach(() => {
    mockProvider = createMockProvider()
    setProvider(mockProvider)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Module Exports', () => {
    it('should export provider management functions', () => {
      expect(typeof setProvider).toBe('function')
      expect(typeof getProvider).toBe('function')
      expect(typeof hasProvider).toBe('function')
    })

    it('should export clipboard write functions', () => {
      expect(typeof write).toBe('function')
      expect(typeof writeText).toBe('function')
      expect(typeof writeHtml).toBe('function')
      expect(typeof writeImage).toBe('function')
    })

    it('should export clipboard read functions', () => {
      expect(typeof read).toBe('function')
      expect(typeof readText).toBe('function')
      expect(typeof readHtml).toBe('function')
      expect(typeof readImage).toBe('function')
    })

    it('should export clipboard management functions', () => {
      expect(typeof clear).toBe('function')
      expect(typeof hasContent).toBe('function')
      expect(typeof getAvailableTypes).toBe('function')
      expect(typeof getCapabilities).toBe('function')
      expect(typeof onChange).toBe('function')
    })

    it('should export utility functions', () => {
      expect(typeof copyTextWithFallback).toBe('function')
      expect(typeof isTextInClipboard).toBe('function')
    })
  })

  describe('Provider Management Integration', () => {
    it('should allow setting and retrieving provider', () => {
      const provider = createMockProvider()
      setProvider(provider)
      expect(getProvider()).toBe(provider)
    })

    it('should report true for hasProvider after setting', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('should use the set provider for all operations', async () => {
      const customProvider = createMockProvider({
        readText: vi.fn().mockResolvedValue('custom text'),
      })
      setProvider(customProvider)

      const result = await readText()
      expect(result).toBe('custom text')
      expect(customProvider.readText).toHaveBeenCalled()
    })
  })

  describe('Write Operations', () => {
    describe('write()', () => {
      it('should write text content', async () => {
        const content: ClipboardContent = { text: 'Hello World' }
        await write(content)
        expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
      })

      it('should write HTML content', async () => {
        const content: ClipboardContent = { html: '<strong>Bold</strong>' }
        await write(content)
        expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
      })

      it('should write image content as base64', async () => {
        const content: ClipboardContent = { image: 'data:image/png;base64,abc123' }
        await write(content)
        expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
      })

      it('should write URL content', async () => {
        const content: ClipboardContent = { url: 'https://example.com' }
        await write(content)
        expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
      })

      it('should write multiple content types at once', async () => {
        const content: ClipboardContent = {
          text: 'Plain text',
          html: '<p>HTML text</p>',
          url: 'https://example.com',
        }
        await write(content)
        expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
      })

      it('should pass write options', async () => {
        const content: ClipboardContent = { text: 'Test' }
        const options: WriteOptions = { label: 'Test Label', showConfirmation: true }
        await write(content, options)
        expect(mockProvider.write).toHaveBeenCalledWith(content, options)
      })

      it('should write raw data with MIME type', async () => {
        const content: ClipboardContent = {
          data: {
            type: 'application/json',
            value: '{"key": "value"}',
          },
        }
        await write(content)
        expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
      })
    })

    describe('writeText()', () => {
      it('should write plain text', async () => {
        await writeText('Simple text')
        expect(mockProvider.writeText).toHaveBeenCalledWith('Simple text')
      })

      it('should handle empty string', async () => {
        await writeText('')
        expect(mockProvider.writeText).toHaveBeenCalledWith('')
      })

      it('should handle text with special characters', async () => {
        const specialText = 'Line1\nLine2\tTabbed\r\nWindows'
        await writeText(specialText)
        expect(mockProvider.writeText).toHaveBeenCalledWith(specialText)
      })

      it('should handle unicode text', async () => {
        const unicodeText = 'Hello World!'
        await writeText(unicodeText)
        expect(mockProvider.writeText).toHaveBeenCalledWith(unicodeText)
      })

      it('should handle very long text', async () => {
        const longText = 'x'.repeat(100000)
        await writeText(longText)
        expect(mockProvider.writeText).toHaveBeenCalledWith(longText)
      })
    })

    describe('writeHtml()', () => {
      it('should write HTML content', async () => {
        await writeHtml('<p>Hello</p>')
        expect(mockProvider.writeHtml).toHaveBeenCalledWith('<p>Hello</p>', undefined)
      })

      it('should write HTML with fallback text', async () => {
        await writeHtml('<strong>Bold</strong>', 'Bold')
        expect(mockProvider.writeHtml).toHaveBeenCalledWith('<strong>Bold</strong>', 'Bold')
      })

      it('should handle complex HTML', async () => {
        const complexHtml = `
          <div class="container">
            <h1>Title</h1>
            <p>Paragraph with <a href="https://example.com">link</a></p>
            <ul><li>Item 1</li><li>Item 2</li></ul>
          </div>
        `
        await writeHtml(complexHtml)
        expect(mockProvider.writeHtml).toHaveBeenCalledWith(complexHtml, undefined)
      })
    })

    describe('writeImage()', () => {
      it('should write image as base64 string', async () => {
        const base64Image =
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        await writeImage(base64Image)
        expect(mockProvider.writeImage).toHaveBeenCalledWith(base64Image)
      })

      it('should write image as Blob', async () => {
        const blob = new Blob(['fake image data'], { type: 'image/png' })
        await writeImage(blob)
        expect(mockProvider.writeImage).toHaveBeenCalledWith(blob)
      })

      it('should handle JPEG images', async () => {
        const jpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD'
        await writeImage(jpegBase64)
        expect(mockProvider.writeImage).toHaveBeenCalledWith(jpegBase64)
      })
    })
  })

  describe('Read Operations', () => {
    describe('read()', () => {
      it('should read all available content', async () => {
        const expectedContent: ClipboardContent = {
          text: 'Read text',
          html: '<p>Read HTML</p>',
        }
        ;(mockProvider.read as ReturnType<typeof vi.fn>).mockResolvedValue(expectedContent)

        const result = await read()
        expect(result).toEqual(expectedContent)
      })

      it('should pass read options with preferred types', async () => {
        const options: ReadOptions = {
          preferredTypes: ['text/html', 'text/plain'],
        }
        await read(options)
        expect(mockProvider.read).toHaveBeenCalledWith(options)
      })

      it('should handle empty clipboard', async () => {
        ;(mockProvider.read as ReturnType<typeof vi.fn>).mockResolvedValue({})
        const result = await read()
        expect(result).toEqual({})
      })
    })

    describe('readText()', () => {
      it('should read plain text', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('Hello World')
        const result = await readText()
        expect(result).toBe('Hello World')
      })

      it('should return empty string when clipboard is empty', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const result = await readText()
        expect(result).toBe('')
      })
    })

    describe('readHtml()', () => {
      it('should read HTML content', async () => {
        ;(mockProvider.readHtml as ReturnType<typeof vi.fn>).mockResolvedValue('<p>HTML</p>')
        const result = await readHtml()
        expect(result).toBe('<p>HTML</p>')
      })

      it('should return null when no HTML available', async () => {
        ;(mockProvider.readHtml as ReturnType<typeof vi.fn>).mockResolvedValue(null)
        const result = await readHtml()
        expect(result).toBeNull()
      })
    })

    describe('readImage()', () => {
      it('should read image as base64', async () => {
        const base64Image = 'data:image/png;base64,abc123'
        ;(mockProvider.readImage as ReturnType<typeof vi.fn>).mockResolvedValue(base64Image)
        const result = await readImage()
        expect(result).toBe(base64Image)
      })

      it('should return null when no image available', async () => {
        ;(mockProvider.readImage as ReturnType<typeof vi.fn>).mockResolvedValue(null)
        const result = await readImage()
        expect(result).toBeNull()
      })
    })
  })

  describe('Clipboard Management', () => {
    describe('clear()', () => {
      it('should clear clipboard contents', async () => {
        await clear()
        expect(mockProvider.clear).toHaveBeenCalled()
      })
    })

    describe('hasContent()', () => {
      it('should return true when clipboard has content', async () => {
        ;(mockProvider.hasContent as ReturnType<typeof vi.fn>).mockResolvedValue(true)
        const result = await hasContent()
        expect(result).toBe(true)
      })

      it('should return false when clipboard is empty', async () => {
        ;(mockProvider.hasContent as ReturnType<typeof vi.fn>).mockResolvedValue(false)
        const result = await hasContent()
        expect(result).toBe(false)
      })
    })

    describe('getAvailableTypes()', () => {
      it('should return available content types', async () => {
        const types: ClipboardDataType[] = ['text/plain', 'text/html', 'image/png']
        ;(mockProvider.getAvailableTypes as ReturnType<typeof vi.fn>).mockResolvedValue(types)
        const result = await getAvailableTypes()
        expect(result).toEqual(types)
      })

      it('should return empty array when no content', async () => {
        ;(mockProvider.getAvailableTypes as ReturnType<typeof vi.fn>).mockResolvedValue([])
        const result = await getAvailableTypes()
        expect(result).toEqual([])
      })

      it('should handle custom MIME types', async () => {
        const types: ClipboardDataType[] = ['application/json', 'application/xml']
        ;(mockProvider.getAvailableTypes as ReturnType<typeof vi.fn>).mockResolvedValue(types)
        const result = await getAvailableTypes()
        expect(result).toEqual(types)
      })
    })

    describe('getCapabilities()', () => {
      it('should return full capabilities', async () => {
        const capabilities: ClipboardCapabilities = {
          supported: true,
          canRead: true,
          canWrite: true,
          canReadImage: true,
          canWriteImage: true,
          canReadHtml: true,
          availableTypes: ['text/plain', 'text/html'],
        }
        ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue(capabilities)
        const result = await getCapabilities()
        expect(result).toEqual(capabilities)
      })

      it('should return limited capabilities', async () => {
        const capabilities: ClipboardCapabilities = {
          supported: true,
          canRead: true,
          canWrite: true,
          canReadImage: false,
          canWriteImage: false,
          canReadHtml: false,
        }
        ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue(capabilities)
        const result = await getCapabilities()
        expect(result.canReadImage).toBe(false)
        expect(result.canWriteImage).toBe(false)
      })

      it('should handle unsupported clipboard', async () => {
        const capabilities: ClipboardCapabilities = {
          supported: false,
          canRead: false,
          canWrite: false,
          canReadImage: false,
          canWriteImage: false,
          canReadHtml: false,
        }
        ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockResolvedValue(capabilities)
        const result = await getCapabilities()
        expect(result.supported).toBe(false)
      })
    })
  })

  describe('Change Listener', () => {
    describe('onChange()', () => {
      it('should register a change listener', () => {
        const callback = vi.fn()
        const unsubscribe = onChange(callback)
        expect(mockProvider.onChange).toHaveBeenCalledWith(callback)
        expect(typeof unsubscribe).toBe('function')
      })

      it('should return unsubscribe function', () => {
        const mockUnsubscribe = vi.fn()
        ;(mockProvider.onChange as ReturnType<typeof vi.fn>).mockReturnValue(mockUnsubscribe)

        const callback = vi.fn()
        const unsubscribe = onChange(callback)
        unsubscribe()
        expect(mockUnsubscribe).toHaveBeenCalled()
      })

      it('should warn when provider does not support onChange', () => {
        const providerWithoutOnChange = createMockProvider()
        delete (providerWithoutOnChange as Partial<ClipboardProvider>).onChange
        setProvider(providerWithoutOnChange)

        const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const callback = vi.fn()
        const unsubscribe = onChange(callback)

        expect(consoleSpy).toHaveBeenCalledWith(
          '@molecule/app-clipboard: onChange not supported by provider',
        )
        expect(typeof unsubscribe).toBe('function')
        consoleSpy.mockRestore()
      })

      it('should handle change event with content', () => {
        const callback = vi.fn()
        ;(mockProvider.onChange as ReturnType<typeof vi.fn>).mockImplementation((cb) => {
          const event: ClipboardChangeEvent = {
            hasContent: true,
            types: ['text/plain', 'text/html'],
          }
          cb(event)
          return () => {}
        })

        onChange(callback)
        expect(callback).toHaveBeenCalledWith({
          hasContent: true,
          types: ['text/plain', 'text/html'],
        })
      })
    })
  })

  describe('Utility Functions', () => {
    describe('copyTextWithFallback()', () => {
      it('should use provider when available', async () => {
        const result = await copyTextWithFallback('Test text')
        expect(result).toBe(true)
        expect(mockProvider.writeText).toHaveBeenCalledWith('Test text')
      })

      it('should return false when write fails', async () => {
        ;(mockProvider.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Write failed'),
        )
        const result = await copyTextWithFallback('Test text')
        expect(result).toBe(false)
      })

      it('should handle empty text', async () => {
        const result = await copyTextWithFallback('')
        expect(result).toBe(true)
        expect(mockProvider.writeText).toHaveBeenCalledWith('')
      })
    })

    describe('isTextInClipboard()', () => {
      it('should return true when text matches', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('match text')
        const result = await isTextInClipboard('match text')
        expect(result).toBe(true)
      })

      it('should return false when text does not match', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('different text')
        const result = await isTextInClipboard('expected text')
        expect(result).toBe(false)
      })

      it('should return false when clipboard is empty', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('')
        const result = await isTextInClipboard('some text')
        expect(result).toBe(false)
      })

      it('should be case sensitive', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockResolvedValue('Hello')
        const result = await isTextInClipboard('hello')
        expect(result).toBe(false)
      })

      it('should return false when read fails', async () => {
        ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Read failed'),
        )
        const result = await isTextInClipboard('test')
        expect(result).toBe(false)
      })
    })
  })

  describe('Error Handling', () => {
    it('should propagate write errors', async () => {
      const error = new Error('Write failed')
      ;(mockProvider.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(writeText('test')).rejects.toThrow('Write failed')
    })

    it('should propagate read errors', async () => {
      const error = new Error('Read failed')
      ;(mockProvider.readText as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(readText()).rejects.toThrow('Read failed')
    })

    it('should propagate clear errors', async () => {
      const error = new Error('Clear failed')
      ;(mockProvider.clear as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(clear()).rejects.toThrow('Clear failed')
    })

    it('should propagate hasContent errors', async () => {
      const error = new Error('Check failed')
      ;(mockProvider.hasContent as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(hasContent()).rejects.toThrow('Check failed')
    })

    it('should propagate getCapabilities errors', async () => {
      const error = new Error('Capabilities check failed')
      ;(mockProvider.getCapabilities as ReturnType<typeof vi.fn>).mockRejectedValue(error)
      await expect(getCapabilities()).rejects.toThrow('Capabilities check failed')
    })
  })

  describe('Edge Cases', () => {
    it('should handle writing content with all optional fields undefined', async () => {
      const content: ClipboardContent = {}
      await write(content)
      expect(mockProvider.write).toHaveBeenCalledWith(content, undefined)
    })

    it('should handle text with null bytes', async () => {
      const textWithNullBytes = 'Hello\0World'
      await writeText(textWithNullBytes)
      expect(mockProvider.writeText).toHaveBeenCalledWith(textWithNullBytes)
    })

    it('should handle extremely large content', async () => {
      const largeText = 'x'.repeat(10 * 1024 * 1024) // 10MB
      await writeText(largeText)
      expect(mockProvider.writeText).toHaveBeenCalledWith(largeText)
    })

    it('should handle concurrent read and write operations', async () => {
      const writePromise = writeText('write operation')
      const readPromise = readText()

      await Promise.all([writePromise, readPromise])

      expect(mockProvider.writeText).toHaveBeenCalled()
      expect(mockProvider.readText).toHaveBeenCalled()
    })

    it('should handle rapid successive writes', async () => {
      await Promise.all([writeText('first'), writeText('second'), writeText('third')])

      expect(mockProvider.writeText).toHaveBeenCalledTimes(3)
    })

    it('should handle switching providers mid-operation', async () => {
      const firstProvider = createMockProvider({
        readText: vi.fn().mockResolvedValue('first'),
      })
      const secondProvider = createMockProvider({
        readText: vi.fn().mockResolvedValue('second'),
      })

      setProvider(firstProvider)
      const firstResult = await readText()
      expect(firstResult).toBe('first')

      setProvider(secondProvider)
      const secondResult = await readText()
      expect(secondResult).toBe('second')
    })
  })

  describe('Type Safety', () => {
    it('should accept valid ClipboardDataType values', () => {
      const types: ClipboardDataType[] = [
        'text/plain',
        'text/html',
        'image/png',
        'image/jpeg',
        'application/json', // Custom MIME type
      ]
      expect(types.length).toBe(5)
    })

    it('should accept valid WriteOptions', () => {
      const options: WriteOptions = {
        label: 'Test Label',
        showConfirmation: true,
      }
      expect(options.label).toBe('Test Label')
      expect(options.showConfirmation).toBe(true)
    })

    it('should accept valid ReadOptions', () => {
      const options: ReadOptions = {
        preferredTypes: ['text/html', 'text/plain'],
      }
      expect(options.preferredTypes).toHaveLength(2)
    })

    it('should accept valid ClipboardCapabilities', () => {
      const capabilities: ClipboardCapabilities = {
        supported: true,
        canRead: true,
        canWrite: true,
        canReadImage: true,
        canWriteImage: true,
        canReadHtml: true,
        availableTypes: ['text/plain'],
      }
      expect(capabilities.supported).toBe(true)
    })

    it('should accept valid ClipboardChangeEvent', () => {
      const event: ClipboardChangeEvent = {
        hasContent: true,
        types: ['text/plain'],
      }
      expect(event.hasContent).toBe(true)
    })
  })
})
