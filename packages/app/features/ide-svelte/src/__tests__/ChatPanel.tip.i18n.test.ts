// @vitest-environment jsdom

/**
 * The auto tips are translated AT RENDER, not when they are queued — the
 * Svelte port of `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.i18n.test.tsx`
 * with the same test names and the same assertions.
 *
 * A tip entry stores its definition ({@link TipDef}); the timeline render calls
 * `tipText(t, tip, { agentName })`. With a marker translator whose text names
 * the locale, a locale switch after the tip was queued must change the rendered
 * text — a tip whose sentence was captured into state at queue time would keep
 * the old language here (the defect the en-XA conformance snapshot caught:
 * "Tip: type / …" stayed plain English through a locale switch).
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider as I18nProviderContract } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — a marker that names both
 * the locale and the key, so a test can prove WHICH key rendered and that a
 * locale switch re-translated it.
 *
 * @returns The marker provider.
 */
function buildMarkerProvider(): I18nProviderContract {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: MARKER_LOCALE, name: 'Marker', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${base.getLocale()}|${key}⟧`,
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Renders the panel under the marker provider.
 *
 * @param provider - The i18n provider (kept for locale switches).
 * @param props - Extra panel props (a read-only viewer).
 * @returns The mount container.
 */
function renderPanel(
  provider: I18nProviderContract,
  props: { canEdit?: boolean } = {},
): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider([]),
    i18n: provider,
    projectId: 'proj-i18n',
    props: { agentName: 'Synthase', ...props },
  })
  return mounted.container
}

/**
 * The tip card's text, once it is on screen.
 *
 * @param container - The mounted container.
 * @returns The card's text.
 */
async function tipText(container: HTMLElement): Promise<string> {
  return vi.waitFor(() => {
    const el = container.querySelector('[data-mol-id="chat-tip-card"]')
    expect(el, 'the tip card must be mounted').not.toBeNull()
    return el?.textContent ?? ''
  })
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel tips are translated at render (marker translator)', () => {
  it('renders the entry tip through ide.chat.tip.getStarted', async () => {
    const provider = buildMarkerProvider()
    const container = renderPanel(provider)

    const text = await tipText(container)
    expect(text).toContain('⟦en|ide.chat.tip.getStarted⟧')
    // The English sentence is the tip's default, not what the marker renders.
    expect(text).not.toContain('to work from')
  })

  it('re-translates the queued entry tip after a locale switch', async () => {
    const provider = buildMarkerProvider()
    const container = renderPanel(provider)
    await tipText(container)

    await provider.setLocale(MARKER_LOCALE)
    flushSync()

    await vi.waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-tip-card"]')
      expect(el?.textContent ?? '').toContain(`⟦${MARKER_LOCALE}|ide.chat.tip.getStarted⟧`)
    })
  })

  it('renders and re-translates the viewer tip through ide.chat.tip.viewerTeamOnly', async () => {
    const provider = buildMarkerProvider()
    const container = renderPanel(provider, { canEdit: false })

    await vi.waitFor(() => {
      const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
      expect(
        els.some((e) => (e.textContent ?? '').includes('⟦en|ide.chat.tip.viewerTeamOnly⟧')),
        'the viewer orientation tip must render through its key',
      ).toBe(true)
    })

    await provider.setLocale(MARKER_LOCALE)
    flushSync()

    await vi.waitFor(() => {
      const els = Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]'))
      expect(
        els.some((e) =>
          (e.textContent ?? '').includes(`⟦${MARKER_LOCALE}|ide.chat.tip.viewerTeamOnly⟧`),
        ),
      ).toBe(true)
    })
  })
})
