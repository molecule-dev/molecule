// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only `fetch` (the network) is stubbed.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { createFetchClient, HttpError } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { iconSet } from '@molecule/app-icons-molecule'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type HttpHeader, HttpInspector, type HttpMethod, type HttpResponse } from '../index.js'

// A separate client: no app auth token, no baseURL — the URL is sent as typed.
const client = createFetchClient()

/**
 * The README example, verbatim.
 *
 * @returns The API playground.
 */
function ApiPlayground(): React.JSX.Element {
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [url, setUrl] = useState('https://api.example.com/v1/users')
  const [headers, setHeaders] = useState<HttpHeader[]>([
    { key: 'Accept', value: 'application/json' },
  ])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [response, setResponse] = useState<HttpResponse | null>(null)

  /** Sends the built request and records the response. */
  async function send(): Promise<void> {
    setSending(true)
    const started = performance.now()
    try {
      const res = await client.request<string>({
        method,
        url,
        headers: Object.fromEntries(headers.filter((h) => h.key).map((h) => [h.key, h.value])),
        data: body ? JSON.parse(body) : undefined,
        responseType: 'text',
      })
      setResponse({
        statusCode: res.status,
        statusText: res.statusText,
        body: res.data,
        durationMs: Math.round(performance.now() - started),
      })
    } catch (error) {
      // Non-2xx responses reject with HttpError — show them like any other response.
      const res = error instanceof HttpError ? error.response : undefined
      setResponse({
        statusCode: res?.status ?? 0,
        statusText: res?.statusText ?? (error instanceof Error ? error.message : String(error)),
        body: typeof res?.data === 'string' ? res.data : '',
        durationMs: Math.round(performance.now() - started),
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <HttpInspector
      method={method}
      onMethodChange={setMethod}
      url={url}
      onUrlChange={setUrl}
      headers={headers}
      onHeadersChange={setHeaders}
      body={body}
      onBodyChange={setBody}
      onSend={send}
      sending={sending}
      response={response}
    />
  )
}

/**
 * Renders the example inside the i18n provider the component requires.
 *
 * @returns The testing-library render result.
 */
function renderPlayground(): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ApiPlayground />
    </I18nProvider>,
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
    setIconSet(iconSet) // the method <Select>'s chevron throws without it
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('sends the built GET request and shows the status and raw body', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response('[{"id":1}]', { status: 200, statusText: 'OK' }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = renderPlayground()
    fireEvent.change(view.getByLabelText('URL'), {
      target: { value: 'https://api.example.com/v1/users?limit=1' },
    })
    fireEvent.click(view.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(view.getByText('[{"id":1}]')).toBeTruthy())
    expect(view.getByText('200 OK')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [calledUrl, init] = fetchMock.mock.calls[0] ?? []
    expect(calledUrl).toBe('https://api.example.com/v1/users?limit=1')
    expect(init?.method).toBe('GET')
    expect((init?.headers as Record<string, string>).Accept).toBe('application/json')
    expect(init?.body).toBeUndefined()
  })

  it('shows a non-2xx response instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('not here', { status: 404, statusText: 'Not Found' })),
    )
    const view = renderPlayground()
    fireEvent.click(view.getByRole('button', { name: 'Send' }))
    await waitFor(() => expect(view.getByText('404 Not Found')).toBeTruthy())
    expect(view.getByText('not here')).toBeTruthy()
    expect(view.getByRole('button', { name: 'Send' })).toBeTruthy()
  })
})
