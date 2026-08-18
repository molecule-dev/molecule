// @vitest-environment jsdom

/**
 * The steady-state health check must not reload a healthy preview on ONE
 * missed probe.
 *
 * Behind a preview edge a probe is browser → edge → proxy → token resolve → a
 * HEAD at the sandbox upstream — hundreds of milliseconds from a healthy app.
 * The check used to abort at 500ms and treat a single miss as "down", and the
 * recovery poll then cache-bust-reloaded the iframe the moment the next probe
 * answered: a preview that reloaded every few seconds with nobody touching it
 * (observed live 2026-08-18). A miss is now a strike; only HEALTH_DOWN_CONFIRM
 * consecutive misses are a verdict, and a real outage still recovers.
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

const PREVIEW_ORIGIN = 'https://abc123.mlcl.dev'
const PREVIEW_URL = `${PREVIEW_ORIGIN}/`
const STATUS_URL = `${PREVIEW_ORIGIN}/__mol/preview-status`

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

/** Simulate an inbound bridge message from the preview iframe (same-origin). */
function postFromPreview(data: Record<string, unknown>): void {
  const source = document.querySelector('iframe')?.contentWindow ?? null
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN, source }))
}

const advance = (ms: number): Promise<void> => act(() => vi.advanceTimersByTimeAsync(ms))

/**
 * A scripted status endpoint: each entry is what the next status probe answers
 * (`true` = serving, `false` = not). Once the script runs out it keeps answering
 * the last entry. Non-status fetches (never expected here) answer ok.
 */
function scriptedStatus(script: boolean[]): {
  fetch: ReturnType<typeof vi.fn>
  probes: () => number
} {
  let i = 0
  const fetch = vi.fn(async (url: string) => {
    if (!String(url).startsWith(STATUS_URL)) return { ok: true, status: 200 } as Response
    const up = script[Math.min(i, script.length - 1)] ?? true
    i += 1
    return { ok: up, status: up ? 200 : 503 } as Response
  })
  return { fetch, probes: () => i }
}

/** Mount, wait for the iframe, and confirm a render so the health check arms. */
async function mountRendered(): Promise<HTMLIFrameElement> {
  const { container } = render(
    <Wrap provider={providerAtUrl()}>
      <PreviewPanel isBuilding={false} />
    </Wrap>,
  )
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await advance(50)
  }
  const iframe = container.querySelector('iframe') as HTMLIFrameElement
  expect(iframe).not.toBeNull()
  await act(async () => {
    postFromPreview({ type: 'molecule:ready' })
  })
  // Let the reveal fade settle so the steady-state health check is armed.
  await advance(1_500)
  return iframe
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

describe('PreviewPanel — steady-state health check hysteresis', () => {
  it('does NOT reload the preview on a single missed probe', async () => {
    // Boot probes answer up; then one steady-state miss; then up again.
    const status = scriptedStatus([true, true, false, true])
    vi.stubGlobal('fetch', status.fetch)

    const iframe = await mountRendered()
    const srcBefore = iframe.getAttribute('src')

    // Several health cycles: the miss lands, then the app answers again.
    await advance(15_000)

    expect(status.probes()).toBeGreaterThanOrEqual(4)
    expect(iframe.getAttribute('src')).toBe(srcBefore)
    expect(iframe.getAttribute('src')).not.toContain('_r=')
  })

  it('still recovers a real outage: consecutive misses, then a reload when it answers', async () => {
    const status = scriptedStatus([true, true, false, false, true])
    vi.stubGlobal('fetch', status.fetch)

    const iframe = await mountRendered()
    const srcBefore = iframe.getAttribute('src')

    await advance(15_000)

    expect(iframe.getAttribute('src')).not.toBe(srcBefore)
    expect(iframe.getAttribute('src')).toContain('_r=')
  })
})
