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

import { del, post } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider, useTranslation } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { IntegrationCard, type IntegrationStatus } from '../index.js'

/**
 * The README example, verbatim.
 *
 * @param props - Component props.
 * @param props.initialStatus - The connection status loaded with the page.
 * @returns The Slack integration card.
 */
function SlackIntegration({
  initialStatus,
}: {
  initialStatus: IntegrationStatus
}): React.JSX.Element {
  const { t } = useTranslation()
  const [status, setStatus] = useState<IntegrationStatus>(initialStatus)
  const connected = status === 'connected'

  /** Connects or disconnects Slack through the API. */
  async function toggle(): Promise<void> {
    setStatus('pending')
    try {
      if (connected) await del('/integrations/slack')
      else await post('/integrations/slack')
      setStatus(connected ? 'disconnected' : 'connected')
    } catch (_err) {
      // Surfaced to the user as the card's "Error" status; the button offers a retry.
      setStatus('error')
    }
  }

  return (
    <IntegrationCard
      title="Slack"
      description="Send notifications to your team channels."
      status={status}
      action={{
        label: connected
          ? t('common.disconnect', undefined, { defaultValue: 'Disconnect' })
          : t('common.connect', undefined, { defaultValue: 'Connect' }),
        onClick: () => void toggle(),
        loading: status === 'pending',
      }}
      dataMolId="slack-integration-card"
    />
  )
}

/**
 * Renders the example inside the i18n provider the status label requires.
 *
 * @param initialStatus - The starting connection status.
 * @returns The testing-library render result.
 */
function renderCard(initialStatus: IntegrationStatus): ReturnType<typeof render> {
  return render(
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <SlackIntegration initialStatus={initialStatus} />
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

  it('connects through the API: Not connected → Connecting… → Connected', async () => {
    let finish: (res: Response) => void = () => {}
    const fetchMock = vi.fn(
      (_url: string, _init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          finish = resolve
        }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = renderCard('disconnected')
    expect(view.getByText('Slack')).toBeTruthy()
    expect(view.getByText('Not connected')).toBeTruthy()

    fireEvent.click(view.getByRole('button', { name: 'Connect' }))
    expect(view.getByText('Connecting…')).toBeTruthy()
    expect(view.getByRole('button', { name: '…' }).hasAttribute('disabled')).toBe(true)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/integrations/slack')
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('POST')

    finish(Response.json({}))
    await waitFor(() => expect(view.getByText('Connected')).toBeTruthy())
    expect(view.getByRole('button', { name: 'Disconnect' })).toBeTruthy()
  })

  it('disconnects with DELETE, and shows Error when the API fails', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response('', { status: 502 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const view = renderCard('connected')
    fireEvent.click(view.getByRole('button', { name: 'Disconnect' }))
    await waitFor(() => expect(view.getByText('Error')).toBeTruthy())
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
    expect(view.getByRole('button', { name: 'Connect' })).toBeTruthy()
  })
})
