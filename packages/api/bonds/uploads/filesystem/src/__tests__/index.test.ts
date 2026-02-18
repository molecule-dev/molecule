/**
 * Tests for the filesystem upload provider.
 *
 * @module
 */

import { PassThrough } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fs module
const mockExistsSync = vi.fn()
const mockMkdirSync = vi.fn()
const mockUnlink = vi.fn()
const mockCreateWriteStream = vi.fn()
const mockCreateReadStream = vi.fn()

vi.mock('fs', () => ({
  default: {
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
    createWriteStream: (...args: unknown[]) => mockCreateWriteStream(...args),
    createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
  },
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  unlink: (...args: unknown[]) => mockUnlink(...args),
  createWriteStream: (...args: unknown[]) => mockCreateWriteStream(...args),
  createReadStream: (...args: unknown[]) => mockCreateReadStream(...args),
}))

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}))

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

describe('Filesystem Provider', () => {
  let mockWriteStream: PassThrough

  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('FILE_UPLOAD_PATH', 'test-uploads')
    mockExistsSync.mockReturnValue(true)

    // Create a mock write stream that supports pipe
    mockWriteStream = new PassThrough()
    vi.spyOn(mockWriteStream, 'end')
    vi.spyOn(mockWriteStream, 'destroy')
    mockCreateWriteStream.mockReturnValue(mockWriteStream)

    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  describe('uploadPath', () => {
    it('should use FILE_UPLOAD_PATH environment variable', async () => {
      mockExistsSync.mockReturnValue(true)
      const { uploadPath } = await import('../provider.js')

      expect(uploadPath).toContain('test-uploads')
    })

    it('should default to "uploads" when FILE_UPLOAD_PATH is not set', async () => {
      vi.stubEnv('FILE_UPLOAD_PATH', '')
      vi.resetModules()
      mockExistsSync.mockReturnValue(true)

      const { uploadPath } = await import('../provider.js')

      expect(uploadPath).toContain('uploads')
    })

    it('should create upload directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false)
      vi.resetModules()

      await import('../provider.js')

      expect(mockMkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true })
    })

    it('should not create upload directory if it exists', async () => {
      mockExistsSync.mockReturnValue(true)
      vi.resetModules()

      await import('../provider.js')

      expect(mockMkdirSync).not.toHaveBeenCalled()
    })

    it('should warn when FILE_UPLOAD_PATH is missing', async () => {
      vi.stubEnv('FILE_UPLOAD_PATH', '')
      vi.resetModules()
      mockExistsSync.mockReturnValue(true)
      const { bond: bondFn } = await import('@molecule/api-bond')
      bondFn('logger', mockLogger)

      await import('../provider.js')

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('FILE_UPLOAD_PATH'))
    })
  })

  describe('upload', () => {
    it('should upload a file stream to the filesystem', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        onError,
      )

      expect(file.id).toBe('test-uuid-1234')
      expect(file.fieldname).toBe('file')
      expect(file.filename).toBe('test.txt')
      expect(file.encoding).toBe('7bit')
      expect(file.mimetype).toBe('text/plain')
      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeDefined()
      expect(file.upload).toBeDefined()
    })

    it('should truncate long filenames to 1023 characters', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const longFilename = 'a'.repeat(2000)

      const file = upload(
        'file',
        stream,
        {
          filename: longFilename,
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.filename.length).toBe(1023)
    })

    it('should truncate long encodings to 1023 characters', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const longEncoding = 'b'.repeat(2000)

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: longEncoding,
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.encoding.length).toBe(1023)
    })

    it('should truncate long mimetypes to 255 characters', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const longMimetype = 'c'.repeat(500)

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: longMimetype,
        },
        vi.fn(),
      )

      expect(file.mimetype.length).toBe(255)
    })

    it('should track file size from stream data events', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.size).toBe(0)

      stream.emit('data', Buffer.from('hello'))
      expect(file.size).toBe(5)

      stream.emit('data', Buffer.from(' world'))
      expect(file.size).toBe(11)
    })

    it('should clean up stream reference on end', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.stream).toBeDefined()

      stream.emit('end')

      expect(file.stream).toBeUndefined()
    })

    it('should call onError when stream limit is reached', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        onError,
      )

      stream.emit('limit')

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Stream limit reached.',
        }),
      )
    })

    it('should mark file as uploaded on write stream finish', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.uploaded).toBe(false)

      // Emit finish on the write stream
      mockWriteStream.emit('finish')

      await file.uploadPromise

      expect(file.uploaded).toBe(true)
      expect(file.upload).toBeUndefined()
      expect(file.uploadPromise).toBeUndefined()
    })

    it('should call onError when write stream errors', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        onError,
      )

      // Save reference to promise before error (provider deletes it in error handler)
      const uploadPromise = file.uploadPromise

      const writeError = new Error('Write failed')
      mockWriteStream.emit('error', writeError)

      await expect(uploadPromise).rejects.toThrow('Write failed')
      expect(onError).toHaveBeenCalledWith(writeError)
      expect(file.upload).toBeUndefined()
      expect(file.uploadPromise).toBeUndefined()
    })

    it('should create write stream with correct path', async () => {
      mockExistsSync.mockReturnValue(true)
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(mockCreateWriteStream).toHaveBeenCalledWith(expect.stringContaining('test-uuid-1234'))
    })
  })

  describe('abortUpload', () => {
    it('should abort an in-progress upload', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(null))
      const { upload, abortUpload } = await import('../provider.js')

      const stream = new PassThrough()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      abortUpload(file)

      expect(mockWriteStream.end).toHaveBeenCalled()
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('test-uuid-1234'),
        expect.any(Function),
      )
      expect(file.upload).toBeUndefined()
      expect(file.uploadPromise).toBeUndefined()
    })

    it('should remove stream listeners when aborting', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(null))
      const { upload, abortUpload } = await import('../provider.js')

      const stream = new PassThrough()
      const removeAllListenersSpy = vi.spyOn(stream, 'removeAllListeners')

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      abortUpload(file)

      expect(removeAllListenersSpy).toHaveBeenCalledWith('data')
      expect(removeAllListenersSpy).toHaveBeenCalledWith('limit')
      expect(removeAllListenersSpy).toHaveBeenCalledWith('end')
      expect(file.stream).toBeUndefined()
    })

    it('should log error when file deletion fails', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(new Error('Delete failed')))
      const { upload, abortUpload } = await import('../provider.js')

      const stream = new PassThrough()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      abortUpload(file)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('test-uuid-1234'),
        expect.any(Error),
      )
    })

    it('should handle file without stream', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(null))
      const { abortUpload } = await import('../provider.js')

      const file = {
        id: 'test-id',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 0,
        uploaded: true,
      }

      // Should not throw
      expect(() => abortUpload(file as never)).not.toThrow()
      expect(mockUnlink).toHaveBeenCalled()
    })

    it('should handle file without upload object and not uploaded', async () => {
      mockExistsSync.mockReturnValue(true)
      const { abortUpload } = await import('../provider.js')

      const file = {
        id: 'test-id',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 0,
        uploaded: false,
        // Note: no upload property
      }

      // Should return early without deleting
      expect(() => abortUpload(file as never)).not.toThrow()
      expect(mockUnlink).not.toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    it('should delete a file from the filesystem', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(null))
      const { deleteFile } = await import('../provider.js')

      await deleteFile('test-file-id')

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('test-file-id'),
        expect.any(Function),
      )
    })

    it('should throw on delete error', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(new Error('Delete failed')))
      const { deleteFile } = await import('../provider.js')

      await expect(deleteFile('test-file-id')).rejects.toThrow('Delete failed')
    })

    it('should log errors on delete failure', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(new Error('Delete failed')))
      const { deleteFile } = await import('../provider.js')

      try {
        await deleteFile('test-file-id')
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('test-file-id'),
        expect.any(Error),
      )
    })

    it('should handle empty file ID', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(null))
      const { deleteFile, uploadPath } = await import('../provider.js')

      await deleteFile('')

      expect(mockUnlink).toHaveBeenCalledWith(uploadPath, expect.any(Function))
    })

    it('should handle file ID with special characters', async () => {
      mockExistsSync.mockReturnValue(true)
      mockUnlink.mockImplementation((path, callback) => callback(null))
      const { deleteFile } = await import('../provider.js')

      await deleteFile('file-with-special!@#$%^&*()chars')

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('file-with-special!@#$%^&*()chars'),
        expect.any(Function),
      )
    })
  })

  describe('getFileStream', () => {
    it('should get a read stream for a file', async () => {
      mockExistsSync.mockReturnValue(true)
      const mockReadStream = new PassThrough()
      mockCreateReadStream.mockReturnValue(mockReadStream)
      const { getFileStream } = await import('../provider.js')

      const result = getFileStream('test-file-id')

      expect(result).toBe(mockReadStream)
      expect(mockCreateReadStream).toHaveBeenCalledWith(expect.stringContaining('test-file-id'))
    })

    it('should use correct path for file', async () => {
      mockExistsSync.mockReturnValue(true)
      const mockReadStream = new PassThrough()
      mockCreateReadStream.mockReturnValue(mockReadStream)
      const { getFileStream, uploadPath } = await import('../provider.js')

      getFileStream('my-file')

      expect(mockCreateReadStream).toHaveBeenCalledWith(expect.stringContaining(uploadPath))
    })
  })
})

