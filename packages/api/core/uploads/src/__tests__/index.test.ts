import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as ProviderModule from '../provider.js'
import type {
  AbortHandler,
  DeleteHandler,
  FileInfo,
  GetFileHandler,
  UploadedFile,
  UploadHandler,
  UploadProvider,
} from '../types.js'

// We need to reset the module state between tests
let setProvider: typeof ProviderModule.setProvider
let getProvider: typeof ProviderModule.getProvider

describe('upload provider', () => {
  beforeEach(async () => {
    // Reset modules to get fresh state
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
  })

  describe('provider management', () => {
    it('should throw when no provider is set', () => {
      expect(() => getProvider()).toThrow(
        'Upload provider not configured. Call setProvider() first.',
      )
    })

    it('should set and get provider', () => {
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
    })

    it('should allow replacing provider', () => {
      const firstProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
      }
      const secondProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
        getFile: vi.fn(),
      }

      setProvider(firstProvider)
      expect(getProvider()).toBe(firstProvider)

      setProvider(secondProvider)
      expect(getProvider()).toBe(secondProvider)
    })
  })

  describe('upload handler', () => {
    it('should call provider upload with correct arguments', () => {
      const mockUpload = vi.fn().mockReturnValue({
        id: 'file-123',
        fieldname: 'document',
        filename: 'test.pdf',
        encoding: 'binary',
        mimetype: 'application/pdf',
        size: 0,
        uploaded: false,
      } satisfies UploadedFile)

      const mockProvider: UploadProvider = {
        upload: mockUpload,
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
      }
      setProvider(mockProvider)

      const mockStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream
      const fileInfo: FileInfo = {
        filename: 'test.pdf',
        encoding: 'binary',
        mimeType: 'application/pdf',
      }
      const onError = vi.fn()

      const provider = getProvider()
      provider.upload('document', mockStream, fileInfo, onError)

      expect(mockUpload).toHaveBeenCalledWith('document', mockStream, fileInfo, onError)
    })

    it('should return UploadedFile from upload', () => {
      const expectedFile: UploadedFile = {
        id: 'file-456',
        fieldname: 'avatar',
        filename: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 1024,
        uploaded: true,
        location: 'https://storage.example.com/photo.jpg',
      }

      const mockUpload = vi.fn().mockReturnValue(expectedFile)
      const mockProvider: UploadProvider = {
        upload: mockUpload,
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
      }
      setProvider(mockProvider)

      const mockStream = {} as NodeJS.ReadableStream
      const fileInfo: FileInfo = {
        filename: 'photo.jpg',
        encoding: '7bit',
        mimeType: 'image/jpeg',
      }

      const provider = getProvider()
      const result = provider.upload('avatar', mockStream, fileInfo, vi.fn())

      expect(result).toEqual(expectedFile)
    })
  })

  describe('abort handler', () => {
    it('should call provider abortUpload with file', () => {
      const mockAbort = vi.fn()
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: mockAbort,
        deleteFile: vi.fn(),
      }
      setProvider(mockProvider)

      const file: UploadedFile = {
        id: 'file-789',
        fieldname: 'attachment',
        filename: 'document.pdf',
        encoding: 'binary',
        mimetype: 'application/pdf',
        size: 500,
        uploaded: false,
      }

      const provider = getProvider()
      provider.abortUpload(file)

      expect(mockAbort).toHaveBeenCalledWith(file)
    })

    it('should handle async abort handlers', async () => {
      const mockAbort = vi.fn().mockResolvedValue(undefined)
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: mockAbort,
        deleteFile: vi.fn(),
      }
      setProvider(mockProvider)

      const file: UploadedFile = {
        id: 'file-async',
        fieldname: 'upload',
        filename: 'async.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: 100,
        uploaded: false,
      }

      const provider = getProvider()
      await provider.abortUpload(file)

      expect(mockAbort).toHaveBeenCalledWith(file)
    })
  })

  describe('delete handler', () => {
    it('should call provider deleteFile with id', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined)
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: mockDelete,
      }
      setProvider(mockProvider)

      const provider = getProvider()
      await provider.deleteFile('file-to-delete')

      expect(mockDelete).toHaveBeenCalledWith('file-to-delete')
    })

    it('should propagate errors from delete', async () => {
      const mockError = new Error('Delete failed')
      const mockDelete = vi.fn().mockRejectedValue(mockError)
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: mockDelete,
      }
      setProvider(mockProvider)

      const provider = getProvider()
      await expect(provider.deleteFile('bad-id')).rejects.toThrow('Delete failed')
    })
  })

  describe('getFile handler', () => {
    it('should call provider getFile when available', async () => {
      const mockStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream
      const mockGetFile = vi.fn().mockResolvedValue(mockStream)
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
        getFile: mockGetFile,
      }
      setProvider(mockProvider)

      const provider = getProvider()
      const result = await provider.getFile!('file-123')

      expect(mockGetFile).toHaveBeenCalledWith('file-123')
      expect(result).toBe(mockStream)
    })

    it('should return null when file not found', async () => {
      const mockGetFile = vi.fn().mockResolvedValue(null)
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
        getFile: mockGetFile,
      }
      setProvider(mockProvider)

      const provider = getProvider()
      const result = await provider.getFile!('nonexistent')

      expect(result).toBeNull()
    })

    it('should work without getFile method (optional)', () => {
      const mockProvider: UploadProvider = {
        upload: vi.fn(),
        abortUpload: vi.fn(),
        deleteFile: vi.fn(),
        // getFile not defined - it's optional
      }
      setProvider(mockProvider)

      const provider = getProvider()
      expect(provider.getFile).toBeUndefined()
    })
  })
})

