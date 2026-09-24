// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ContactForm, type ContactFormValues } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered contact page.
 */
function ContactPage(): React.JSX.Element {
  /**
   * Posts the collected values to the API.
   *
   * @param values - Form values.
   */
  async function sendMessage(values: ContactFormValues): Promise<void> {
    await post('/contact', values) // rejects on non-2xx → message shown under the form
  }
  return (
    <ContactForm
      title="Get in touch"
      description="We'll respond within one business day."
      onSubmit={sendMessage}
      successContent={<p>Thanks! We&apos;ll be in touch soon.</p>}
    />
  )
}

/**
 * Renders the example inside the i18n provider the component requires, and fills the fields.
 *
 * @returns The testing-library render result.
 */
function renderAndFill(): ReturnType<typeof render> {
  const view = render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ContactPage />
    </I18nProvider>,
  )
  fireEvent.change(view.getByLabelText('Name'), { target: { value: 'Ada' } })
  fireEvent.change(view.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
  fireEvent.change(view.getByLabelText('Message'), { target: { value: 'Hello there' } })
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

  it('posts the values to the API and shows the success content', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderAndFill()
    expect(view.getByRole('heading', { name: 'Get in touch' })).toBeTruthy()
    fireEvent.click(view.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(view.getByText("Thanks! We'll be in touch soon.")).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/contact')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hello there',
    })
    expect(view.queryByRole('button')).toBeNull()
  })

  it('shows the error under the form when the API rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    const view = renderAndFill()
    fireEvent.click(view.getByRole('button', { name: 'Send message' }))
    await waitFor(() => expect(view.getByText('Request failed with status 500')).toBeTruthy())
    expect(view.getByRole('button', { name: 'Send message' })).toBeTruthy()
  })
})
