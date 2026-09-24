/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the REAL
 * `@molecule/app-file-upload` core. Only the network (`fetch`) is stubbed, the
 * same way `provider.test.ts` stubs it (Node has no XMLHttpRequest, so the
 * provider uses its fetch path).
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { UploadFile } from '@molecule/app-file-upload'
import { createUploader, setProvider } from '@molecule/app-file-upload'

import { createFilepondProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uploads the queued image as multipart and resolves with the server id', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ id: 'upl_42' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const onValidationError = vi.fn()
    const onError = vi.fn()

    setProvider(createFilepondProvider({ timeout: 60_000 }))

    const done = new Promise<UploadFile[]>((resolve) => {
      const uploader = createUploader({
        destination: {
          url: '/api/uploads',
          additionalData: { folder: 'avatars' },
          parseResponse: (response) => (response as { id: string }).id,
        },
        validation: { maxSize: 5 * 1024 * 1024, acceptedTypes: ['image/*'] },
        events: {
          onValidationError,
          onError,
          onAllComplete: resolve,
        },
      })
      uploader.addFiles([new File([new Uint8Array(2048)], 'me.png', { type: 'image/png' })])
      uploader.upload()
    })

    const [avatar] = await done
    expect(avatar?.status).toBe('complete')
    expect(avatar?.result).toBe('upl_42')
    expect(onValidationError).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/uploads')
    expect(init?.method).toBe('POST')
    const body = init?.body
    expect(body).toBeInstanceOf(FormData)
    const form = body as FormData
    expect((form.get('file') as File).name).toBe('me.png')
    expect(form.get('folder')).toBe('avatars')
  })
})
