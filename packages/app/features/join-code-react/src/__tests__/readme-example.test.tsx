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

import { JoinCode } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered join-room page.
 */
function JoinRoomPage(): React.JSX.Element {
  const [code, setCode] = useState('')
  /**
   * Posts the completed code to the API.
   *
   * @param complete - The full code.
   */
  async function joinRoom(complete: string): Promise<void> {
    await post('/rooms/join', { code: complete })
  }
  return (
    <JoinCode
      length={6}
      alphabet="alphanumeric"
      value={code}
      onChange={setCode}
      onComplete={(complete) => void joinRoom(complete)}
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

  it('posts the upper-cased code once all six slots are filled', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <JoinRoomPage />
      </I18nProvider>,
    )
    const slots = view.getAllByRole('textbox') as HTMLInputElement[]
    expect(slots).toHaveLength(6)
    expect(view.getByRole('group', { name: 'Join code' })).toBeTruthy()

    const first = view.getByLabelText('Join code character 1')
    fireEvent.change(first, { target: { value: 'ab12c' } })
    expect(slots.map((s) => s.value).join('')).toBe('AB12C')
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.change(view.getByLabelText('Join code character 6'), { target: { value: 'd' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/rooms/join')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ code: 'AB12CD' })
  })
})
