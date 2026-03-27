import { describe, expect, it, vi } from 'vitest'

import type { FileUploadOptions, UploadFile } from '@molecule/app-file-upload'

import { createFilepondProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFile(name: string, content = 'data', type = 'text/plain'): File {
  return new File([content], name, { type })
}

function createImageFile(name = 'photo.png'): File {
  return new File(['fake-image-data'], name, { type: 'image/png' })
}

function createOptions(overrides: Partial<FileUploadOptions> = {}): FileUploadOptions {
  return {
    destination: { url: '/api/upload' },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-file-upload-filepond', () => {
  describe('provider conformance', () => {
    it('exports a typed provider with createUploader method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createUploader).toBe('function')
    })

    it('createFilepondProvider returns a FileUploadProvider', () => {
      const p = createFilepondProvider()
      expect(typeof p.createUploader).toBe('function')
    })

    it('createFilepondProvider accepts timeout config', () => {
      const p = createFilepondProvider({ timeout: 5000 })
      expect(typeof p.createUploader).toBe('function')
    })
  })

  describe('queue management', () => {
    it('starts with an empty file list', () => {
      const uploader = provider.createUploader(createOptions())
      expect(uploader.getFiles()).toEqual([])
    })

    it('adds files to the queue', () => {
      const uploader = provider.createUploader(createOptions())
      const added = uploader.addFiles([createFile('test.txt')])

      expect(added).toHaveLength(1)
      expect(added[0].name).toBe('test.txt')
      expect(added[0].status).toBe('idle')
      expect(added[0].progress).toBe(0)
      expect(added[0].type).toBe('text/plain')
    })

    it('adds multiple files at once', () => {
      const uploader = provider.createUploader(createOptions())
      const added = uploader.addFiles([
        createFile('a.txt'),
        createFile('b.txt'),
        createFile('c.txt'),
      ])

      expect(added).toHaveLength(3)
      expect(uploader.getFiles()).toHaveLength(3)
    })

    it('returns a copy of the file list', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('test.txt')])

      const files1 = uploader.getFiles()
      const files2 = uploader.getFiles()
      expect(files1).not.toBe(files2)
      expect(files1).toEqual(files2)
    })

    it('getFile returns a file by ID', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])

      expect(uploader.getFile(added.id)).toBe(added)
    })

    it('getFile returns undefined for unknown ID', () => {
      const uploader = provider.createUploader(createOptions())
      expect(uploader.getFile('nonexistent')).toBeUndefined()
    })

    it('removeFile removes a file from the queue', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])

      uploader.removeFile(added.id)
      expect(uploader.getFiles()).toHaveLength(0)
    })

    it('removeFile is a no-op for unknown ID', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('test.txt')])

      uploader.removeFile('nonexistent')
      expect(uploader.getFiles()).toHaveLength(1)
    })

    it('clearFiles removes all files', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('a.txt'), createFile('b.txt')])

      uploader.clearFiles()
      expect(uploader.getFiles()).toHaveLength(0)
    })
  })

  describe('multiple option', () => {
    it('accepts multiple files by default', () => {
      const uploader = provider.createUploader(createOptions())
      const added = uploader.addFiles([createFile('a.txt'), createFile('b.txt')])
      expect(added).toHaveLength(2)
    })

    it('limits to one file when multiple is false', () => {
      const uploader = provider.createUploader(createOptions({ multiple: false }))
      const added = uploader.addFiles([createFile('a.txt'), createFile('b.txt')])
      expect(added).toHaveLength(1)
      expect(added[0].name).toBe('a.txt')
    })
  })

  describe('file validation', () => {
    it('rejects files exceeding maxSize', () => {
      const onValidationError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: { maxSize: 5 },
          events: { onValidationError },
        }),
      )

      const added = uploader.addFiles([createFile('big.txt', 'this is too large')])
      expect(added).toHaveLength(0)
      expect(onValidationError).toHaveBeenCalledTimes(1)
      const errors = onValidationError.mock.calls[0][1] as string[]
      expect(errors.some((e: string) => e.includes('maximum size'))).toBe(true)
    })

    it('rejects files below minSize', () => {
      const onValidationError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: { minSize: 1000 },
          events: { onValidationError },
        }),
      )

      const added = uploader.addFiles([createFile('small.txt', 'hi')])
      expect(added).toHaveLength(0)
      expect(onValidationError).toHaveBeenCalled()
    })

    it('rejects files with unaccepted MIME types', () => {
      const onValidationError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: { acceptedTypes: ['image/png', 'image/jpeg'] },
          events: { onValidationError },
        }),
      )

      const added = uploader.addFiles([createFile('doc.txt')])
      expect(added).toHaveLength(0)
      expect(onValidationError).toHaveBeenCalled()
    })

    it('accepts files matching wildcard MIME type', () => {
      const uploader = provider.createUploader(
        createOptions({
          validation: { acceptedTypes: ['image/*'] },
        }),
      )

      const added = uploader.addFiles([createImageFile()])
      expect(added).toHaveLength(1)
    })

    it('rejects files with unaccepted extensions', () => {
      const onValidationError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: { acceptedExtensions: ['.pdf', '.doc'] },
          events: { onValidationError },
        }),
      )

      const added = uploader.addFiles([createFile('readme.txt')])
      expect(added).toHaveLength(0)
      expect(onValidationError).toHaveBeenCalled()
    })

    it('accepts files with accepted extensions', () => {
      const uploader = provider.createUploader(
        createOptions({
          validation: { acceptedExtensions: ['.txt'] },
        }),
      )

      const added = uploader.addFiles([createFile('readme.txt')])
      expect(added).toHaveLength(1)
    })

    it('rejects files when maxFiles is reached', () => {
      const onValidationError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: { maxFiles: 2 },
          events: { onValidationError },
        }),
      )

      uploader.addFiles([createFile('a.txt'), createFile('b.txt')])
      expect(uploader.getFiles()).toHaveLength(2)

      const added = uploader.addFiles([createFile('c.txt')])
      expect(added).toHaveLength(0)
      expect(onValidationError).toHaveBeenCalled()
    })

    it('supports custom validation', () => {
      const onValidationError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: {
            custom: (file: UploadFile) =>
              file.name.startsWith('bad') ? 'File name is not allowed' : null,
          },
          events: { onValidationError },
        }),
      )

      const added = uploader.addFiles([createFile('bad-file.txt')])
      expect(added).toHaveLength(0)
      expect(onValidationError).toHaveBeenCalled()

      const ok = uploader.addFiles([createFile('good-file.txt')])
      expect(ok).toHaveLength(1)
    })
  })

  describe('event callbacks', () => {
    it('fires onFilesAdded when files are added', () => {
      const onFilesAdded = vi.fn()
      const uploader = provider.createUploader(createOptions({ events: { onFilesAdded } }))

      const added = uploader.addFiles([createFile('test.txt')])
      expect(onFilesAdded).toHaveBeenCalledWith(added)
    })

    it('does not fire onFilesAdded when all files fail validation', () => {
      const onFilesAdded = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          validation: { maxSize: 1 },
          events: { onFilesAdded },
        }),
      )

      uploader.addFiles([createFile('test.txt', 'too large')])
      expect(onFilesAdded).not.toHaveBeenCalled()
    })

    it('fires onFileRemoved when a file is removed', () => {
      const onFileRemoved = vi.fn()
      const uploader = provider.createUploader(createOptions({ events: { onFileRemoved } }))

      const [added] = uploader.addFiles([createFile('test.txt')])
      uploader.removeFile(added.id)
      expect(onFileRemoved).toHaveBeenCalledWith(added)
    })
  })

  describe('upload state', () => {
    it('isUploading returns false initially', () => {
      const uploader = provider.createUploader(createOptions())
      expect(uploader.isUploading()).toBe(false)
    })

    it('getTotalProgress returns 0 with no files', () => {
      const uploader = provider.createUploader(createOptions())
      expect(uploader.getTotalProgress()).toBe(0)
    })

    it('getTotalProgress computes average of file progress', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('a.txt'), createFile('b.txt')])

      const files = uploader.getFiles()
      // Simulate progress by directly mutating (as the real upload would)
      const original0 = uploader.getFile(files[0].id)!
      const original1 = uploader.getFile(files[1].id)!
      original0.progress = 50
      original1.progress = 100
      expect(uploader.getTotalProgress()).toBe(75)
    })
  })

  describe('cancel and retry', () => {
    it('cancelUpload is a no-op for non-uploading files', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])

      uploader.cancelUpload(added.id)
      expect(uploader.getFile(added.id)?.status).toBe('idle')
    })

    it('retry resets an errored file to idle', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])

      // Simulate error state
      const file = uploader.getFile(added.id)!
      file.status = 'error'
      file.error = 'Network error'
      file.progress = 30

      uploader.retry(added.id)
      expect(file.status).toBe('idle')
      expect(file.progress).toBe(0)
      expect(file.error).toBeUndefined()
    })

    it('retry resets a cancelled file to idle', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])

      const file = uploader.getFile(added.id)!
      file.status = 'cancelled'

      uploader.retry(added.id)
      expect(file.status).toBe('idle')
    })

    it('retry is a no-op for non-error/non-cancelled files', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])

      uploader.retry(added.id)
      expect(uploader.getFile(added.id)?.status).toBe('idle')
    })

    it('retryAll resets all errored and cancelled files', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('a.txt'), createFile('b.txt'), createFile('c.txt')])

      const files = uploader.getFiles()
      const f0 = uploader.getFile(files[0].id)!
      const f1 = uploader.getFile(files[1].id)!
      const f2 = uploader.getFile(files[2].id)!
      f0.status = 'error'
      f1.status = 'cancelled'
      f2.status = 'complete'

      uploader.retryAll()
      expect(f0.status).toBe('idle')
      expect(f1.status).toBe('idle')
      expect(f2.status).toBe('complete') // unchanged
    })

    it('cancelAll sets all uploading files to cancelled', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('a.txt'), createFile('b.txt')])

      const files = uploader.getFiles()
      const f0 = uploader.getFile(files[0].id)!
      const f1 = uploader.getFile(files[1].id)!
      f0.status = 'uploading'
      f1.status = 'uploading'

      uploader.cancelAll()
      expect(f0.status).toBe('cancelled')
      expect(f1.status).toBe('cancelled')
    })
  })

  describe('destroy', () => {
    it('clears all files and state', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('a.txt'), createFile('b.txt')])

      uploader.destroy()
      expect(uploader.getFiles()).toHaveLength(0)
      expect(uploader.getTotalProgress()).toBe(0)
    })
  })

  describe('unique file IDs', () => {
    it('generates unique IDs for each file', () => {
      const uploader = provider.createUploader(createOptions())
      uploader.addFiles([createFile('a.txt'), createFile('b.txt'), createFile('c.txt')])

      const ids = uploader.getFiles().map((f) => f.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })

    it('generates IDs starting with "fp-"', () => {
      const uploader = provider.createUploader(createOptions())
      const [added] = uploader.addFiles([createFile('test.txt')])
      expect(added.id).toMatch(/^fp-/)
    })
  })

  describe('upload with fetch fallback', () => {
    it('upload() transitions idle files via processQueue', async () => {
      // Mock fetch to simulate a successful upload
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ id: 'uploaded-123' })),
      })
      vi.stubGlobal('fetch', mockFetch)

      const onComplete = vi.fn()
      const onAllComplete = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          events: { onComplete, onAllComplete },
        }),
      )

      uploader.addFiles([createFile('test.txt')])
      uploader.upload()

      // Wait for async upload to complete
      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })

      const file = uploader.getFiles()[0]
      expect(file.status).toBe('complete')
      expect(file.result).toBeDefined()
      expect(onAllComplete).toHaveBeenCalled()

      vi.unstubAllGlobals()
    })

    it('handles upload failure via fetch', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server Error'),
      })
      vi.stubGlobal('fetch', mockFetch)

      const onError = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          events: { onError },
        }),
      )

      uploader.addFiles([createFile('test.txt')])
      uploader.upload()

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalled()
      })

      const file = uploader.getFiles()[0]
      expect(file.status).toBe('error')
      expect(file.error).toContain('500')

      vi.unstubAllGlobals()
    })

    it('respects concurrency limit', async () => {
      let activeRequests = 0
      let maxActive = 0

      const mockFetch = vi.fn().mockImplementation(() => {
        activeRequests++
        maxActive = Math.max(maxActive, activeRequests)
        return new Promise((resolve) => {
          setTimeout(() => {
            activeRequests--
            resolve({
              ok: true,
              text: () => Promise.resolve('"ok"'),
            })
          }, 50)
        })
      })
      vi.stubGlobal('fetch', mockFetch)

      const onAllComplete = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          maxConcurrent: 2,
          events: { onAllComplete },
        }),
      )

      uploader.addFiles([
        createFile('a.txt'),
        createFile('b.txt'),
        createFile('c.txt'),
        createFile('d.txt'),
      ])
      uploader.upload()

      await vi.waitFor(() => {
        expect(onAllComplete).toHaveBeenCalled()
      })

      expect(maxActive).toBeLessThanOrEqual(2)
      expect(mockFetch).toHaveBeenCalledTimes(4)

      vi.unstubAllGlobals()
    })

    it('auto-uploads when autoUpload is enabled', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('"ok"'),
      })
      vi.stubGlobal('fetch', mockFetch)

      const onComplete = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          autoUpload: true,
          events: { onComplete },
        }),
      )

      uploader.addFiles([createFile('auto.txt')])

      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })

      vi.unstubAllGlobals()
    })

    it('sends correct request parameters', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('"ok"'),
      })
      vi.stubGlobal('fetch', mockFetch)

      const onComplete = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          destination: {
            url: '/custom/upload',
            method: 'PUT',
            headers: { Authorization: 'Bearer token' },
            fieldName: 'document',
            additionalData: { folder: 'docs' },
          },
          events: { onComplete },
        }),
      )

      uploader.addFiles([createFile('test.txt')])
      uploader.upload()

      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })

      expect(mockFetch).toHaveBeenCalledWith(
        '/custom/upload',
        expect.objectContaining({
          method: 'PUT',
          headers: { Authorization: 'Bearer token' },
        }),
      )

      // Check FormData contents
      const callArgs = mockFetch.mock.calls[0]
      const formData = callArgs[1].body as FormData
      expect(formData.get('document')).toBeTruthy()
      expect(formData.get('folder')).toBe('docs')

      vi.unstubAllGlobals()
    })

    it('uses parseResponse to extract result', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ data: { fileId: 'xyz' } })),
      })
      vi.stubGlobal('fetch', mockFetch)

      const onComplete = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          destination: {
            url: '/api/upload',
            parseResponse: (res) => (res as { data: { fileId: string } }).data.fileId,
          },
          events: { onComplete },
        }),
      )

      uploader.addFiles([createFile('test.txt')])
      uploader.upload()

      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })

      const file = uploader.getFiles()[0]
      expect(file.result).toBe('xyz')

      vi.unstubAllGlobals()
    })

    it('fires onProgress during upload', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('"ok"'),
      })
      vi.stubGlobal('fetch', mockFetch)

      const onComplete = vi.fn()
      const uploader = provider.createUploader(
        createOptions({
          events: { onComplete },
        }),
      )

      uploader.addFiles([createFile('test.txt')])
      uploader.upload()

      await vi.waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })

      // With fetch fallback, no progress events are fired (no upload.onprogress)
      // but the file should reach 100% on complete
      const file = uploader.getFiles()[0]
      expect(file.progress).toBe(100)

      vi.unstubAllGlobals()
    })
  })
})
