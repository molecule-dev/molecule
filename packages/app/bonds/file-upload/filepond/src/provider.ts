/**
 * FilePond-style implementation of the molecule FileUploadProvider.
 *
 * Provides a headless file upload engine with validation, progress tracking,
 * concurrency control, and image preview generation following FilePond's
 * patterns and server protocol.
 *
 * @module
 */

import type {
  FileUploadInstance,
  FileUploadOptions,
  FileUploadProvider,
  FileValidation,
  UploadDestination,
  UploadFile,
} from '@molecule/app-file-upload'

import type { FilepondConfig } from './types.js'

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

let idCounter = 0

/**
 * Generates a unique file ID.
 *
 * @returns A unique string identifier.
 */
function generateId(): string {
  idCounter += 1
  return `fp-${Date.now()}-${idCounter}`
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validates a file against the provided validation rules.
 *
 * @param file - The upload file to validate.
 * @param validation - The validation constraints.
 * @param currentFileCount - Current number of files already in the queue.
 * @returns An array of error messages (empty if valid).
 */
function validateFile(
  file: UploadFile,
  validation: FileValidation | undefined,
  currentFileCount: number,
): string[] {
  if (!validation) return []

  const errors: string[] = []

  if (validation.maxSize !== undefined && file.size > validation.maxSize) {
    errors.push(`File exceeds maximum size of ${validation.maxSize} bytes`)
  }

  if (validation.minSize !== undefined && file.size < validation.minSize) {
    errors.push(`File is below minimum size of ${validation.minSize} bytes`)
  }

  if (validation.acceptedTypes?.length) {
    const accepted = validation.acceptedTypes.some((type) => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1))
      }
      return file.type === type
    })
    if (!accepted) {
      errors.push(`File type "${file.type}" is not accepted`)
    }
  }

  if (validation.acceptedExtensions?.length) {
    const dotIdx = file.name.lastIndexOf('.')
    const ext = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase() : ''
    if (!validation.acceptedExtensions.includes(ext)) {
      errors.push(`File extension "${ext}" is not accepted`)
    }
  }

  if (validation.maxFiles !== undefined && currentFileCount >= validation.maxFiles) {
    errors.push(`Maximum number of files (${validation.maxFiles}) reached`)
  }

  if (validation.custom) {
    const customError = validation.custom(file)
    if (customError) {
      errors.push(customError)
    }
  }

  return errors
}

// ---------------------------------------------------------------------------
// Upload transport
// ---------------------------------------------------------------------------

/** Handle returned from an upload transport to allow cancellation. */
interface UploadHandle {
  /** Promise that resolves with the server response on success. */
  promise: Promise<unknown>
  /** Aborts the in-progress upload. */
  abort: () => void
}

/**
 * Uploads a single file using XMLHttpRequest (browser) with progress events,
 * falling back to fetch when XMLHttpRequest is unavailable (Node/SSR).
 *
 * @param source - The File object to upload.
 * @param destination - Upload destination configuration.
 * @param onProgress - Progress callback receiving loaded and total bytes.
 * @param timeout - Request timeout in milliseconds.
 * @returns An UploadHandle with promise and abort.
 */
function uploadTransport(
  source: File,
  destination: UploadDestination,
  onProgress: (loaded: number, total: number) => void,
  timeout: number,
): UploadHandle {
  const method = destination.method ?? 'POST'
  const fieldName = destination.fieldName ?? 'file'

  const formData = new FormData()
  formData.append(fieldName, source)

  if (destination.additionalData) {
    for (const [key, value] of Object.entries(destination.additionalData)) {
      formData.append(key, value)
    }
  }

  // Use XMLHttpRequest when available (browser) for progress events
  if (typeof XMLHttpRequest !== 'undefined') {
    return uploadWithXHR(
      destination.url,
      method,
      formData,
      destination.headers,
      onProgress,
      timeout,
    )
  }

  // Fallback to fetch (Node/SSR) — no upload progress events
  return uploadWithFetch(destination.url, method, formData, destination.headers, timeout)
}

/**
 * Uploads using XMLHttpRequest with upload progress events.
 *
 * @param url - Target URL.
 * @param method - HTTP method.
 * @param body - Form data body.
 * @param headers - Optional headers.
 * @param onProgress - Progress callback.
 * @param timeout - Request timeout.
 * @returns An UploadHandle.
 */
function uploadWithXHR(
  url: string,
  method: string,
  body: FormData,
  headers: Record<string, string> | undefined,
  onProgress: (loaded: number, total: number) => void,
  timeout: number,
): UploadHandle {
  const xhr = new XMLHttpRequest()

  const promise = new Promise<unknown>((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(e.loaded, e.total)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          resolve(xhr.responseText)
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to a network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'))
    })

    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out'))
    })

    xhr.open(method, url)
    xhr.timeout = timeout

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value)
      }
    }

    xhr.send(body)
  })

  return { promise, abort: () => xhr.abort() }
}

