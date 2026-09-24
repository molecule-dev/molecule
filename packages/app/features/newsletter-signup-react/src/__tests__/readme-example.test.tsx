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

import { NewsletterSignup } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @returns The rendered newsletter section.
 */
function NewsletterSection(): React.JSX.Element {
  return (
    <NewsletterSignup
      title="Stay in the loop"
      description="Get weekly updates delivered to your inbox."
      onSubscribe={async (email) => {
        await post('/newsletter/subscribe', { email }) // rejects on non-2xx → message shown under the form
      }}
      layout="inline"
      successContent={<p>Thanks for subscribing!</p>}
    />
  )
}

/**
 * Renders the example inside the i18n provider, types an email and submits.
 *
 * @returns The testing-library render result.
 */
function renderAndSubmit(): ReturnType<typeof render> {
  const view = render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <NewsletterSection />
    </I18nProvider>,
  )
  expect(view.getByRole('heading', { name: 'Stay in the loop' })).toBeTruthy()
  fireEvent.change(view.getByLabelText('Email'), { target: { value: 'ada@example.com' } })
  fireEvent.click(view.getByRole('button', { name: 'Subscribe' }))
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

  it('posts the email to the API and shows the success content', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const view = renderAndSubmit()
    await waitFor(() => expect(view.getByText('Thanks for subscribing!')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/newsletter/subscribe')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ada@example.com' })
    expect(view.queryByRole('button')).toBeNull()
  })

  it('shows the error under the form when the API rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 500 })),
    )
    const view = renderAndSubmit()
    await waitFor(() => expect(view.getByText('Request failed with status 500')).toBeTruthy())
    expect(view.getByRole('button', { name: 'Subscribe' })).toBeTruthy()
  })
})
