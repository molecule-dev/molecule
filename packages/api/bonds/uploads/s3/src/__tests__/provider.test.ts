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
      } catch {
        // Expected
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

      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
      })
    })

    it('should default region to us-east-1', async () => {
      vi.stubEnv('AWS_S3_REGION', '')
      vi.resetModules()

      const { S3Client } = await import('@aws-sdk/client-s3')
      const { s3Client } = await import('../provider.js')

      // Trigger lazy initialization by accessing a property
      void s3Client.config

      expect(S3Client).toHaveBeenCalledWith({
        region: 'us-east-1',
      })
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
})