describe('Filesystem Module Exports', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_UPLOAD_PATH', 'test-uploads')
    mockExistsSync.mockReturnValue(true)

    mockCreateWriteStream.mockReturnValue(new PassThrough())

    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('index exports', () => {
    it('should export upload function', async () => {
      const indexModule = await import('../index.js')
      expect(typeof indexModule.upload).toBe('function')
    })

    it('should export abortUpload function', async () => {
      const indexModule = await import('../index.js')
      expect(typeof indexModule.abortUpload).toBe('function')
    })

    it('should export deleteFile function', async () => {
      const indexModule = await import('../index.js')
      expect(typeof indexModule.deleteFile).toBe('function')
    })

    it('should export getFileStream function', async () => {
      const indexModule = await import('../index.js')
      expect(typeof indexModule.getFileStream).toBe('function')
    })

    it('should export uploadPath', async () => {
      const indexModule = await import('../index.js')
      expect(indexModule.uploadPath).toBeDefined()
      expect(typeof indexModule.uploadPath).toBe('string')
    })
  })

  describe('type exports verification', () => {
    it('should be able to use File type structure', async () => {
      mockCreateWriteStream.mockReturnValue(new PassThrough())

      const { upload } = await import('../index.js')

      const stream = new PassThrough()
      const file = upload(
        'avatar',
        stream,
        {
          filename: 'photo.jpg',
          encoding: '7bit',
          mimeType: 'image/jpeg',
        },
        vi.fn(),
      )

      // Verify the file object has expected structure
      expect(file).toMatchObject({
        id: expect.any(String),
        fieldname: 'avatar',
        filename: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: expect.any(Number),
        uploaded: false,
      })
      expect(file.uploadPromise).toBeInstanceOf(Promise)
      expect(file.upload).toBeDefined()
    })
  })
})

