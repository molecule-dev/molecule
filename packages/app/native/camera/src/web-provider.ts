/**
 * Web-based camera provider using MediaDevices API.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'

import type {
  CameraDirection,
  CameraPermission,
  CameraProvider,
  ImageFormat,
  ImageQuality,
  Photo,
  PhotoOptions,
  PreviewOptions,
  Video,
  VideoOptions,
} from './types.js'

/**
 * Create a web-based camera provider using the MediaDevices API.
 * Supports photo capture, gallery picking, camera preview, and torch control in browsers.
 * @returns A CameraProvider implementation backed by browser APIs.
 */
export const createWebCameraProvider = (): CameraProvider => {
  let currentStream: MediaStream | null = null
  let previewVideo: HTMLVideoElement | null = null
  let currentDirection: CameraDirection = 'rear'
  const getConstraints = (direction: CameraDirection): MediaStreamConstraints => ({
    video: {
      facingMode: direction === 'front' ? 'user' : 'environment',
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
    audio: false,
  })

  const stopStream = (): void => {
    if (currentStream) {
      currentStream.getTracks().forEach((track) => track.stop())
      currentStream = null
    }
  }

  const captureFromVideo = (
    video: HTMLVideoElement,
    options?: { quality?: ImageQuality; width?: number; height?: number; format?: ImageFormat },
  ): Photo => {
    const canvas = document.createElement('canvas')
    const width = options?.width || video.videoWidth
    const height = options?.height || video.videoHeight

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error(
        t('camera.error.canvasContext', undefined, {
          defaultValue: 'Could not get canvas context',
        }),
      )

    // Handle mirror for front camera
    if (currentDirection === 'front') {
      ctx.translate(width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0, width, height)

    const format = options?.format || 'jpeg'
    const quality = (options?.quality || 90) / 100
    const mimeType = `image/${format}`

    const dataUrl = canvas.toDataURL(mimeType, quality)
    const base64 = dataUrl.split(',')[1]

    return {
      base64,
      dataUrl,
      format,
    }
  }

  return {
    async checkPermission(): Promise<CameraPermission> {
      if (!('permissions' in navigator)) {
        return 'prompt'
      }

      try {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
        return result.state as CameraPermission
      } catch {
        return 'prompt'
      }
    },

    async requestPermission(): Promise<CameraPermission> {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach((track) => track.stop())
        return 'granted'
      } catch (error) {
        if (error instanceof Error && error.name === 'NotAllowedError') {
          return 'denied'
        }
        return 'prompt'
      }
    },

    async getPhoto(options?: PhotoOptions): Promise<Photo> {
      const source = options?.source || 'prompt'

      if (source === 'photos') {
        // Use file input for gallery
        return new Promise((resolve, reject) => {
          const input = document.createElement('input')
          input.type = 'file'
          input.accept = 'image/*'

          input.onchange = async () => {
            const file = input.files?.[0]
            if (!file) {
              reject(
                new Error(
                  t('camera.error.noFileSelected', undefined, { defaultValue: 'No file selected' }),
                ),
              )
              return
            }

            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              const base64 = dataUrl.split(',')[1]
              resolve({
                base64,
                dataUrl,
                format: 'jpeg',
              })
            }
            reader.onerror = () =>
              reject(
                new Error(
                  t('camera.error.failedToReadFile', undefined, {
                    defaultValue: 'Failed to read file',
                  }),
                ),
              )
            reader.readAsDataURL(file)
          }

          input.click()
        })
      }

      // Use camera
      const direction = options?.direction || 'rear'
      const stream = await navigator.mediaDevices.getUserMedia(getConstraints(direction))
      currentDirection = direction

      const video = document.createElement('video')
      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      await video.play()

      // Wait for video to be ready
      await new Promise((resolve) => {
        if (video.readyState >= 2) {
          resolve(undefined)
        } else {
          video.onloadeddata = () => resolve(undefined)
        }
      })

      const photo = captureFromVideo(video, options)

      stream.getTracks().forEach((track) => track.stop())

      return photo
    },

    async getVideo(_options?: VideoOptions): Promise<Video> {
      throw new Error(
        t('camera.error.videoNotSupported', undefined, {
          defaultValue: 'Video recording not supported in web provider. Use native provider.',
        }),
      )
    },

    async pickPhotos(
      options?: Omit<PhotoOptions, 'source'> & { limit?: number },
    ): Promise<Photo[]> {
      return new Promise((resolve, reject) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.multiple = (options?.limit || 1) > 1

        input.onchange = async () => {
          const files = Array.from(input.files || [])
          if (files.length === 0) {
            reject(
              new Error(
                t('camera.error.noFilesSelected', undefined, { defaultValue: 'No files selected' }),
              ),
            )
            return
          }

          const photos: Photo[] = []

          for (const file of files.slice(0, options?.limit || files.length)) {
            const photo = await new Promise<Photo>((res, rej) => {
              const reader = new FileReader()
              reader.onload = () => {
                const dataUrl = reader.result as string
                const base64 = dataUrl.split(',')[1]
                res({
                  base64,
                  dataUrl,
                  format: 'jpeg',
                })
              }
              reader.onerror = () =>
                rej(
                  new Error(
                    t('camera.error.failedToReadFile', undefined, {
                      defaultValue: 'Failed to read file',
                    }),
                  ),
                )
              reader.readAsDataURL(file)
            })
            photos.push(photo)
          }

          resolve(photos)
        }

        input.click()
      })
    },

    async startPreview(options: PreviewOptions): Promise<void> {
      stopStream()

      const direction = options.direction || 'rear'
      currentDirection = direction

      currentStream = await navigator.mediaDevices.getUserMedia(getConstraints(direction))

      previewVideo = document.createElement('video')
      previewVideo.srcObject = currentStream
      previewVideo.setAttribute('playsinline', 'true')
      previewVideo.setAttribute('autoplay', 'true')
      previewVideo.style.width = options.width ? `${options.width}px` : '100%'
      previewVideo.style.height = options.height ? `${options.height}px` : 'auto'
      previewVideo.style.objectFit = 'cover'

      if (direction === 'front') {
        previewVideo.style.transform = 'scaleX(-1)'
      }

      if (options.position) {
        previewVideo.style.position = 'absolute'
        previewVideo.style.left = `${options.position.x}px`
        previewVideo.style.top = `${options.position.y}px`
      }

      options.parent.appendChild(previewVideo)
      await previewVideo.play()
    },

    async stopPreview(): Promise<void> {
      stopStream()
      if (previewVideo) {
        previewVideo.remove()
        previewVideo = null
      }
    },

    async capturePreview(options?: { quality?: ImageQuality }): Promise<Photo> {
      if (!previewVideo) {
        throw new Error(
          t('camera.error.previewNotStarted', undefined, { defaultValue: 'Preview not started' }),
        )
      }

      return captureFromVideo(previewVideo, options)
    },

    async flipCamera(): Promise<void> {
      if (!previewVideo || !currentStream) {
        throw new Error(
          t('camera.error.previewNotStarted', undefined, { defaultValue: 'Preview not started' }),
        )
      }

      const parent = previewVideo.parentElement
      if (!parent) {
        throw new Error(
          t('camera.error.previewNoParent', undefined, { defaultValue: 'Preview has no parent' }),
        )
      }

      const newDirection = currentDirection === 'front' ? 'rear' : 'front'
      stopStream()

      currentStream = await navigator.mediaDevices.getUserMedia(getConstraints(newDirection))
      currentDirection = newDirection

      previewVideo.srcObject = currentStream
      previewVideo.style.transform = newDirection === 'front' ? 'scaleX(-1)' : ''
      await previewVideo.play()
    },

    async hasTorch(): Promise<boolean> {
      if (!currentStream) return false

      const track = currentStream.getVideoTracks()[0]
      if (!track) return false

      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean }
      return capabilities?.torch === true
    },

    async toggleTorch(enabled: boolean): Promise<void> {
      if (!currentStream) {
        throw new Error(
          t('camera.error.previewNotStarted', undefined, { defaultValue: 'Preview not started' }),
        )
      }

      const track = currentStream.getVideoTracks()[0]
      if (!track) {
        throw new Error(
          t('camera.error.noVideoTrack', undefined, { defaultValue: 'No video track' }),
        )
      }

      await track.applyConstraints({
        advanced: [{ torch: enabled } as MediaTrackConstraintSet],
      })
    },

    destroy(): void {
      stopStream()
      if (previewVideo) {
        previewVideo.remove()
        previewVideo = null
      }
    },
  }
}
