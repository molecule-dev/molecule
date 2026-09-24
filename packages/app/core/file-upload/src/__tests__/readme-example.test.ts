/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the FilePond bond with the
 * network (`fetch`) stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provider } from '@molecule/app-file-upload-filepond'

import { createUploader, setProvider } from '../index.js'

describe('README @example', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('validates, auto-uploads one multipart request per file and reports the result', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => {
      return new Response(JSON.stringify({ id: 'upl_42' }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    setProvider(provider)

    const sessionToken = 'session-token'
    const onValidationError = vi.fn()
    const onComplete = vi.fn()
    const uploader = createUploader({
      destination: {
        url: '/api/uploads',
        headers: { Authorization: `Bearer ${sessionToken}` },
        parseResponse: (response) => (response as { id: string }).id,
      },
      validation: { maxSize: 10 * 1024 * 1024, acceptedTypes: ['image/*'] },
      autoUpload: true,
      events: { onValidationError, onComplete },
    })

    const photo = new File([new Uint8Array(1024)], 'photo.png', { type: 'image/png' })
    const notes = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    const queued = uploader.addFiles([photo, notes])

    expect(queued.map((file) => file.name)).toEqual(['photo.png'])
    expect(onValidationError).toHaveBeenCalledWith(expect.objectContaining({ name: 'notes.txt' }), [
      'File type "text/plain" is not accepted',
    ])

    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'photo.png', status: 'complete', result: 'upl_42' }),
    )

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/uploads')
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ Authorization: 'Bearer session-token' })
    expect((init?.body as FormData).get('file')).toBeInstanceOf(File)
  })
})
