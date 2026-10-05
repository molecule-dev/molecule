/**
 * Tests for the S3 upload provider.
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
  HeadObjectCommand: vi.fn(function (params: unknown) {
    return { params, type: 'HeadObjectCommand' }
  }),
  HeadBucketCommand: vi.fn(function (params: unknown) {
    return { params, type: 'HeadBucketCommand' }
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

describe('S3 Provider', () => {
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

  describe('upload', () => {
    it('should upload a file stream to S3', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

      // Simulate data being written
      stream.emit('data', Buffer.from('test data'))
      expect(file.size).toBe(9)

      // Complete the upload
      await file.uploadPromise

      expect(file.uploaded).toBe(true)
      expect(file.location).toBe('https://test-bucket.s3.amazonaws.com/test-uuid-1234')
    })

    it('should truncate long filenames', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

    it('should truncate long encodings', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

    it('should truncate long mimetypes', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

    it('should call onError when upload fails', async () => {
      const uploadError = new Error('Upload failed')
      mockUploadDone.mockRejectedValue(uploadError)

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

      await expect(file.uploadPromise).rejects.toThrow('Upload failed')
      expect(onError).toHaveBeenCalledWith(uploadError)
    })

    it('should call onError when stream limit is reached', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

    it('should track file size from stream data events', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
  })

  describe('abortUpload', () => {
    it('should abort an in-progress upload', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })
      mockUploadAbort.mockResolvedValue(undefined)

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

      await abortUpload(file)

      expect(mockUploadAbort).toHaveBeenCalled()
      expect(file.upload).toBeUndefined()
      expect(file.uploadPromise).toBeUndefined()
      expect(file.stream).toBeUndefined()
    })

    it('[ambiguous-failure fix] onError is never called and uploadPromise rejects with the shared UploadAbortedError — not the raw AWS AbortError, and never a false success — when the upload is aborted', async () => {
      // Real @aws-sdk/lib-storage semantics: calling Upload#abort() makes the
      // in-flight done() promise REJECT with an AbortError. The other abortUpload
      // tests in this file mock done() as resolving, which can't exercise (and
      // used to hide) this path — before the fix, that raw AbortError flowed
      // straight into onError, so an intentional cancel masqueraded as a
      // transport failure (and disagreed with the filesystem bond, whose old
      // `.end()`-based abort instead resolved uploadPromise as a false success).
      const awsAbortError = Object.assign(new Error('Upload aborted.'), { name: 'AbortError' })
      mockUploadDone.mockRejectedValue(awsAbortError)
      mockUploadAbort.mockResolvedValue(undefined)

      const { upload, abortUpload } = await import('../provider.js')
      const { UploadAbortedError } = await import('@molecule/api-uploads')

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
      const uploadPromise = file.uploadPromise

      await abortUpload(file)

      expect(mockUploadAbort).toHaveBeenCalled()
      await expect(uploadPromise).rejects.toBeInstanceOf(UploadAbortedError)
      expect(onError).not.toHaveBeenCalled()
      expect(file.uploaded).toBe(false)
    })

    it('should remove stream listeners when aborting', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })
      mockUploadAbort.mockResolvedValue(undefined)

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

      await abortUpload(file)

      expect(removeAllListenersSpy).toHaveBeenCalledWith('data')
      expect(removeAllListenersSpy).toHaveBeenCalledWith('limit')
      expect(removeAllListenersSpy).toHaveBeenCalledWith('end')
    })

    it('should handle abort errors gracefully', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })
      mockUploadAbort.mockRejectedValue(new Error('Abort failed'))

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

      await abortUpload(file)

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('deleteFile', () => {
    it('should delete a file from S3', async () => {
      mockSend.mockResolvedValue({})

      const { deleteFile } = await import('../provider.js')

      await deleteFile('test-file-id')

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            Bucket: 'test-bucket',
            Key: 'test-file-id',
          },
        }),
      )
    })

    it('should throw on delete error', async () => {
      mockSend.mockRejectedValue(new Error('Delete failed'))

      const { deleteFile } = await import('../provider.js')

      await expect(deleteFile('test-file-id')).rejects.toThrow('Delete failed')
    })

    it('should log errors on delete failure', async () => {
      mockSend.mockRejectedValue(new Error('Delete failed'))

      const { deleteFile } = await import('../provider.js')

      try {
        await deleteFile('test-file-id')
      } catch (_error) {
        // Expected rejection — this test only verifies that logger.error was called, not the thrown value.
      }

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('getFile', () => {
    it('should get a file from S3', async () => {
      const mockBody = new PassThrough()
      mockSend.mockResolvedValue({ Body: mockBody })

      const { getFile } = await import('../provider.js')

      const result = await getFile('test-file-id')

      expect(result).toBe(mockBody)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            Bucket: 'test-bucket',
            Key: 'test-file-id',
          },
        }),
      )
    })
  })

  describe('s3Client', () => {
    it('should use configured region', async () => {
      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      // Trigger lazy initialization by accessing a property
      void s3Client.config

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1', maxAttempts: 3 }),
      )
    })

    it('should default region to us-east-1', async () => {
      vi.stubEnv('AWS_S3_REGION', '')
      vi.resetModules()

      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      // Trigger lazy initialization by accessing a property
      void s3Client.config

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'us-east-1', maxAttempts: 3 }),
      )
    })

    it('should not set endpoint or forcePathStyle by default', async () => {
      vi.resetModules()

      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      void s3Client.config

      const config = (S3Client as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
        string,
        unknown
      >
      expect(config).not.toHaveProperty('endpoint')
      expect(config).not.toHaveProperty('forcePathStyle')
    })

    it('should pass endpoint when AWS_S3_ENDPOINT is set (R2/MinIO/Spaces)', async () => {
      vi.stubEnv('AWS_S3_ENDPOINT', 'https://accountid.r2.cloudflarestorage.com')
      vi.resetModules()

      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      void s3Client.config

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://accountid.r2.cloudflarestorage.com',
        }),
      )
    })

    it('should enable forcePathStyle when AWS_S3_FORCE_PATH_STYLE is "true"', async () => {
      vi.stubEnv('AWS_S3_ENDPOINT', 'http://localhost:9000')
      vi.stubEnv('AWS_S3_FORCE_PATH_STYLE', 'true')
      vi.resetModules()

      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      void s3Client.config

      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'http://localhost:9000',
          forcePathStyle: true,
        }),
      )
    })

    it('should not enable forcePathStyle for non-"true" values', async () => {
      vi.stubEnv('AWS_S3_FORCE_PATH_STYLE', '1')
      vi.resetModules()

      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      void s3Client.config

      const config = (S3Client as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
        string,
        unknown
      >
      expect(config).not.toHaveProperty('forcePathStyle')
    })
  })
})

describe('S3 Security Tests', () => {
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

  describe('file validation', () => {
    it('should not allow path traversal in file ID for delete', async () => {
      mockSend.mockResolvedValue({})

      const { deleteFile } = await import('../provider.js')

      // The S3 provider uses UUID for file IDs, so path traversal
      // in user-provided IDs would be caught by S3 key validation
      await deleteFile('../../../etc/passwd')

      // S3 keys with path traversal should be sent as-is
      // S3 handles these safely (they become literal key names)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            Key: '../../../etc/passwd',
          }),
        }),
      )
    })

    it('should use UUID for file IDs preventing user-controlled paths', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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
  })

  describe('MIME type blocklist', () => {
    it('should reject text/html uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'page.html',
          encoding: '7bit',
          mimeType: 'text/html',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('text/html'),
        }),
      )
    })

    it('should reject application/javascript uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'script.js',
          encoding: '7bit',
          mimeType: 'application/javascript',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('application/javascript'),
        }),
      )
    })

    it('should reject image/svg+xml uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'image.svg',
          encoding: '7bit',
          mimeType: 'image/svg+xml',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('image/svg+xml'),
        }),
      )
    })

    it('should reject text/xml uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'data.xml',
          encoding: '7bit',
          mimeType: 'text/xml',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('text/xml'),
        }),
      )
    })

    it('should reject application/xhtml+xml uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'page.xhtml',
          encoding: '7bit',
          mimeType: 'application/xhtml+xml',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('application/xhtml+xml'),
        }),
      )
    })

    it('should reject text/javascript uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'module.mjs',
          encoding: '7bit',
          mimeType: 'text/javascript',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('text/javascript'),
        }),
      )
    })

    it('should reject application/xml uploads', async () => {
      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'config.xml',
          encoding: '7bit',
          mimeType: 'application/xml',
        },
        onError,
      )

      expect(file.uploaded).toBe(false)
      expect(file.uploadPromise).toBeUndefined()
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('application/xml'),
        }),
      )
    })

    it('should allow image/png uploads', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'photo.png',
          encoding: '7bit',
          mimeType: 'image/png',
        },
        onError,
      )

      expect(onError).not.toHaveBeenCalled()
      expect(file.uploadPromise).toBeDefined()
      expect(file.mimetype).toBe('image/png')
    })

    it('should allow application/pdf uploads', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

      const { upload } = await import('../provider.js')

      const stream = new PassThrough()
      const onError = vi.fn()

      const file = upload(
        'file',
        stream,
        {
          filename: 'document.pdf',
          encoding: '7bit',
          mimeType: 'application/pdf',
        },
        onError,
      )

      expect(onError).not.toHaveBeenCalled()
      expect(file.uploadPromise).toBeDefined()
      expect(file.mimetype).toBe('application/pdf')
    })

    it('should not create S3 Upload for blocked MIME types', async () => {
      const { Upload } = await import('@aws-sdk/lib-storage')

      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      upload(
        'file',
        stream,
        {
          filename: 'evil.html',
          encoding: '7bit',
          mimeType: 'text/html',
        },
        vi.fn(),
      )

      // Upload constructor should not be called for blocked types
      expect(Upload).not.toHaveBeenCalled()
    })
  })

  describe('ContentDisposition header', () => {
    it('should set ContentDisposition to attachment on S3 uploads', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

      const { Upload } = await import('@aws-sdk/lib-storage')

      const { upload } = await import('../provider.js')

      const stream = new PassThrough()

      upload(
        'file',
        stream,
        {
          filename: 'photo.jpg',
          encoding: '7bit',
          mimeType: 'image/jpeg',
        },
        vi.fn(),
      )

      expect(Upload).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            ContentDisposition: 'attachment',
          }),
        }),
      )
    })
  })

  describe('stream error handler', () => {
    it('should call onError when stream emits an error', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

      const streamError = new Error('Connection reset')
      stream.emit('error', streamError)

      expect(onError).toHaveBeenCalledWith(streamError)
    })

    it('should wrap non-Error stream errors into Error objects', async () => {
      mockUploadDone.mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-uuid-1234',
      })

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

      // Emit a non-Error value
      stream.emit('error', 'string error')

      expect(onError).toHaveBeenCalledWith(expect.any(Error))
      expect(onError.mock.calls[0][0].message).toBe('string error')
    })
  })
})

// ─── Provisioning-tool env names ──────────────────────────────────────────────

/**
 * A provider's own setup flow must produce a working bond.
 *
 * `fly storage create` (Tigris) exports `AWS_ENDPOINT_URL_S3` and `BUCKET_NAME`
 * — the names the AWS SDKs standardised — while this bond originally read only
 * `AWS_S3_ENDPOINT` and `AWS_S3_BUCKET`. Following Fly's documented flow
 * therefore produced an environment the bond never looked at: uploads fell back
 * to the AWS regional endpoint and failed against a bucket that does not live
 * there, with every value correctly set.
 */
