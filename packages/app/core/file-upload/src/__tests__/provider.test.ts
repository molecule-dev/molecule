import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createUploader, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  FileUploadInstance,
  FileUploadOptions,
  FileUploadProvider,
  UploadFile,
} from '../types.js'

/** Creates a minimal mock FileUploadInstance. */
function createMockInstance(options: FileUploadOptions): FileUploadInstance {
  const files: UploadFile[] = []
  let uploading = false

  return {
    addFiles(incoming: File[]): UploadFile[] {
      const added: UploadFile[] = incoming.map((f, i) => ({
        id: `file-${files.length + i}`,
        name: f.name,
        size: f.size,
        type: f.type,
        status: 'idle' as const,
        progress: 0,
        source: f,
      }))
      files.push(...added)
      if (options.events?.onFilesAdded) {
        options.events.onFilesAdded(added)
      }
      return added
    },
    removeFile(fileId: string): void {
      const idx = files.findIndex((f) => f.id === fileId)
      if (idx !== -1) {
        const [removed] = files.splice(idx, 1)
        if (options.events?.onFileRemoved) {
          options.events.onFileRemoved(removed)
        }
      }
    },
    clearFiles(): void {
      files.length = 0
    },
    getFiles(): UploadFile[] {
      return [...files]
    },
    getFile(fileId: string): UploadFile | undefined {
      return files.find((f) => f.id === fileId)
    },
    upload(): void {
      uploading = true
      for (const file of files) {
        if (file.status === 'idle') {
          file.status = 'uploading'
        }
      }
    },
    cancelUpload(fileId: string): void {
      const file = files.find((f) => f.id === fileId)
      if (file && file.status === 'uploading') {
        file.status = 'cancelled'
      }
    },
    cancelAll(): void {
      for (const file of files) {
        if (file.status === 'uploading') {
          file.status = 'cancelled'
        }
      }
      uploading = false
    },
    retry(fileId: string): void {
      const file = files.find((f) => f.id === fileId)
      if (file && (file.status === 'error' || file.status === 'cancelled')) {
        file.status = 'idle'
        file.progress = 0
        file.error = undefined
      }
    },
    retryAll(): void {
      for (const file of files) {
        if (file.status === 'error' || file.status === 'cancelled') {
          file.status = 'idle'
          file.progress = 0
          file.error = undefined
        }
      }
    },
    isUploading(): boolean {
      return uploading
    },
    getTotalProgress(): number {
      if (files.length === 0) return 0
      const total = files.reduce((sum, f) => sum + f.progress, 0)
      return total / files.length
    },
    destroy: vi.fn(),
  }
}

/** Creates a mock FileUploadProvider. */
function createMockProvider(): FileUploadProvider {
  return {
    createUploader: (options: FileUploadOptions) => createMockInstance(options),
  }
}

describe('FileUpload provider', () => {
  beforeEach(() => {
    unbond('file-upload')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-file-upload')
    })
  })

  describe('createUploader', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createUploader')
      setProvider(mock)

      const options: FileUploadOptions = {
        destination: { url: '/api/upload' },
      }

      const uploader = createUploader(options)
      expect(spy).toHaveBeenCalledWith(options)
      expect(uploader.getFiles()).toEqual([])
    })

    it('throws when no provider is bonded', () => {
      expect(() =>
        createUploader({
          destination: { url: '/api/upload' },
        }),
      ).toThrow('@molecule/app-file-upload')
    })
  })
})