describe('Filesystem Security Tests', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_UPLOAD_PATH', 'test-uploads')
    mockExistsSync.mockReturnValue(true)
    mockUnlink.mockImplementation((path, callback) => callback(null))

    mockCreateWriteStream.mockReturnValue(new PassThrough())

    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('file validation', () => {
    it('should use UUID for file IDs preventing user-controlled paths', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      // Even if filename contains path traversal, the ID is a UUID
      const file = upload(
        'file',
        stream,
        {
          filename: '../../../etc/passwd',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.id).toBe('test-uuid-1234')
      expect(file.id).not.toContain('..')
      expect(file.id).not.toContain('/')
    })

    it('should not use filename for file storage path', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      upload(
        'file',
        stream,
        {
          filename: '../../../malicious.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      // The write stream should be created with UUID, not filename
      expect(mockCreateWriteStream).toHaveBeenCalledWith(expect.stringContaining('test-uuid-1234'))
      expect(mockCreateWriteStream).not.toHaveBeenCalledWith(expect.stringContaining('malicious'))
    })

    it('should handle path traversal attempts in delete', async () => {
      const { deleteFile } = await import('../provider.js')

      // Note: This tests that the provider uses path.join which normalizes paths
      // However, the actual protection comes from using UUIDs as IDs
      await deleteFile('../../../etc/passwd')

      // The path should be constructed from uploadPath + id
      expect(mockUnlink).toHaveBeenCalled()
    })

    it('should handle path traversal attempts in getFileStream', async () => {
      const mockReadStream = new PassThrough()
      mockCreateReadStream.mockReturnValue(mockReadStream)
      const { getFileStream } = await import('../provider.js')

      getFileStream('../../../etc/passwd')

      // The provider constructs the path, actual security comes from using UUIDs
      expect(mockCreateReadStream).toHaveBeenCalled()
    })
  })
})

