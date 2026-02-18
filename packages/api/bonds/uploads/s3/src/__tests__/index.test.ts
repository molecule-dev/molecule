/**
 * Tests for the S3 upload provider module exports.
 *
 * @module
 */

import { PassThrough } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Create mock functions
const mockSend = vi.fn()
const mockUploadDone = vi.fn()
const mockUploadAbort = vi.fn()

// Mock @aws-sdk/client-s3
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(function () {
    return {
      send: mockSend,
    }
  }),
  DeleteObjectCommand: vi.fn(function (params: unknown) {
    return { params, type: 'DeleteObjectCommand' }
  }),
  GetObjectCommand: vi.fn(function (params: unknown) {
    return { params, type: 'GetObjectCommand' }
  }),
}))

// Mock @aws-sdk/lib-storage
vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn(function ({ params }: { params: unknown }) {
    return {
      done: mockUploadDone,
      abort: mockUploadAbort,
      params,
    }
  }),
}))

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn().mockReturnValue('test-uuid-1234'),
}))

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() }

describe('S3 Module Exports', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test_access_key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_secret_key')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
    vi.stubEnv('AWS_S3_REGION', 'us-east-1')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
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

    it('should export getFile function', async () => {
      const indexModule = await import('../index.js')
      expect(typeof indexModule.getFile).toBe('function')
    })

    it('should export s3Client', async () => {
      const indexModule = await import('../index.js')
      expect(indexModule.s3Client).toBeDefined()
    })

    it('should not export bucketName (now internal)', async () => {
      const indexModule = await import('../index.js')
      expect((indexModule as Record<string, unknown>).bucketName).toBeUndefined()
    })
  })

  describe('type exports verification', () => {
    it('should be able to use File type structure', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
    })
  })
})

describe('S3 Provider Edge Cases', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test_access_key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_secret_key')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
    vi.stubEnv('AWS_S3_REGION', 'us-east-1')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  describe('getFile error handling', () => {
    it('should throw when S3 returns an error', async () => {
      mockSend.mockRejectedValue(new Error('NoSuchKey'))

      const { getFile } = await import('../provider.js')

      await expect(getFile('non-existent-file')).rejects.toThrow('NoSuchKey')
    })

    it('should throw on access denied', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'))

      const { getFile } = await import('../provider.js')

      await expect(getFile('restricted-file')).rejects.toThrow('Access Denied')
    })

    it('should return undefined body when file is empty', async () => {
      mockSend.mockResolvedValue({ Body: undefined })

      const { getFile } = await import('../provider.js')

      const result = await getFile('empty-file')
      expect(result).toBeNull()
    })
  })

  describe('upload with special characters', () => {
    it('should handle filenames with unicode characters', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = upload(
        'file',
        stream,
        {
          filename: 'test-中文-日本語-😀.txt',
          encoding: '7bit',
          mimeType: 'text/plain',
        },
        vi.fn(),
      )

      expect(file.filename).toBe('test-中文-日本語-😀.txt')
    })

    it('should handle filenames with spaces and special characters', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

      expect(file.mimetype).toBe('multipart/mixed; boundary="----=_Part_0"')
    })
  })

  describe('abortUpload edge cases', () => {
    it('should handle file without stream', async () => {
      const { abortUpload } = await import('../provider.js')

      const file = {
        id: 'test-id',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 0,
        uploaded: false,
        // Note: no stream property
      }

      // Should not throw
      await expect(abortUpload(file as never)).resolves.not.toThrow()
    })

    it('should handle file without upload object', async () => {
      const { abortUpload } = await import('../provider.js')

      const stream = new PassThrough()
      const file = {
        id: 'test-id',
        fieldname: 'file',
        filename: 'test.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        size: 0,
        stream,
        uploaded: false,
        // Note: no upload property
      }

      // Should not throw and should clean up stream
      await expect(abortUpload(file as never)).resolves.not.toThrow()
      expect(file.stream).toBeUndefined()
    })
  })

  describe('concurrent operations', () => {
    it('should handle multiple simultaneous uploads', async () => {
      let callCount = 0
      const { v4 } = await import('uuid')
      vi.mocked(v4).mockImplementation(() => `test-uuid-${++callCount}`)

      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid',
      })

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
      mockSend.mockResolvedValue({})

      const { deleteFile } = await import('../provider.js')

      await Promise.all([deleteFile('file-1'), deleteFile('file-2'), deleteFile('file-3')])

      expect(mockSend).toHaveBeenCalledTimes(3)
    })
  })

  describe('large file handling', () => {
    it('should track size correctly for large data chunks', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
})

describe('Environment Variable Handling', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  it('should not warn at import time (secrets handled by registerSecrets)', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', '')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', '')
    vi.stubEnv('AWS_S3_BUCKET', '')

    await import('../provider.js')

    // Warnings are now handled by @molecule/api-secrets via registerSecrets(),
    // not by the provider at import time
    expect(mockLogger.warn).not.toHaveBeenCalled()
  })

  it('should not warn when all credentials are provided', async () => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test_key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_secret')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')

    await import('../provider.js')

    expect(mockLogger.warn).not.toHaveBeenCalled()
  })
})

describe('Delete File Edge Cases', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test_access_key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_secret_key')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  it('should handle empty file ID', async () => {
    mockSend.mockResolvedValue({})

    const { deleteFile } = await import('../provider.js')

    await deleteFile('')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          Bucket: 'test-bucket',
          Key: '',
        },
      }),
    )
  })

  it('should handle file ID with special characters', async () => {
    mockSend.mockResolvedValue({})

    const { deleteFile } = await import('../provider.js')

    await deleteFile('file-with-special!@#$%^&*()chars')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          Bucket: 'test-bucket',
          Key: 'file-with-special!@#$%^&*()chars',
        },
      }),
    )
  })

  it('should handle very long file ID', async () => {
    mockSend.mockResolvedValue({})

    const { deleteFile } = await import('../provider.js')
    const longId = 'a'.repeat(1024)

    await deleteFile(longId)

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        params: {
          Bucket: 'test-bucket',
          Key: longId,
        },
      }),
    )
  })
})