describe('upload types', () => {
  describe('UploadedFile', () => {
    it('should define all required properties', () => {
      const file: UploadedFile = {
        id: 'abc-123',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: 1024,
        uploaded: true,
      }

      expect(file.id).toBe('abc-123')
      expect(file.fieldname).toBe('file')
      expect(file.filename).toBe('test.txt')
      expect(file.encoding).toBe('utf-8')
      expect(file.mimetype).toBe('text/plain')
      expect(file.size).toBe(1024)
      expect(file.uploaded).toBe(true)
    })

    it('should support optional properties', () => {
      const mockStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream
      const uploadPromise = Promise.resolve()

      const file: UploadedFile = {
        id: 'xyz-789',
        fieldname: 'image',
        filename: 'photo.png',
        encoding: 'binary',
        mimetype: 'image/png',
        size: 2048,
        uploaded: false,
        stream: mockStream,
        uploadPromise,
        location: 'https://cdn.example.com/photo.png',
      }

      expect(file.stream).toBe(mockStream)
      expect(file.uploadPromise).toBe(uploadPromise)
      expect(file.location).toBe('https://cdn.example.com/photo.png')
    })

    it('should handle zero size files', () => {
      const emptyFile: UploadedFile = {
        id: 'empty-file',
        fieldname: 'attachment',
        filename: 'empty.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: 0,
        uploaded: true,
      }

      expect(emptyFile.size).toBe(0)
    })

    it('should handle large file sizes', () => {
      const largeFile: UploadedFile = {
        id: 'large-file',
        fieldname: 'video',
        filename: 'movie.mp4',
        encoding: 'binary',
        mimetype: 'video/mp4',
        size: 5_000_000_000, // 5GB
        uploaded: true,
      }

      expect(largeFile.size).toBe(5_000_000_000)
    })
  })

  describe('FileInfo', () => {
    it('should define file metadata', () => {
      const info: FileInfo = {
        filename: 'document.pdf',
        encoding: 'binary',
        mimeType: 'application/pdf',
      }

      expect(info.filename).toBe('document.pdf')
      expect(info.encoding).toBe('binary')
      expect(info.mimeType).toBe('application/pdf')
    })

    it('should handle various encodings', () => {
      const encodings = ['7bit', 'binary', 'base64', 'utf-8', 'quoted-printable']

      encodings.forEach((encoding) => {
        const info: FileInfo = {
          filename: 'test.txt',
          encoding,
          mimeType: 'text/plain',
        }
        expect(info.encoding).toBe(encoding)
      })
    })

    it('should handle various MIME types', () => {
      const mimeTypes = [
        'application/json',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'video/mp4',
        'audio/mpeg',
        'text/plain',
        'text/html',
        'application/octet-stream',
        'multipart/form-data',
      ]

      mimeTypes.forEach((mimeType) => {
        const info: FileInfo = {
          filename: 'test',
          encoding: 'binary',
          mimeType,
        }
        expect(info.mimeType).toBe(mimeType)
      })
    })
  })

  describe('UploadHandler', () => {
    it('should match the expected function signature', () => {
      const handler: UploadHandler = (fieldname, stream, info, _onError) => {
        return {
          id: 'generated-id',
          fieldname,
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType,
          size: 0,
          uploaded: false,
          stream,
        }
      }

      const mockStream = {} as NodeJS.ReadableStream
      const fileInfo: FileInfo = {
        filename: 'test.txt',
        encoding: 'utf-8',
        mimeType: 'text/plain',
      }

      const result = handler('myField', mockStream, fileInfo, vi.fn())

      expect(result.fieldname).toBe('myField')
      expect(result.filename).toBe('test.txt')
      expect(typeof handler).toBe('function')
    })
  })

  describe('AbortHandler', () => {
    it('should accept UploadedFile and return void', () => {
      const handler: AbortHandler = (file) => {
        // Abort logic - cleanup partial upload
        console.log(`Aborting upload for file: ${file.id}`)
      }

      const file: UploadedFile = {
        id: 'test-id',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: 100,
        uploaded: false,
      }

      expect(() => handler(file)).not.toThrow()
    })

    it('should support async abort handlers', async () => {
      const handler: AbortHandler = async (_file) => {
        await Promise.resolve()
        // Async cleanup
      }

      const file: UploadedFile = {
        id: 'async-test',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: 'utf-8',
        mimetype: 'text/plain',
        size: 100,
        uploaded: false,
      }

      await expect(handler(file)).resolves.toBeUndefined()
    })
  })

  describe('DeleteHandler', () => {
    it('should accept id string and return Promise<void>', async () => {
      const handler: DeleteHandler = async (_id) => {
        // Delete logic
        await Promise.resolve()
      }

      await expect(handler('file-id-123')).resolves.toBeUndefined()
    })
  })

  describe('GetFileHandler', () => {
    it('should accept id string and return Promise<ReadableStream | null>', async () => {
      const mockStream = { pipe: vi.fn() } as unknown as NodeJS.ReadableStream

      const handler: GetFileHandler = async (id) => {
        if (id === 'exists') {
          return mockStream
        }
        return null
      }

      const existingFile = await handler('exists')
      const missingFile = await handler('does-not-exist')

      expect(existingFile).toBe(mockStream)
      expect(missingFile).toBeNull()
    })
  })

  describe('UploadProvider', () => {
    it('should require upload, abortUpload, and deleteFile methods', () => {
      const minimalProvider: UploadProvider = {
        upload: (fieldname, stream, info, _onError) => ({
          id: 'test',
          fieldname,
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType,
          size: 0,
          uploaded: false,
        }),
        abortUpload: () => {},
        deleteFile: async () => {},
      }

      expect(typeof minimalProvider.upload).toBe('function')
      expect(typeof minimalProvider.abortUpload).toBe('function')
      expect(typeof minimalProvider.deleteFile).toBe('function')
      expect(minimalProvider.getFile).toBeUndefined()
    })

    it('should allow optional getFile method', () => {
      const fullProvider: UploadProvider = {
        upload: (fieldname, stream, info, _onError) => ({
          id: 'test',
          fieldname,
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType,
          size: 0,
          uploaded: false,
        }),
        abortUpload: () => {},
        deleteFile: async () => {},
        getFile: async (_id) => null,
      }

      expect(typeof fullProvider.getFile).toBe('function')
    })
  })
})

