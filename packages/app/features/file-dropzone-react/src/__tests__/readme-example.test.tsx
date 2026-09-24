// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { FileDropzone } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered avatar uploader.
 */
function AvatarUpload(): React.JSX.Element {
  const [status, setStatus] = useState('')
  /**
   * Uploads the first file as multipart form data.
   *
   * @param files - Accepted files.
   */
  async function upload(files: File[]): Promise<void> {
    const body = new FormData()
    body.append('file', files[0])
    setStatus(`Uploading ${files[0].name}…`)
    await post('/uploads', body) // FormData is sent as multipart, not JSON
    setStatus(`Uploaded ${files[0].name}`)
  }
  return (
    <>
      <FileDropzone
        accept="image/*"
        maxSize={5 * 1024 * 1024}
        onFiles={(files) => void upload(files)}
        onRejected={(files) =>
          setStatus(`${files.map((f) => f.name).join(', ')}: not an image under 5 MB`)
        }
      />
      <p role="status">{status}</p>
    </>
  )
}

/**
 * Renders the example inside the i18n provider it needs.
 *
 * @returns The testing-library render result.
 */
function renderExample(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <AvatarUpload />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('uploads a dropped image as multipart FormData', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderExample()
    expect(view.getByText('Drop files here or click to browse')).toBeTruthy()
    expect(view.getByText('Accepts: image/*')).toBeTruthy()

    const avatar = new File(['png-bytes'], 'me.png', { type: 'image/png' })
    fireEvent.drop(view.getByRole('button'), { dataTransfer: { files: [avatar] } })
    await waitFor(() => expect(view.getByRole('status').textContent).toBe('Uploaded me.png'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/uploads')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    expect((init?.body as FormData).get('file')).toBe(avatar)
  })

  it('rejects a non-image without uploading', () => {
    const fetchMock = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderExample()
    const doc = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })
    fireEvent.drop(view.getByRole('button'), { dataTransfer: { files: [doc] } })
    expect(view.getByRole('status').textContent).toBe('cv.pdf: not an image under 5 MB')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