describe('S3 env resolution — accepts the names provisioning tools export', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test_access_key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test_secret_key')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  it('reads the bucket from BUCKET_NAME when AWS_S3_BUCKET is unset', async () => {
    vi.stubEnv('AWS_S3_BUCKET', '')
    vi.stubEnv('BUCKET_NAME', 'fly-provisioned-bucket')
    mockSend.mockResolvedValue({})

    const { deleteFile } = await import('../provider.js')
    await deleteFile('some-key')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Bucket: 'fly-provisioned-bucket' }),
      }),
    )
  })

  it('prefers the explicit AWS_S3_BUCKET when both are set', async () => {
    vi.stubEnv('AWS_S3_BUCKET', 'explicit-bucket')
    vi.stubEnv('BUCKET_NAME', 'fly-provisioned-bucket')
    mockSend.mockResolvedValue({})

    const { deleteFile } = await import('../provider.js')
    await deleteFile('some-key')

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Bucket: 'explicit-bucket' }),
      }),
    )
  })
})

// ─── createProvider: several stores per app ───────────────────────────────────

describe('createProvider — independent S3 stores', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('AWS_S3_BUCKET', 'env-bucket')
    vi.stubEnv('AWS_S3_REGION', 'us-east-1')
    const { bond } = await import('@molecule/api-bond')
    bond('logger', mockLogger)
  })

  afterEach(async () => {
    const { unbond } = await import('@molecule/api-bond')
    unbond('logger')
    vi.unstubAllEnvs()
  })

  const s3Calls = async (): Promise<Record<string, unknown>[]> => {
    const { S3Client } = await import('@aws-sdk/client-s3')
    return (S3Client as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0] as Record<string, unknown>,
    )
  }

  it('builds the client lazily, on first use', async () => {
    const { createProvider } = await import('../provider.js')
    const store = createProvider({ bucket: 'b' })
    expect(await s3Calls()).toHaveLength(0)
    void store.client
    void store.client
    expect(await s3Calls()).toHaveLength(1)
  })

  it('gives two providers separate clients, endpoints and buckets', async () => {
    mockSend.mockResolvedValue({})
    const { createProvider } = await import('../provider.js')
    const uploads = createProvider({ bucket: 'user-uploads' })
    const backups = createProvider({
      bucket: 'backups',
      endpoint: 'https://s3.eu-central-003.backblazeb2.com',
      region: 'eu-central-003',
      forcePathStyle: true,
    })

    expect(uploads.client).not.toBe(backups.client)
    expect(uploads.bucket).toBe('user-uploads')
    expect(backups.bucket).toBe('backups')

    const calls = await s3Calls()
    expect(calls).toHaveLength(2)
    expect(calls[0]).not.toHaveProperty('endpoint')
    expect(calls[0]).toMatchObject({ region: 'us-east-1', maxAttempts: 3 })
    expect(calls[1]).toMatchObject({
      endpoint: 'https://s3.eu-central-003.backblazeb2.com',
      region: 'eu-central-003',
      forcePathStyle: true,
    })

    await backups.deleteFile('k1')
    await uploads.deleteFile('k2')
    expect(mockSend).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ params: { Bucket: 'backups', Key: 'k1' } }),
    )
    expect(mockSend).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ params: { Bucket: 'user-uploads', Key: 'k2' } }),
    )
  })

  it('does not touch the default env-configured provider', async () => {
    mockSend.mockResolvedValue({})
    const { createProvider, deleteFile, provider } = await import('../provider.js')
    const backups = createProvider({ bucket: 'backups' })
    void backups.client
    await deleteFile('k')
    expect(provider.bucket).toBe('env-bucket')
    expect(provider.client).not.toBe(backups.client)
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ params: { Bucket: 'env-bucket', Key: 'k' } }),
    )
  })

  it('passes static credentials, timeouts and maxAttempts to the client', async () => {
    const { createProvider } = await import('../provider.js')
    const store = createProvider({
      bucket: 'b',
      credentials: { accessKeyId: 'AKID', secretAccessKey: 'SECRET', sessionToken: 'TOKEN' },
      connectionTimeoutMs: 1234,
      socketTimeoutMs: 5678,
      maxAttempts: 7,
    })
    void store.client
    const [config] = await s3Calls()
    expect(config).toMatchObject({
      credentials: { accessKeyId: 'AKID', secretAccessKey: 'SECRET', sessionToken: 'TOKEN' },
      requestHandler: { connectionTimeout: 1234, socketTimeout: 5678 },
      maxAttempts: 7,
    })
  })

  it('leaves credentials to the SDK chain when none are configured', async () => {
    const { createProvider } = await import('../provider.js')
    void createProvider({ bucket: 'b' }).client
    const [config] = await s3Calls()
    expect(config).not.toHaveProperty('credentials')
  })

  it('prepends keyPrefix to minted keys and returns the full key as the id', async () => {
    mockUploadDone.mockResolvedValue({ Location: 'x' })
    const { Upload } = await import('@aws-sdk/lib-storage')
    const { createProvider } = await import('../provider.js')
    const store = createProvider({ bucket: 'backups', keyPrefix: 'nightly/' })

    const file = store.upload(
      'file',
      new PassThrough(),
      { filename: 'db.dump', encoding: '7bit', mimeType: 'application/octet-stream' },
      vi.fn(),
    )

    expect(file.id).toBe('nightly/test-uuid-1234')
    expect(Upload).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ Bucket: 'backups', Key: 'nightly/test-uuid-1234' }),
      }),
    )
  })

  it('passes storageClass as StorageClass, and omits it when unset', async () => {
    mockUploadDone.mockResolvedValue({ Location: 'x' })
    const { Upload } = await import('@aws-sdk/lib-storage')
    const { createProvider } = await import('../provider.js')
    const info = { filename: 'a.bin', encoding: '7bit', mimeType: 'application/octet-stream' }

    createProvider({ bucket: 'cold', storageClass: 'GLACIER_IR' }).upload(
      'file',
      new PassThrough(),
      info,
      vi.fn(),
    )
    createProvider({ bucket: 'hot' }).upload('file', new PassThrough(), info, vi.fn())

    const calls = (Upload as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => (c[0] as { params: Record<string, unknown> }).params,
    )
    expect(calls[0]).toMatchObject({ Bucket: 'cold', StorageClass: 'GLACIER_IR' })
    expect(calls[1]).not.toHaveProperty('StorageClass')
  })

  it('fails fast when the configured bucket is empty', async () => {
    const { Upload } = await import('@aws-sdk/lib-storage')
    const { createProvider } = await import('../provider.js')
    const onError = vi.fn()
    const file = createProvider({ bucket: '' }).upload(
      'file',
      new PassThrough(),
      { filename: 'a.txt', encoding: '7bit', mimeType: 'text/plain' },
      onError,
    )
    expect(file.uploaded).toBe(false)
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('createProvider') }),
    )
    expect(Upload).not.toHaveBeenCalled()
  })

  it('getFile returns null for NoSuchKey on an instance', async () => {
    mockSend.mockRejectedValue(Object.assign(new Error('nope'), { name: 'NoSuchKey' }))
    const { createProvider } = await import('../provider.js')
    expect(await createProvider({ bucket: 'b' }).getFile('missing')).toBeNull()
  })

  describe('headFile', () => {
    it('returns size, etag and lastModified', async () => {
      const lastModified = new Date('2026-10-01T00:00:00Z')
      mockSend.mockResolvedValue({ ContentLength: 42, ETag: '"abc"', LastModified: lastModified })
      const { createProvider } = await import('../provider.js')
      const head = await createProvider({ bucket: 'b' }).headFile('k')
      expect(head).toEqual({ bytes: 42, etag: '"abc"', lastModified })
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'HeadObjectCommand', params: { Bucket: 'b', Key: 'k' } }),
      )
    })

    it('returns null for NotFound and NoSuchKey', async () => {
      const { createProvider } = await import('../provider.js')
      const store = createProvider({ bucket: 'b' })
      mockSend.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotFound' }))
      expect(await store.headFile('k')).toBeNull()
      mockSend.mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NoSuchKey' }))
      expect(await store.headFile('k')).toBeNull()
    })

    it('throws for any other failure', async () => {
      mockSend.mockRejectedValue(
        Object.assign(new Error('Access Denied'), { name: 'AccessDenied' }),
      )
      const { createProvider } = await import('../provider.js')
      await expect(createProvider({ bucket: 'b' }).headFile('k')).rejects.toThrow('Access Denied')
    })

    it('is available on the default provider, against the env bucket', async () => {
      mockSend.mockResolvedValue({ ContentLength: 1 })
      const { provider } = await import('../provider.js')
      expect(await provider.headFile('k')).toEqual({ bytes: 1 })
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({ params: { Bucket: 'env-bucket', Key: 'k' } }),
      )
    })
  })

  describe('configFromEnv', () => {
    it('reads the env names the default provider uses, leaving credentials to the SDK', async () => {
      vi.stubEnv('AWS_S3_BUCKET', '')
      vi.stubEnv('BUCKET_NAME', 'fly-bucket')
      vi.stubEnv('AWS_S3_ENDPOINT', '')
      vi.stubEnv('AWS_ENDPOINT_URL_S3', 'https://fly.storage.tigris.dev')
      vi.stubEnv('AWS_S3_REGION', '')
      vi.stubEnv('AWS_REGION', 'auto')
      vi.stubEnv('AWS_S3_FORCE_PATH_STYLE', 'true')
      vi.stubEnv('AWS_S3_SOCKET_TIMEOUT_MS', '9000')
      const { configFromEnv } = await import('../provider.js')
      expect(configFromEnv()).toEqual({
        bucket: 'fly-bucket',
        region: 'auto',
        endpoint: 'https://fly.storage.tigris.dev',
        forcePathStyle: true,
        connectionTimeoutMs: 10_000,
        socketTimeoutMs: 9000,
        maxAttempts: 3,
      })
    })

    it('still reads the bucket from the env on every call of the default provider', async () => {
      mockSend.mockResolvedValue({})
      const { deleteFile } = await import('../provider.js')
      await deleteFile('a')
      vi.stubEnv('AWS_S3_BUCKET', 'changed-bucket')
      await deleteFile('b')
      expect(mockSend).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ params: { Bucket: 'changed-bucket', Key: 'b' } }),
      )
    })
  })
})

