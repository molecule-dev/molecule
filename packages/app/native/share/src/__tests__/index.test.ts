import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  canShare,
  canShareContent,
  getCapabilities,
  getMimeType,
  getProvider,
  hasProvider,
  setProvider,
  share,
  shareFiles,
  shareText,
  shareUrl,
  socialUrls,
} from '../index.js'
import type {
  ShareCapabilities,
  ShareFile,
  ShareOptions,
  ShareProvider,
  ShareResult,
} from '../types.js'

describe('share', () => {
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

  describe('provider management', () => {
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
    })

    describe('hasProvider', () => {
      it('should return true when provider is set', () => {
        setProvider(mockProvider)
        expect(hasProvider()).toBe(true)
      })
    })
  })

  describe('share functions', () => {
    describe('share', () => {
      it('should delegate to provider with all options', async () => {
        setProvider(mockProvider)
        const options: ShareOptions = {
          text: 'Hello',
          title: 'Test',
          url: 'https://example.com',
          dialogTitle: 'Share via',
        }
        const result = await share(options)
        expect(result.completed).toBe(true)
        expect(mockProvider.share).toHaveBeenCalledWith(options)
      })

      it('should handle share with files', async () => {
        setProvider(mockProvider)
        const files: ShareFile[] = [
          { path: '/path/to/file.png', mimeType: 'image/png', name: 'file.png' },
        ]
        const options: ShareOptions = { files, text: 'Check this out' }
        await share(options)
        expect(mockProvider.share).toHaveBeenCalledWith(options)
      })

      it('should return share result with activityType', async () => {
        const resultWithActivity: ShareResult = {
          completed: true,
          activityType: 'com.apple.UIKit.activity.CopyToPasteboard',
        }
        mockProvider.share = vi.fn().mockResolvedValue(resultWithActivity)
        setProvider(mockProvider)

        const result = await share({ text: 'Hello' })
        expect(result.activityType).toBe('com.apple.UIKit.activity.CopyToPasteboard')
      })

      it('should return share result with error', async () => {
        const resultWithError: ShareResult = {
          completed: false,
          error: 'User cancelled',
        }
        mockProvider.share = vi.fn().mockResolvedValue(resultWithError)
        setProvider(mockProvider)

        const result = await share({ text: 'Hello' })
        expect(result.completed).toBe(false)
        expect(result.error).toBe('User cancelled')
      })
    })

    describe('shareText', () => {
      it('should delegate to provider with text only', async () => {
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

      it('should handle empty text', async () => {
        setProvider(mockProvider)
        await shareText('')
        expect(mockProvider.shareText).toHaveBeenCalledWith('', undefined)
      })

      it('should handle long text', async () => {
        setProvider(mockProvider)
        const longText = 'a'.repeat(10000)
        await shareText(longText)
        expect(mockProvider.shareText).toHaveBeenCalledWith(longText, undefined)
      })
    })

    describe('shareUrl', () => {
      it('should delegate to provider with URL only', async () => {
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

      it('should handle complex URLs', async () => {
        setProvider(mockProvider)
        const complexUrl = 'https://example.com/path?query=value&other=123#section'
        await shareUrl(complexUrl)
        expect(mockProvider.shareUrl).toHaveBeenCalledWith(complexUrl, undefined)
      })
    })

    describe('shareFiles', () => {
      it('should delegate to provider with single file', async () => {
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

      it('should handle multiple files', async () => {
        setProvider(mockProvider)
        const files: ShareFile[] = [
          { path: '/path/to/file1.png', mimeType: 'image/png', name: 'Photo 1' },
          { path: '/path/to/file2.jpg', mimeType: 'image/jpeg', name: 'Photo 2' },
          { path: '/path/to/file3.pdf', mimeType: 'application/pdf', name: 'Document' },
        ]
        await shareFiles(files)
        expect(mockProvider.shareFiles).toHaveBeenCalledWith(files, undefined)
      })

      it('should handle files with all properties', async () => {
        setProvider(mockProvider)
        const files: ShareFile[] = [
          {
            path: '/path/to/file.png',
            mimeType: 'image/png',
            name: 'My Custom Name',
          },
        ]
        const options = {
          title: 'Share Title',
          text: 'Share Text',
          dialogTitle: 'Choose App',
        }
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

      it('should delegate to provider', async () => {
        mockProvider.canShare = vi.fn().mockResolvedValue(false)
        setProvider(mockProvider)
        const result = await canShare()
        expect(result).toBe(false)
        expect(mockProvider.canShare).toHaveBeenCalled()
      })
    })

    describe('canShareContent', () => {
      it('should delegate to provider with options', async () => {
        setProvider(mockProvider)
        const options: ShareOptions = { text: 'Test' }
        const result = await canShareContent(options)
        expect(result).toBe(true)
        expect(mockProvider.canShareContent).toHaveBeenCalledWith(options)
      })

      it('should check if specific content can be shared', async () => {
        mockProvider.canShareContent = vi.fn().mockImplementation((options) => {
          // Simulate not being able to share files
          return Promise.resolve(!options.files || options.files.length === 0)
        })
        setProvider(mockProvider)

        const textResult = await canShareContent({ text: 'Hello' })
        expect(textResult).toBe(true)

        const fileResult = await canShareContent({
          files: [{ path: '/path/to/file.png' }],
        })
        expect(fileResult).toBe(false)
      })
    })

    describe('getCapabilities', () => {
      it('should delegate to provider', async () => {
        setProvider(mockProvider)
        const result = await getCapabilities()
        expect(result.supported).toBe(true)
        expect(result.fileSharing).toBe(true)
        expect(result.multipleFiles).toBe(true)
        expect(mockProvider.getCapabilities).toHaveBeenCalled()
      })

      it('should return all capability properties', async () => {
        const fullCapabilities: ShareCapabilities = {
          supported: true,
          fileSharing: true,
          multipleFiles: true,
          supportedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
        }
        mockProvider.getCapabilities = vi.fn().mockResolvedValue(fullCapabilities)
        setProvider(mockProvider)

        const result = await getCapabilities()
        expect(result.supportedMimeTypes).toEqual(['image/png', 'image/jpeg', 'application/pdf'])
      })

      it('should handle limited capabilities', async () => {
        const limitedCapabilities: ShareCapabilities = {
          supported: true,
          fileSharing: false,
          multipleFiles: false,
        }
        mockProvider.getCapabilities = vi.fn().mockResolvedValue(limitedCapabilities)
        setProvider(mockProvider)

        const result = await getCapabilities()
        expect(result.fileSharing).toBe(false)
        expect(result.multipleFiles).toBe(false)
      })
    })
  })

  describe('socialUrls', () => {
    describe('twitter', () => {
      it('should create Twitter share URL with text only', () => {
        const url = socialUrls.twitter('Hello world')
        expect(url).toContain('https://twitter.com/intent/tweet')
        expect(url).toContain('text=Hello+world')
      })

      it('should create Twitter share URL with text and URL', () => {
        const url = socialUrls.twitter('Check this out', 'https://example.com')
        expect(url).toContain('https://twitter.com/intent/tweet')
        expect(url).toContain('text=Check+this+out')
        expect(url).toContain('url=https')
      })

      it('should handle special characters', () => {
        const url = socialUrls.twitter('Hello & goodbye!')
        expect(url).toContain('text=Hello')
        expect(url).toContain('%26') // & encoded
      })
    })

    describe('facebook', () => {
      it('should create Facebook share URL', () => {
        const url = socialUrls.facebook('https://example.com')
        expect(url).toContain('https://www.facebook.com/sharer/sharer.php')
        expect(url).toContain('u=https')
      })

      it('should handle URLs with query parameters', () => {
        const url = socialUrls.facebook('https://example.com?param=value')
        expect(url).toContain('u=https')
      })
    })

    describe('linkedin', () => {
      it('should create LinkedIn share URL', () => {
        const url = socialUrls.linkedin('https://example.com')
        expect(url).toContain('https://www.linkedin.com/sharing/share-offsite')
        expect(url).toContain('url=https')
      })
    })

    describe('whatsapp', () => {
      it('should create WhatsApp share URL', () => {
        const url = socialUrls.whatsapp('Hello world')
        expect(url).toContain('https://wa.me/')
        expect(url).toContain('text=Hello+world')
      })

      it('should handle text with URL', () => {
        const url = socialUrls.whatsapp('Check this: https://example.com')
        expect(url).toContain('text=Check')
      })
    })

    describe('telegram', () => {
      it('should create Telegram share URL with URL only', () => {
        const url = socialUrls.telegram('https://example.com')
        expect(url).toContain('https://t.me/share/url')
        expect(url).toContain('url=https')
      })

      it('should create Telegram share URL with URL and text', () => {
        const url = socialUrls.telegram('https://example.com', 'Check this out')
        expect(url).toContain('url=https')
        expect(url).toContain('text=Check')
      })
    })

    describe('email', () => {
      it('should create email share URL', () => {
        const url = socialUrls.email('Test Subject', 'Test Body')
        expect(url).toContain('mailto:')
        expect(url).toContain('subject=Test+Subject')
        expect(url).toContain('body=Test+Body')
      })

      it('should handle special characters in subject and body', () => {
        const url = socialUrls.email('Hello & Welcome!', 'Line 1\nLine 2')
        expect(url).toContain('mailto:')
      })
    })
  })

  describe('getMimeType', () => {
    describe('image types', () => {
      it('should return correct MIME type for jpg', () => {
        expect(getMimeType('photo.jpg')).toBe('image/jpeg')
      })

      it('should return correct MIME type for jpeg', () => {
        expect(getMimeType('photo.jpeg')).toBe('image/jpeg')
      })

      it('should return correct MIME type for png', () => {
        expect(getMimeType('image.png')).toBe('image/png')
      })

      it('should return correct MIME type for gif', () => {
        expect(getMimeType('animation.gif')).toBe('image/gif')
      })

      it('should return correct MIME type for webp', () => {
        expect(getMimeType('image.webp')).toBe('image/webp')
      })

      it('should return correct MIME type for svg', () => {
        expect(getMimeType('icon.svg')).toBe('image/svg+xml')
      })
    })

    describe('document types', () => {
      it('should return correct MIME type for pdf', () => {
        expect(getMimeType('document.pdf')).toBe('application/pdf')
      })

      it('should return correct MIME type for doc', () => {
        expect(getMimeType('document.doc')).toBe('application/msword')
      })

      it('should return correct MIME type for docx', () => {
        expect(getMimeType('document.docx')).toBe(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
      })

      it('should return correct MIME type for xls', () => {
        expect(getMimeType('spreadsheet.xls')).toBe('application/vnd.ms-excel')
      })

      it('should return correct MIME type for xlsx', () => {
        expect(getMimeType('spreadsheet.xlsx')).toBe(
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
      })
    })

    describe('text types', () => {
      it('should return correct MIME type for txt', () => {
        expect(getMimeType('notes.txt')).toBe('text/plain')
      })

      it('should return correct MIME type for csv', () => {
        expect(getMimeType('data.csv')).toBe('text/csv')
      })

      it('should return correct MIME type for json', () => {
        expect(getMimeType('config.json')).toBe('application/json')
      })

      it('should return correct MIME type for xml', () => {
        expect(getMimeType('data.xml')).toBe('application/xml')
      })
    })

    describe('media types', () => {
      it('should return correct MIME type for mp3', () => {
        expect(getMimeType('audio.mp3')).toBe('audio/mpeg')
      })

      it('should return correct MIME type for mp4', () => {
        expect(getMimeType('video.mp4')).toBe('video/mp4')
      })

      it('should return correct MIME type for mov', () => {
        expect(getMimeType('video.mov')).toBe('video/quicktime')
      })
    })

    describe('archive types', () => {
      it('should return correct MIME type for zip', () => {
        expect(getMimeType('archive.zip')).toBe('application/zip')
      })
    })

    describe('edge cases', () => {
      it('should return application/octet-stream for unknown extension', () => {
        expect(getMimeType('file.unknown')).toBe('application/octet-stream')
      })

      it('should return application/octet-stream for no extension', () => {
        expect(getMimeType('filename')).toBe('application/octet-stream')
      })

      it('should handle uppercase extensions', () => {
        expect(getMimeType('photo.JPG')).toBe('image/jpeg')
      })

      it('should handle mixed case extensions', () => {
        expect(getMimeType('photo.JpG')).toBe('image/jpeg')
      })

      it('should handle paths with directories', () => {
        expect(getMimeType('/path/to/file.png')).toBe('image/png')
      })

      it('should handle files with multiple dots', () => {
        expect(getMimeType('file.name.with.dots.jpg')).toBe('image/jpeg')
      })

      it('should handle empty string', () => {
        expect(getMimeType('')).toBe('application/octet-stream')
      })
    })
  })
})