describe('Filesystem Edge Cases', () => {
  let mockWriteStream: PassThrough

  beforeEach(() => {
    vi.stubEnv('FILE_UPLOAD_PATH', 'test-uploads')
    mockExistsSync.mockReturnValue(true)
    mockUnlink.mockImplementation((path, callback) => callback(null))

    mockWriteStream = new PassThrough()
    mockCreateWriteStream.mockReturnValue(mockWriteStream)

    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('upload with special characters', () => {
    it('should handle filenames with unicode characters', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: 'test-\u4e2d\u6587-\u65e5\u672c\u8a9e-\ud83d\ude00.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.filename).toBe('test-\u4e2d\u6587-\u65e5\u672c\u8a9e-\ud83d\ude00.txt')
    })

    it('should handle filenames with spaces and special characters', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: 'my file (1) [final] version.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.filename).toBe('my file (1) [final] version.txt')
    })

    it('should handle empty filename', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: '',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.filename).toBe('')
    })
  })

  describe('upload with various MIME types', () => {
    it('should handle application/octet-stream', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: 'binary.bin',
          encoding: 'binary',
          mimeType: 'application/octet-stream',
        },
        vi.fn(),
      )

      expect(file.mimetype).toBe('application/octet-stream')
    })

    it('should handle multipart content types', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: 'message.eml',
          encoding: '7bit',
          mimeType: 'multipart/mixed; boundary="----=_Part_0"',
        },
        vi.fn(),
      )

      // Mimetype should be truncated to 255 chars but this one is shorter
      expect(file.mimetype).toBe('multipart/mixed; boundary="----=_Part_0"')
    })
  })

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous uploads', async () => {
      let callCount = 0
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockImplementation(() => `test-uuid-${++callCount}`)

      const { upload } = await import('../provider.js')

      const stream1 = new PassThrough()
      const stream2 = new PassThrough()
      const stream3 = new PassThrough()

      const file1 = upload(
        'file1',
        stream1,
        {
          filename: 'file1.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      const file2 = upload(
        'file2',
        stream2,
        {
          filename: 'file2.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      const file3 = upload(
        'file3',
        stream3,
        {
          filename: 'file3.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      // Each file should have a unique ID
      expect(file1.id).not.toBe(file2.id)
      expect(file2.id).not.toBe(file3.id)
      expect(file1.id).not.toBe(file3.id)

      // Each file should track its own size
      stream1.emit('data', Buffer.from('12345'))
      stream2.emit('data', Buffer.from('1234567890'))
      stream3.emit('data', Buffer.from('123'))

      expect(file1.size).toBe(5)
      expect(file2.size).toBe(10)
      expect(file3.size).toBe(3)
    })

    it('should handle multiple simultaneous deletes', async () => {
      const { deleteFile } = await import('../provider.js')

      await Promise.all([deleteFile('file-1'), deleteFile('file-2'), deleteFile('file-3')])

      expect(mockUnlink).toHaveBeenCalledTimes(3)
    })
  })

  describe('large file handling', () => {
    it('should track size correctly for large data chunks', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: 'large.bin',
          encoding: 'binary',
          mimeType: 'application/octet-stream',
        },
        vi.fn(),
      )

      // Simulate 10MB in chunks
      const chunkSize = 1024 * 1024 // 1MB
      const chunk = Buffer.alloc(chunkSize)

      for (let i = 0; i < 10; i++) {
        stream.emit('data', chunk)
      }

      expect(file.size).toBe(10 * chunkSize)
    })
  })

  describe('abortUpload edge cases', () => {
    it('should handle file with upload that has no end method', async () => {
      const { upload, abortUpload } = await import('../provider.js')

      const stream = new PassThrough()

      const file = upload(
        'file',
        stream,
        {
          filename: 'test.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      // Simulate upload without end method
      const uploadWithoutEnd = { write: vi.fn() }
      file.upload = uploadWithoutEnd as never

      // Should not throw
      expect(() => abortUpload(file)).not.toThrow()
    })

    it('should delete file when file is already uploaded', async () => {
      const { abortUpload } = await import('../provider.js')

      const file = {
        id: 'already-uploaded-id',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 100,
        uploaded: true,
      }

      abortUpload(file as never)

      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining('already-uploaded-id'),
        expect.any(Function),
      )
    })
  })
})

describe('Delete File Edge Cases', () => {
  beforeEach(() => {
    vi.stubEnv('FILE_UPLOAD_PATH', 'test-uploads')
    mockExistsSync.mockReturnValue(true)

    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should handle very long file ID', async () => {
    mockUnlink.mockImplementation((path, callback) => callback(null))
    const { deleteFile } = await import('../provider.js')
    const longId = 'a'.repeat(1024)

    await deleteFile(longId)

    expect(mockUnlink).toHaveBeenCalledWith(expect.stringContaining(longId), expect.any(Function))
  })

  it('should handle file ID with null bytes', async () => {
    mockUnlink.mockImplementation((path, callback) => callback(null))
    const { deleteFile } = await import('../provider.js')

    await deleteFile('file-with\x00null')

    expect(mockUnlink).toHaveBeenCalled()
  })

  it('should handle ENOENT error (file not found)', async () => {
    const enoentError = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException
    enoentError.code = 'ENOENT'
    mockUnlink.mockImplementation((path, callback) => callback(enoentError))
    const { deleteFile } = await import('../provider.js')

    await expect(deleteFile('non-existent-file')).rejects.toThrow('ENOENT')
  })

  it('should handle EACCES error (permission denied)', async () => {
    const eaccesError = new Error('EACCES: permission denied') as NodeJS.ErrnoException
    eaccesError.code = 'EACCES'
    mockUnlink.mockImplementation((path, callback) => callback(eaccesError))
    const { deleteFile } = await import('../provider.js')

    await expect(deleteFile('protected-file')).rejects.toThrow('EACCES')
  })
})
