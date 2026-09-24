// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only `fetch` (the upload endpoint) and
 * `window.confirm` (a native dialog) are stubbed.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ImageGalleryEditor } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The listing photo editor.
 */
function ListingPhotos(): React.JSX.Element {
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null])
  const [error, setError] = useState<string | null>(null)

  /**
   * Uploads each picked file and returns the persisted URLs.
   *
   * @param files - The picked files.
   * @returns One URL (or `null`) per file.
   */
  async function upload(files: FileList): Promise<(string | null)[]> {
    setError(null)
    return Promise.all(
      Array.from(files).map(async (file) => {
        const form = new FormData()
        form.append('file', file)
        try {
          const res = await post<{ url: string }>('/uploads', form)
          return res.data.url
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err))
          return null // keeps the slot empty
        }
      }),
    )
  }

  return (
    <ImageGalleryEditor
      slots={slots}
      onChange={setSlots}
      onPickFiles={upload}
      maxImages={4}
      counter={`${slots.filter(Boolean).length} / ${slots.length}`}
      statusMessage={error}
    />
  )
}

/**
 * Picks files through the editor's hidden file input.
 *
 * @param container - The rendered container.
 * @param names - The file names to pick.
 */
function pickFiles(container: HTMLElement, names: string[]): void {
  const input = container.querySelector('input[type="file"]')
  if (!input) throw new Error('file input not rendered')
  const files = names.map((name) => new File(['x'], name, { type: 'image/png' }))
  fireEvent.change(input, { target: { files } })
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('uploads picked files into the free slots, then removes one on confirm', async () => {
    let n = 0
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({ url: `https://cdn.example.com/photo-${++n}.png` }),
    )
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    )
    const view = render(<ListingPhotos />)
    expect(view.getByText('0 / 4')).toBeTruthy()

    pickFiles(view.container, ['a.png', 'b.png'])
    await waitFor(() => expect(view.getByText('2 / 4')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/uploads')
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData)
    const srcs = Array.from(view.container.querySelectorAll('img')).map((img) => img.src)
    expect(srcs).toEqual([
      'https://cdn.example.com/photo-1.png',
      'https://cdn.example.com/photo-2.png',
    ])

    const firstImage = view.container.querySelector('img')
    if (firstImage?.parentElement) fireEvent.click(firstImage.parentElement)
    expect(view.getByText('1 / 4')).toBeTruthy()
  })

  it('keeps the slot empty and shows the error when the upload fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )
    const view = render(<ListingPhotos />)
    pickFiles(view.container, ['a.png'])
    await waitFor(() =>
      expect(
        view.container.querySelector('[data-mol-id="image-gallery-editor-status"]')?.textContent,
      ).toContain('500'),
    )
    expect(view.getByText('0 / 4')).toBeTruthy()
    expect(view.container.querySelector('img')).toBeNull()
  })
})