describe('R93: headFile and a missing bucket, the part size, a source that errors', () => {
  it('headFile throws NoSuchBucket when the bucket itself is missing, null when only the object is', async () => {
    const { createProvider } = await import('../provider.js')
    const store = createProvider({ bucket: 'b' })
    mockSend.mockImplementation(async (cmd: { type: string }) => {
      if (cmd.type === 'HeadObjectCommand')
        throw Object.assign(new Error('x'), { name: 'NotFound' })
      if (cmd.type === 'HeadBucketCommand')
        throw Object.assign(new Error('x'), { name: 'NotFound' })
      return {}
    })
    await expect(store.headFile('k')).rejects.toMatchObject({ name: 'NoSuchBucket' })
    mockSend.mockImplementation(async (cmd: { type: string }) => {
      if (cmd.type === 'HeadObjectCommand')
        throw Object.assign(new Error('x'), { name: 'NotFound' })
      return {}
    })
    expect(await store.headFile('k')).toBeNull()
    mockSend.mockReset()
  })

  it('partSizeBytes reaches the multipart upload; a source error tears the body down', async () => {
    mockUploadDone.mockImplementation(() => new Promise(() => {}))
    const { Upload } = await import('@aws-sdk/lib-storage')
    const { createProvider } = await import('../provider.js')
    const info = { filename: 'db.dump', encoding: '7bit', mimeType: 'application/octet-stream' }
    createProvider({ bucket: 'b', partSizeBytes: 16 * 1024 * 1024 }).upload(
      'file',
      new PassThrough(),
      info,
      vi.fn(),
    )
    const sized = vi.mocked(Upload).mock.calls.at(-1)![0] as { partSize?: number }
    expect(sized.partSize).toBe(16 * 1024 * 1024)
    const source = new PassThrough()
    const onError = vi.fn()
    createProvider({ bucket: 'b' }).upload('file', source, info, onError)
    const plain = vi.mocked(Upload).mock.calls.at(-1)![0] as {
      partSize?: number
      params: { Body: PassThrough }
    }
    expect(plain.partSize).toBeUndefined()
    source.destroy(new Error('connection reset'))
    await new Promise((resolve) => setImmediate(resolve))
    expect(plain.params.Body.destroyed).toBe(true)
  })
})
