// @vitest-environment jsdom

/**
 * Absolute readiness ceiling — the preview can NEVER sit on a bare loading spinner
 * forever. The targeted recovery paths (onLoad grace, stuck-detection, blank-post-build)
 * each resolve a specific failure, but a combination can leave the overlay up
 * indefinitely (e.g. the document never fires onLoad, or a crash storm suppresses the
 * onLoad grace so the blank notice — which needs it — never appears). Past
 * `ABSOLUTE_STUCK_MS`, with no confirmed render and no active build, the panel gives up
 * to the actionable loop-breaker (`preview-load-failed`) so there is always a way out;
 * a later `molecule:ready` clears it.
 *
 * Fake timers (the ceiling is 30s) drive a real jsdom render of {@link PreviewPanel}.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
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

const PREVIEW_URL = 'http://localhost:5173/'
const PREVIEW_ORIGIN = 'http://localhost:5173'

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
  window.dispatchEvent(new MessageEvent('message', { data, origin: PREVIEW_ORIGIN }))
}

const q = (container: HTMLElement, molId: string): Element | null =>
  container.querySelector(`[data-mol-id="${molId}"]`)

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve({ ok: true } as Response)),
  )
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/** Mount + drive the server-up poll so the iframe mounts; return it. */
async function mount(
  isBuilding: boolean,
): Promise<{ container: HTMLElement; iframe: HTMLIFrameElement }> {
  const provider = providerAtUrl()
  const { container } = render(
    <Wrap provider={provider}>
      <PreviewPanel isBuilding={isBuilding} />
    </Wrap>,
  )
  // Advance in small steps so the server-up poll's mocked-fetch microtask resolves (and
  // the iframe mounts) BEFORE the probe's 500ms abort timer can race it under fake timers.
  for (let i = 0; i < 12 && !container.querySelector('iframe'); i++) {
    await vi.advanceTimersByTimeAsync(50)
  }
  const iframe = container.querySelector('iframe')
  expect(iframe).not.toBeNull()
  return { container, iframe: iframe as HTMLIFrameElement }
}

describe('PreviewPanel — absolute readiness ceiling', () => {
  it('gives up to the loop-breaker after the ceiling when no render is ever confirmed', async () => {
    const { container } = await mount(false)
    // Worst case: the document never fires onLoad and the app never confirms a render, so
    // none of the faster paths surface a way out. The ceiling must still rescue it.
    await vi.advanceTimersByTimeAsync(31_000)
    expect(q(container, 'preview-load-failed')).not.toBeNull()
  })

  it('does NOT fire while a build is in progress (no false "can\'t load" mid-build)', async () => {
    const { container } = await mount(true)
    await vi.advanceTimersByTimeAsync(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })

  it('does NOT fire once the app confirms a render before the ceiling', async () => {
    const { container, iframe } = await mount(false)
    fireEvent.load(iframe)
    postFromPreview({ type: 'molecule:ready' })
    await vi.advanceTimersByTimeAsync(31_000)
    expect(q(container, 'preview-load-failed')).toBeNull()
  })
})