describe('FileUploadInstance (mock conformance)', () => {
  let uploader: FileUploadInstance
  let onFilesAdded: (files: UploadFile[]) => void
  let onFileRemoved: (file: UploadFile) => void

  beforeEach(() => {
    unbond('file-upload')
    onFilesAdded = vi.fn()
    onFileRemoved = vi.fn()

    setProvider(createMockProvider())
    uploader = createUploader({
      destination: { url: '/api/upload' },
      events: {
        onFilesAdded,
        onFileRemoved,
      },
    })
  })

  it('starts with empty file list', () => {
    expect(uploader.getFiles()).toEqual([])
  })

  it('addFiles adds files to the queue and fires onFilesAdded', () => {
    const file = new File(['hello'], 'test.txt', { type: 'text/plain' })
    const added = uploader.addFiles([file])

    expect(added).toHaveLength(1)
    expect(added[0].name).toBe('test.txt')
    expect(added[0].status).toBe('idle')
    expect(added[0].progress).toBe(0)
    expect(uploader.getFiles()).toHaveLength(1)
    expect(onFilesAdded).toHaveBeenCalledWith(added)
  })

  it('getFile returns a file by ID', () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' })
    const [added] = uploader.addFiles([file])

    expect(uploader.getFile(added.id)).toBe(added)
    expect(uploader.getFile('nonexistent')).toBeUndefined()
  })

  it('removeFile removes a file and fires onFileRemoved', () => {
    const file = new File(['data'], 'remove-me.txt', { type: 'text/plain' })
    const [added] = uploader.addFiles([file])

    uploader.removeFile(added.id)
    expect(uploader.getFiles()).toHaveLength(0)
    expect(onFileRemoved).toHaveBeenCalledWith(added)
  })

  it('clearFiles removes all files', () => {
    uploader.addFiles([
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
    ])
    expect(uploader.getFiles()).toHaveLength(2)

    uploader.clearFiles()
    expect(uploader.getFiles()).toHaveLength(0)
  })

  it('upload starts uploading idle files', () => {
    uploader.addFiles([new File(['data'], 'file.txt', { type: 'text/plain' })])
    expect(uploader.isUploading()).toBe(false)

    uploader.upload()
    expect(uploader.isUploading()).toBe(true)
    expect(uploader.getFiles()[0].status).toBe('uploading')
  })

  it('cancelUpload cancels a specific uploading file', () => {
    uploader.addFiles([new File(['data'], 'file.txt', { type: 'text/plain' })])
    uploader.upload()

    const fileId = uploader.getFiles()[0].id
    uploader.cancelUpload(fileId)
    expect(uploader.getFiles()[0].status).toBe('cancelled')
  })

  it('cancelAll cancels all uploading files', () => {
    uploader.addFiles([
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
    ])
    uploader.upload()
    uploader.cancelAll()

    for (const file of uploader.getFiles()) {
      expect(file.status).toBe('cancelled')
    }
    expect(uploader.isUploading()).toBe(false)
  })

  it('retry resets a failed file to idle', () => {
    uploader.addFiles([new File(['data'], 'file.txt', { type: 'text/plain' })])
    const files = uploader.getFiles()
    files[0].status = 'error'
    files[0].error = 'Network error'

    uploader.retry(files[0].id)
    expect(files[0].status).toBe('idle')
    expect(files[0].error).toBeUndefined()
    expect(files[0].progress).toBe(0)
  })

  it('retryAll resets all failed files to idle', () => {
    uploader.addFiles([
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
    ])
    const files = uploader.getFiles()
    files[0].status = 'error'
    files[1].status = 'cancelled'

    uploader.retryAll()
    expect(files[0].status).toBe('idle')
    expect(files[1].status).toBe('idle')
  })

  it('getTotalProgress returns 0 when no files', () => {
    expect(uploader.getTotalProgress()).toBe(0)
  })

  it('getTotalProgress computes average progress', () => {
    uploader.addFiles([
      new File(['a'], 'a.txt', { type: 'text/plain' }),
      new File(['b'], 'b.txt', { type: 'text/plain' }),
    ])
    const files = uploader.getFiles()
    files[0].progress = 50
    files[1].progress = 100

    expect(uploader.getTotalProgress()).toBe(75)
  })

  it('destroy is callable', () => {
    expect(() => uploader.destroy()).not.toThrow()
  })
})