/**
 * Uploads using fetch (no upload progress events).
 *
 * @param url - Target URL.
 * @param method - HTTP method.
 * @param body - Form data body.
 * @param headers - Optional headers.
 * @param timeout - Request timeout.
 * @returns An UploadHandle.
 */
function uploadWithFetch(
  url: string,
  method: string,
  body: FormData,
  headers: Record<string, string> | undefined,
  timeout: number,
): UploadHandle {
  const controller = new AbortController()

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  if (timeout > 0) {
    timeoutId = setTimeout(() => controller.abort(), timeout)
  }

  const promise = fetch(url, {
    method,
    body,
    headers,
    signal: controller.signal,
  })
    .then(async (res) => {
      if (timeoutId) clearTimeout(timeoutId)
      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`)
      }
      const text = await res.text()
      try {
        return JSON.parse(text)
      } catch {
        return text
      }
    })
    .catch((err: unknown) => {
      if (timeoutId) clearTimeout(timeoutId)
      throw err
    })

  return {
    promise,
    abort: () => {
      if (timeoutId) clearTimeout(timeoutId)
      controller.abort()
    },
  }
}

// ---------------------------------------------------------------------------
// Image preview
// ---------------------------------------------------------------------------

/**
 * Generates a data URL preview for an image file.
 *
 * @param file - The File object.
 * @param maxSize - Maximum width/height in pixels.
 * @returns A promise resolving to the data URL string, or undefined.
 */
async function generatePreview(file: File, maxSize: number): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) return undefined
  if (typeof FileReader === 'undefined') return undefined

  return new Promise<string | undefined>((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      const dataUrl = reader.result as string

      // If no canvas available (Node), return the raw data URL
      if (typeof document === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
        resolve(dataUrl)
        return
      }

      // Resize using canvas in browser environments
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL(file.type))
        } else {
          resolve(dataUrl)
        }
      }
      img.onerror = () => resolve(undefined)
      img.src = dataUrl
    }

    reader.onerror = () => resolve(undefined)
    reader.readAsDataURL(file)
  })
}

// ---------------------------------------------------------------------------
// Upload instance
// ---------------------------------------------------------------------------

/**
 * Creates a FileUploadInstance backed by FilePond-style processing.
 *
 * @param options - Upload configuration including destination, validation, and events.
 * @param config - Optional FilePond-specific settings.
 * @returns A FileUploadInstance for managing queued files and uploads.
 */
function createUploaderInstance(
  options: FileUploadOptions,
  config: FilepondConfig = {},
): FileUploadInstance {
  const files: UploadFile[] = []
  const activeUploads = new Map<string, UploadHandle>()
  const events = options.events ?? {}
  const maxConcurrent = options.maxConcurrent ?? 3
  const allowMultiple = options.multiple ?? true
  const timeout = config.timeout ?? 0

  /**
   * Processes the upload queue, starting uploads up to the concurrency limit.
   */
  function processQueue(): void {
    const activeCount = activeUploads.size
    const idleFiles = files.filter((f) => f.status === 'idle')
    const slotsAvailable = maxConcurrent - activeCount

    for (let i = 0; i < Math.min(slotsAvailable, idleFiles.length); i++) {
      startUpload(idleFiles[i])
    }
  }

  /**
   * Starts uploading a single file.
   *
   * @param file - The UploadFile record to upload.
   */
  function startUpload(file: UploadFile): void {
    if (!file.source) {
      Object.assign(file, { status: 'error' as const, error: 'No source file available' })
      events.onError?.(file, 'No source file available')
      checkAllComplete()
      return
    }

    Object.assign(file, { status: 'uploading' as const, progress: 0 })

    const handle = uploadTransport(
      file.source,
      options.destination,
      (loaded, total) => {
        const progress = Math.round((loaded / total) * 100)
        file.progress = progress
        events.onProgress?.(file, progress)
      },
      timeout,
    )

    activeUploads.set(file.id, handle)

    handle.promise
      .then((response) => {
        activeUploads.delete(file.id)
        const result = options.destination.parseResponse
          ? options.destination.parseResponse(response)
          : typeof response === 'string'
            ? response
            : JSON.stringify(response)
        Object.assign(file, { status: 'complete' as const, progress: 100, result })
        events.onComplete?.(file)
        processQueue()
        checkAllComplete()
      })
      .catch((err: Error) => {
        activeUploads.delete(file.id)
        if (file.status === 'cancelled') {
          processQueue()
          checkAllComplete()
          return
        }
        const errorMsg = err.message || 'Upload failed'
        Object.assign(file, { status: 'error' as const, error: errorMsg })
        events.onError?.(file, errorMsg)
        processQueue()
        checkAllComplete()
      })
  }

  /**
   * Checks if all files have been processed and fires onAllComplete if so.
   */
  function checkAllComplete(): void {
    const pending = files.some(
      (f) => f.status === 'idle' || f.status === 'uploading' || f.status === 'preparing',
    )
    if (!pending && files.length > 0) {
      events.onAllComplete?.([...files])
    }
  }

  // -------------------------------------------------------------------------
  // Instance
  // -------------------------------------------------------------------------

  const instance: FileUploadInstance = {
    addFiles(incoming: File[]): UploadFile[] {
      const toProcess = allowMultiple ? incoming : incoming.slice(0, 1)
      const added: UploadFile[] = []

      for (const source of toProcess) {
        const uploadFile: UploadFile = {
          id: generateId(),
          name: source.name,
          size: source.size,
          type: source.type,
          status: 'idle',
          progress: 0,
          source,
        }

        const errors = validateFile(uploadFile, options.validation, files.length)
        if (errors.length > 0) {
          events.onValidationError?.(uploadFile, errors)
          continue
        }

        files.push(uploadFile)
        added.push(uploadFile)

        // Generate preview asynchronously if enabled
        if (options.imagePreview && source.type.startsWith('image/')) {
          const maxSize = options.imagePreviewMaxSize ?? 200
          void generatePreview(source, maxSize).then((preview) => {
            if (preview) {
              uploadFile.preview = preview
            }
          })
        }
      }

      if (added.length > 0) {
        events.onFilesAdded?.(added)

        if (options.autoUpload) {
          processQueue()
        }
      }

      return added
    },

    removeFile(fileId: string): void {
      const idx = files.findIndex((f) => f.id === fileId)
      if (idx === -1) return

      const file = files[idx]

      // Cancel if actively uploading
      const handle = activeUploads.get(fileId)
      if (handle) {
        handle.abort()
        activeUploads.delete(fileId)
      }

      files.splice(idx, 1)
      events.onFileRemoved?.(file)
    },

    clearFiles(): void {
      for (const [id, handle] of activeUploads) {
        handle.abort()
        activeUploads.delete(id)
      }
      files.length = 0
    },

    getFiles(): UploadFile[] {
      return [...files]
    },

    getFile(fileId: string): UploadFile | undefined {
      return files.find((f) => f.id === fileId)
    },

    upload(): void {
      processQueue()
    },

    cancelUpload(fileId: string): void {
      const file = files.find((f) => f.id === fileId)
      if (!file || file.status !== 'uploading') return

      const handle = activeUploads.get(fileId)
      if (handle) {
        handle.abort()
        activeUploads.delete(fileId)
      }
      file.status = 'cancelled'
    },

    cancelAll(): void {
      for (const file of files) {
        if (file.status === 'uploading') {
          const handle = activeUploads.get(file.id)
          if (handle) {
            handle.abort()
            activeUploads.delete(file.id)
          }
          file.status = 'cancelled'
        }
      }
    },

    retry(fileId: string): void {
      const file = files.find((f) => f.id === fileId)
      if (!file || (file.status !== 'error' && file.status !== 'cancelled')) return

      Object.assign(file, { status: 'idle' as const, progress: 0, error: undefined })

      if (options.autoUpload) {
        processQueue()
      }
    },

    retryAll(): void {
      for (const file of files) {
        if (file.status === 'error' || file.status === 'cancelled') {
          Object.assign(file, { status: 'idle' as const, progress: 0, error: undefined })
        }
      }

      if (options.autoUpload) {
        processQueue()
      }
    },

    isUploading(): boolean {
      return files.some((f) => f.status === 'uploading')
    },

    getTotalProgress(): number {
      if (files.length === 0) return 0
      const total = files.reduce((sum, f) => sum + f.progress, 0)
      return Math.round(total / files.length)
    },

    destroy(): void {
      for (const [, handle] of activeUploads) {
        handle.abort()
      }
      activeUploads.clear()
      files.length = 0
    },
  }

  return instance
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Creates a FilePond-style file upload provider.
 *
 * @param config - Optional FilePond-specific configuration.
 * @returns A `FileUploadProvider` backed by FilePond-style processing.
 *
 * @example
 * ```typescript
 * import { createFilepondProvider } from '@molecule/app-file-upload-filepond'
 * import { setProvider } from '@molecule/app-file-upload'
 *
 * setProvider(createFilepondProvider())
 * ```
 */
export function createFilepondProvider(config: FilepondConfig = {}): FileUploadProvider {
  return {
    createUploader(options: FileUploadOptions): FileUploadInstance {
      return createUploaderInstance(options, config)
    },
  }
}

/** Default FilePond file upload provider instance. */
export const provider: FileUploadProvider = createFilepondProvider()
