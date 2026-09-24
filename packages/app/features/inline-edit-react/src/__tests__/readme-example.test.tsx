// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only `fetch` (the API) is stubbed.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { patch } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { InlineEdit } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.dealId - The deal to rename.
 * @param props.initialTitle - The deal's current title.
 * @returns The editable deal title.
 */
function DealTitle({
  dealId,
  initialTitle,
}: {
  dealId: string
  initialTitle: string
}): React.JSX.Element {
  const [title, setTitle] = useState(initialTitle)
  const [error, setError] = useState<string | null>(null)

  /**
   * Persists the new title.
   *
   * @param next - The submitted title.
   */
  async function save(next: string): Promise<void> {
    setError(null)
    try {
      await patch(`/deals/${dealId}`, { title: next })
      setTitle(next)
    } catch (err) {
      // Don't rethrow: InlineEdit never catches it (unhandled rejection). The editor
      // closes showing the unchanged title, and the error explains why.
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <>
      <InlineEdit value={title} onSubmit={save} placeholder="Deal title" />
      {error && <p role="alert">{error}</p>}
    </>
  )
}

/**
 * Renders the example, opens the editor and types a new title.
 *
 * @returns The testing-library render result.
 */
function renderAndEdit(): ReturnType<typeof render> {
  const view = render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <DealTitle dealId="d_42" initialTitle="Acme renewal" />
    </I18nProvider>,
  )
  fireEvent.click(view.getByRole('button', { name: 'Acme renewal' }))
  fireEvent.change(view.getByLabelText('Deal title'), { target: { value: 'Acme renewal 2027' } })
  return view
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('PATCHes the new title on Save and shows it once saved', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({}))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderAndEdit()
    fireEvent.click(view.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(view.getByRole('button', { name: 'Acme renewal 2027' })).toBeTruthy(),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/deals/d_42')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('PATCH')
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe('{"title":"Acme renewal 2027"}')
    expect(view.queryByRole('alert')).toBeNull()
  })

  it('keeps the old title and shows the error when the save fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )
    const view = renderAndEdit()
    fireEvent.click(view.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(view.getByRole('alert').textContent).toContain('500'))
    expect(view.getByRole('button', { name: 'Acme renewal' })).toBeTruthy()
  })
})