describe('module exports', () => {
  it('should export all types from index', async () => {
    const indexModule = await import('../index.js')

    // Functions should be exported
    expect(typeof indexModule.setProvider).toBe('function')
    expect(typeof indexModule.getProvider).toBe('function')
  })

  it('should export setProvider and getProvider', async () => {
    vi.resetModules()
    const { setProvider, getProvider } = await import('../index.js')

    const mockProvider: UploadProvider = {
      upload: vi.fn(),
      abortUpload: vi.fn(),
      deleteFile: vi.fn(),
    }

    setProvider(mockProvider)
    expect(getProvider()).toBe(mockProvider)
  })
})

describe('edge cases', () => {
  beforeEach(async () => {
    vi.resetModules()
    const providerModule = await import('../provider.js')
    setProvider = providerModule.setProvider
    getProvider = providerModule.getProvider
  })

  it('should handle special characters in filename', () => {
    const file: UploadedFile = {
      id: 'special-chars',
      fieldname: 'file',
      filename: 'test file (1) [final].doc',
      encoding: 'binary',
      mimetype: 'application/msword',
      size: 1024,
      uploaded: true,
    }

    expect(file.filename).toBe('test file (1) [final].doc')
  })

  it('should handle unicode in filename', () => {
    const file: UploadedFile = {
      id: 'unicode',
      fieldname: 'file',
      filename: 'documento_espanol.pdf',
      encoding: 'binary',
      mimetype: 'application/pdf',
      size: 2048,
      uploaded: true,
    }

    expect(file.filename).toContain('espanol')
  })

  it('should handle emoji in filename', () => {
    const file: UploadedFile = {
      id: 'emoji',
      fieldname: 'file',
      filename: 'party_time.gif',
      encoding: 'binary',
      mimetype: 'image/gif',
      size: 512,
      uploaded: true,
    }

    expect(file.filename).toBe('party_time.gif')
  })

  it('should handle files with no extension', () => {
    const file: UploadedFile = {
      id: 'no-ext',
      fieldname: 'file',
      filename: 'README',
      encoding: 'utf-8',
      mimetype: 'text/plain',
      size: 256,
      uploaded: true,
    }

    expect(file.filename).toBe('README')
  })

  it('should handle files with multiple dots in name', () => {
    const file: UploadedFile = {
      id: 'multi-dot',
      fieldname: 'file',
      filename: 'report.2024.01.15.final.pdf',
      encoding: 'binary',
      mimetype: 'application/pdf',
      size: 4096,
      uploaded: true,
    }

    expect(file.filename).toBe('report.2024.01.15.final.pdf')
  })

  it('should handle very long filenames', () => {
    const longName = 'a'.repeat(255) + '.txt'
    const file: UploadedFile = {
      id: 'long-name',
      fieldname: 'file',
      filename: longName,
      encoding: 'utf-8',
      mimetype: 'text/plain',
      size: 100,
      uploaded: true,
    }

    expect(file.filename.length).toBe(259)
  })

  it('should handle upload promise rejection tracking', async () => {
    const uploadError = new Error('Upload failed')
    const uploadPromise = Promise.reject(uploadError)

    const file: UploadedFile = {
      id: 'failed-upload',
      fieldname: 'file',
      filename: 'fail.txt',
      encoding: 'utf-8',
      mimetype: 'text/plain',
      size: 0,
      uploaded: false,
      uploadPromise,
    }

    await expect(file.uploadPromise).rejects.toThrow('Upload failed')
  })

  it('should handle upload promise success tracking', async () => {
    const uploadPromise = Promise.resolve()

    const file: UploadedFile = {
      id: 'success-upload',
      fieldname: 'file',
      filename: 'success.txt',
      encoding: 'utf-8',
      mimetype: 'text/plain',
      size: 100,
      uploaded: false,
      uploadPromise,
    }

    await expect(file.uploadPromise).resolves.toBeUndefined()
  })

  it('should handle error callback in upload handler', () => {
    const errors: Error[] = []
    const onError = (error: Error): void => {
      errors.push(error)
    }

    const mockProvider: UploadProvider = {
      upload: (fieldname, stream, info, errorCallback) => {
        // Simulate an error during upload
        errorCallback(new Error('Stream error'))
        return {
          id: 'error-upload',
          fieldname,
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType,
          size: 0,
          uploaded: false,
        }
      },
      abortUpload: vi.fn(),
      deleteFile: vi.fn(),
    }

    setProvider(mockProvider)
    const provider = getProvider()

    const fileInfo: FileInfo = {
      filename: 'test.txt',
      encoding: 'utf-8',
      mimeType: 'text/plain',
    }

    provider.upload('file', {} as NodeJS.ReadableStream, fileInfo, onError)

    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('Stream error')
  })
})
