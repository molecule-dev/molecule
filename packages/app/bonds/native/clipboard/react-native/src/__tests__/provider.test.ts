/**
 * Tests for React Native clipboard provider.
 *
 * @module
 */

vi.mock('@molecule/app-i18n', () => ({
  t: vi.fn(
    (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  ),
}))

vi.mock('@molecule/app-logger', () => ({
  getLogger: vi.fn(() => ({
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

const { mockGetString, mockSetString, mockHasString, mockGetImage, mockSetImage, mockHasImage } =
  vi.hoisted(() => ({
    mockGetString: vi.fn<() => Promise<string>>().mockResolvedValue(''),
    mockSetString: vi.fn(),
    mockHasString: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
    mockGetImage: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
    mockSetImage: vi.fn(),
    mockHasImage: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
  }))

vi.mock('@react-native-clipboard/clipboard', () => ({
  default: {
    getString: mockGetString,
    setString: mockSetString,
    hasString: mockHasString,
    getImage: mockGetImage,
    setImage: mockSetImage,
    hasImage: mockHasImage,
  },
}))

vi.mock('@molecule/app-clipboard', () => ({}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createReactNativeClipboardProvider, provider } from '../provider.js'

describe('@molecule/app-clipboard-react-native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('provider export', () => {
    it('should export a provider object with all required methods', () => {
      expect(provider).toBeDefined()
      expect(provider.write).toBeTypeOf('function')
      expect(provider.writeText).toBeTypeOf('function')
      expect(provider.writeHtml).toBeTypeOf('function')
      expect(provider.writeImage).toBeTypeOf('function')
      expect(provider.read).toBeTypeOf('function')
      expect(provider.readText).toBeTypeOf('function')
      expect(provider.readHtml).toBeTypeOf('function')
      expect(provider.readImage).toBeTypeOf('function')
      expect(provider.clear).toBeTypeOf('function')
      expect(provider.hasContent).toBeTypeOf('function')
      expect(provider.getAvailableTypes).toBeTypeOf('function')
      expect(provider.getCapabilities).toBeTypeOf('function')
      expect(provider.onChange).toBeTypeOf('function')
    })
  })

  describe('createReactNativeClipboardProvider', () => {
    let p: ReturnType<typeof createReactNativeClipboardProvider>

    beforeEach(() => {
      p = createReactNativeClipboardProvider()
    })

    describe('write', () => {
      it('should write text content', async () => {
        await p.write({ text: 'hello' })
        expect(mockSetString).toHaveBeenCalledWith('hello')
      })

      it('should write html as plain text fallback', async () => {
        await p.write({ html: '<b>bold</b>' })
        expect(mockSetString).toHaveBeenCalledWith('<b>bold</b>')
      })

      it('should write image content when setImage is available', async () => {
        await p.write({ image: 'base64data' })
        expect(mockSetImage).toHaveBeenCalledWith('base64data')
      })
    })

    describe('writeText', () => {
      it('should set string on clipboard', async () => {
        await p.writeText('test text')
        expect(mockSetString).toHaveBeenCalledWith('test text')
      })
    })

    describe('writeHtml', () => {
      it('should write HTML as plain text', async () => {
        await p.writeHtml('<p>paragraph</p>')
        expect(mockSetString).toHaveBeenCalledWith('<p>paragraph</p>')
      })
    })

    describe('writeImage', () => {
      it('should call setImage with string image data', async () => {
        await p.writeImage('base64imagedata')
        expect(mockSetImage).toHaveBeenCalledWith('base64imagedata')
      })
    })

    describe('read', () => {
      it('should return text content from clipboard', async () => {
        mockGetString.mockResolvedValue('clipboard text')
        const result = await p.read()
        expect(result).toEqual({ text: 'clipboard text' })
      })
    })

    describe('readText', () => {
      it('should return string from clipboard', async () => {
        mockGetString.mockResolvedValue('some text')
        const result = await p.readText()
        expect(result).toBe('some text')
      })
    })

    describe('readHtml', () => {
      it('should return null (not supported)', async () => {
        const result = await p.readHtml()
        expect(result).toBeNull()
      })
    })

    describe('readImage', () => {
      it('should return image data when getImage is available', async () => {
        mockGetImage.mockResolvedValue('image-data')
        const result = await p.readImage()
        expect(result).toBe('image-data')
      })
    })

    describe('clear', () => {
      it('should set empty string on clipboard', async () => {
        await p.clear()
        expect(mockSetString).toHaveBeenCalledWith('')
      })
    })

    describe('hasContent', () => {
      it('should return true when clipboard has string', async () => {
        mockHasString.mockResolvedValue(true)
        const result = await p.hasContent()
        expect(result).toBe(true)
      })

      it('should return false when clipboard is empty', async () => {
        mockHasString.mockResolvedValue(false)
        const result = await p.hasContent()
        expect(result).toBe(false)
      })
    })

    describe('getAvailableTypes', () => {
      it('should include text/plain when text is present', async () => {
        mockHasString.mockResolvedValue(true)
        mockHasImage.mockResolvedValue(false)
        const types = await p.getAvailableTypes()
        expect(types).toContain('text/plain')
      })

      it('should include image/png when image is present', async () => {
        mockHasString.mockResolvedValue(false)
        mockHasImage.mockResolvedValue(true)
        const types = await p.getAvailableTypes()
        expect(types).toContain('image/png')
      })

      it('should return empty array when nothing is present', async () => {
        mockHasString.mockResolvedValue(false)
        mockHasImage.mockResolvedValue(false)
        const types = await p.getAvailableTypes()
        expect(types).toEqual([])
      })
    })

    describe('getCapabilities', () => {
      it('should report supported capabilities', async () => {
        const caps = await p.getCapabilities()
        expect(caps.supported).toBe(true)
        expect(caps.canRead).toBe(true)
        expect(caps.canWrite).toBe(true)
        expect(caps.canReadImage).toBe(true)
        expect(caps.canWriteImage).toBe(true)
        expect(caps.canReadHtml).toBe(false)
      })
    })

    describe('onChange', () => {
      it('should return a cleanup function when polling is disabled', () => {
        const cleanup = p.onChange(vi.fn())
        expect(cleanup).toBeTypeOf('function')
        cleanup()
      })

      it('should poll for changes when configured', () => {
        vi.useFakeTimers()
        const pollingProvider = createReactNativeClipboardProvider({
          pollForChanges: true,
          pollInterval: 500,
        })
        const callback = vi.fn()
        const cleanup = pollingProvider.onChange(callback)

        expect(cleanup).toBeTypeOf('function')
        cleanup()
        vi.useRealTimers()
      })

      it('should notify callback when content changes during polling', async () => {
        vi.useFakeTimers()
        const pollingProvider = createReactNativeClipboardProvider({
          pollForChanges: true,
          pollInterval: 100,
        })
        const callback = vi.fn()

        mockGetString.mockResolvedValue('new text')
        const cleanup = pollingProvider.onChange(callback)

        await vi.advanceTimersByTimeAsync(150)
        expect(callback).toHaveBeenCalledWith({
          hasContent: true,
          types: ['text/plain'],
        })

        cleanup()
        vi.useRealTimers()
      })
    })
  })
})
