// @vitest-environment jsdom

/**
 * "Is the app behind this preview actually serving?" — asked in a form the
 * browser can ANSWER.
 *
 * A cross-origin `no-cors` probe returns an opaque response, which resolves for
 * 200 and for an edge's "sandbox unavailable" error page alike. The panel read
 * that as ready and mounted the error page — a document with no bridge in it,
 * which can never self-heal, so recovery fell to the slow reload budget (a 2m21s
 * late paint was recorded live). The panel now asks the preview host's status
 * path first, whose CORS-readable answer is real, and only falls back to the
 * opaque probe on a host that does not serve it (a plain dev server).
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { PreviewProvider } from '@molecule/app-live-preview'
import { createProvider } from '@molecule/app-live-preview-iframe'
import { I18nProvider, PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { PreviewPanel } from '../components/PreviewPanel.js'

const PREVIEW_URL = 'https://abc123.mlcl.dev/'
const STATUS_URL = 'https://abc123.mlcl.dev/__mol/preview-status'

/** Wrap children with the i18n + preview context PreviewPanel needs. */
function Wrap({
  children,
  provider,
}: {
  children: ReactNode
  provider: PreviewProvider
}): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <PreviewContextProvider provider={provider}>{children}</PreviewContextProvider>
    </I18nProvider>
  )
}

/** A real iframe preview provider already pointed at the preview URL. */
function providerAtUrl(): ReturnType<typeof createProvider> {
  const provider = createProvider({ defaultUrl: PREVIEW_URL })
  provider.setUrl(PREVIEW_URL)
  return provider
}

const advance = (ms: number): Promise<void> => act(() => vi.advanceTimersByTimeAsync(ms))

/** Mount the panel and let the server-up poll run for a while. */
async function mountAndPoll(): Promise<HTMLElement> {
  const { container } = render(
    <Wrap provider={providerAtUrl()}>
      <PreviewPanel isBuilding={false} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  return container
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('PreviewPanel — the server-up probe', () => {
  it('asks the preview host for a readable status before mounting anything', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200 }) as Response)
    vi.stubGlobal('fetch', fetchSpy)

    await mountAndPoll()

    const first = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(first[0]).toBe(STATUS_URL)
    expect(first[1].mode).toBe('cors')
  })

  it('does NOT mount the preview when the edge says the app is not serving', async () => {
    // The exact shape that used to pass: a 503/502 the browser can now read.
    const fetchSpy = vi.fn(async () => ({ ok: false, status: 503 }) as Response)
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).toBeNull()
  })

  it('mounts once the edge reports the app is serving', async () => {
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200 }) as Response)
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('falls back to the opaque probe on a host that serves no status path', async () => {
    // A plain dev server (local Docker preview): 404 for the status path, and a
    // reachable document. Reporting it down would be wrong.
    const fetchSpy = vi.fn(async (url: string, _init?: RequestInit) =>
      String(url).endsWith('/__mol/preview-status')
        ? ({ ok: false, status: 404 } as Response)
        : ({ ok: true, status: 0, type: 'opaque' } as unknown as Response),
    )
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).not.toBeNull()
    expect(fetchSpy.mock.calls.some(([, init]) => (init as RequestInit)?.mode === 'no-cors')).toBe(
      true,
    )
  })

  it('falls back when the status request is blocked outright (no CORS headers)', async () => {
    const fetchSpy = vi.fn(async (url: string) => {
      if (String(url).endsWith('/__mol/preview-status')) throw new TypeError('Failed to fetch')
      return { ok: true, status: 0, type: 'opaque' } as unknown as Response
    })
    vi.stubGlobal('fetch', fetchSpy)

    const container = await mountAndPoll()

    expect(container.querySelector('iframe')).not.toBeNull()
  })
})
