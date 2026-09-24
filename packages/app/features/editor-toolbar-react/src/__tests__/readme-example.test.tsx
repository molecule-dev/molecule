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

import { post, put } from '@molecule/app-http'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { EditorToolbar } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered toolbar.
 */
function PostEditorToolbar(): React.JSX.Element {
  const cm = getClassMap()
  const draft = { id: 'post-1', title: 'My Blog Post', body: 'Hello world' }
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [busy, setBusy] = useState(false)
  /**
   * Runs an action while marking the toolbar busy.
   *
   * @param action - The async action.
   */
  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }
  const save = (): Promise<void> =>
    run(() => put(`/posts/${draft.id}`, { title: draft.title, body: draft.body }))
  const publish = (): Promise<void> =>
    run(async () => {
      await post(`/posts/${draft.id}/publish`)
      setStatus('published')
    })
  return (
    <EditorToolbar
      title={draft.title}
      badge={<span>{status === 'draft' ? 'Draft' : 'Published'}</span>}
      className={cm.surface}
      primaryActions={[
        {
          id: 'save',
          label: 'Save',
          onClick: () => void save(),
          variant: 'outline',
          disabled: busy,
        },
        {
          id: 'publish',
          label: 'Publish',
          onClick: () => void publish(),
          variant: 'solid',
          color: 'primary',
          disabled: busy || status === 'published',
        },
      ]}
    />
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

  it('saves with PUT, publishes with POST and flips the badge', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<PostEditorToolbar />)
    expect(view.getByRole('heading', { level: 1, name: 'My Blog Post' })).toBeTruthy()
    expect(view.getByText('Draft')).toBeTruthy()
    expect(view.container.firstElementChild?.className).toContain(classMap.surface)

    fireEvent.click(view.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/posts/post-1')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PUT')
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      title: 'My Blog Post',
      body: 'Hello world',
    })

    await waitFor(() =>
      expect((view.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    )
    fireEvent.click(view.getByRole('button', { name: 'Publish' }))
    await waitFor(() => expect(view.getByText('Published')).toBeTruthy())
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/posts/post-1/publish')
    expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('POST')
    expect((view.getByRole('button', { name: 'Publish' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
