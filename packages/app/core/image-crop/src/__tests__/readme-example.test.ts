// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the Cropper.js bond. jsdom has
 * no canvas and never fires image `load`, so `cropperjs` itself is mocked (as
 * the bond's own tests do), and the upload's `fetch` is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const cropperjs = vi.hoisted(() => {
  const avatarBlob = new Blob(['png-bytes'], { type: 'image/png' })
  const canvas = {
    toBlob: vi.fn((callback: (blob: Blob | null) => void) => callback(avatarBlob)),
  }
  const instance = {
    getCroppedCanvas: vi.fn(() => canvas),
    setData: vi.fn(),
    destroy: vi.fn(),
  }
  const Cropper = vi.fn(function () {
    return instance
  })
  return { Cropper, instance, canvas }
})

vi.mock('cropperjs', () => ({ default: cropperjs.Cropper }))

import { post } from '@molecule/app-http'
import { provider } from '@molecule/app-image-crop-cropperjs'

import { requireProvider, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('crops through the bonded Cropper.js provider and uploads the PNG', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => {
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(provider)
    const cropper = requireProvider().createCropper({ src: '/photos/avatar.jpg', aspectRatio: 1 })
    const [image, options] = cropperjs.Cropper.mock.calls[0] as unknown as [
      HTMLImageElement,
      { aspectRatio: number },
    ]
    expect(image.getAttribute('src')).toBe('/photos/avatar.jpg')
    expect(options.aspectRatio).toBe(1)

    const region = { x: 120, y: 40, width: 400, height: 400, rotate: 0, scaleX: 1, scaleY: 1 }
    cropper.setCropData(region)
    const canvas = cropper.getCroppedCanvas({ width: 256, height: 256, fillColor: '#ffffff' })
    cropper.destroy()

    expect(cropperjs.instance.setData).toHaveBeenCalledWith(region)
    expect(cropperjs.instance.getCroppedCanvas).toHaveBeenCalledWith({
      width: 256,
      height: 256,
      fillColor: '#ffffff',
    })
    expect(cropperjs.instance.destroy).toHaveBeenCalledTimes(1)

    let uploaded: Promise<void> = Promise.resolve()
    canvas.toBlob((blob) => {
      if (!blob) return
      const body = new FormData()
      body.append('file', blob, 'avatar.png')
      uploaded = post('/users/me/avatar', body).then(() => undefined)
    }, 'image/png')
    await uploaded

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/users/me/avatar')
    const file = (init?.body as FormData).get('file')
    expect(file).toBeInstanceOf(Blob)
    expect((file as File).name).toBe('avatar.png')
  })
})
