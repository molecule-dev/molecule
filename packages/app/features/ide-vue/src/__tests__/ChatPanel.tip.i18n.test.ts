// @vitest-environment jsdom
/**
 * The auto tips are translated AT RENDER, not when they are queued — the Vue
 * port of `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.i18n.test.tsx`,
 * with the same test names and the same assertions.
 *
 * A tip entry stores its definition (`TipDef`); the timeline render calls
 * `tipText(t, tip, { agentName })` — the literal-key translator in
 * `@molecule/app-ide-panel-logic`. With a marker translator whose text names
 * the locale, a locale switch after the tip was queued must change the rendered
 * text — a tip whose sentence was captured into state at queue time would keep
 * the old language here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { resetChatStoresForTests } from '@molecule/app-vue'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — a marker that names both the
 * locale and the key, so a test can prove WHICH key rendered and that a locale
 * switch re-translated it.
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
    t: (key: string): string => `⟦${base.getLocale()}|${key}⟧`,
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Renders the panel under the given provider.
 *
 * @param provider - The i18n provider (the marker translator).
 * @param props - The host props (`canEdit` drives the viewer tip).
 * @returns The mounted panel.
 */
function renderPanel(
  provider: I18nProviderContract,
  props: { canEdit?: boolean } = {},
): PanelMount {
  mounted?.unmount()
  mounted = mountPanel({
    i18n: provider,
    http: buildRejectingHttpClient(),
    chat: buildChatProvider([] as ChatMessage[]),
    projectId: 'proj-i18n',
    props: { agentName: 'Synthase', ...props },
  })
  return mounted
}

/**
 * Every tip card on screen.
 *
 * @param container - The mounted container.
 * @returns The tip card elements.
 */
function tipCards(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-mol-id="chat-tip-card"]'))
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(
    new Proxy(
      {},
      {
        get: () => ({ paths: [], viewBox: '0 0 16 16' }),
      },
    ),
  )
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
})

describe('ChatPanel tips are translated at render (marker translator)', () => {
  it('renders the entry tip through ide.chat.tip.getStarted', async () => {
    const provider = buildMarkerProvider()
    const { container } = renderPanel(provider)
    await flush()

    const cards = tipCards(container)
    expect(cards.length, 'the tip card must be mounted').toBeGreaterThan(0)
    const text = cards.map((card) => card.textContent ?? '').join('')
    expect(text).toContain('⟦en|ide.chat.tip.getStarted⟧')
    // The English sentence is the tip's default, not what the marker renders.
    expect(text).not.toContain('to work from')
  })

  it('re-translates the queued entry tip after a locale switch', async () => {
    const provider = buildMarkerProvider()
    const { container } = renderPanel(provider)
    await flush()
    expect(
      tipCards(container).some((card) =>
        (card.textContent ?? '').includes('⟦en|ide.chat.tip.getStarted⟧'),
      ),
    ).toBe(true)

    await provider.setLocale(MARKER_LOCALE)
    await flush()
    await flush()

    expect(
      tipCards(container).some((card) =>
        (card.textContent ?? '').includes(`⟦${MARKER_LOCALE}|ide.chat.tip.getStarted⟧`),
      ),
      'the queued entry tip must re-translate after a locale switch',
    ).toBe(true)
  })

  it('renders and re-translates the viewer tip through ide.chat.tip.viewerTeamOnly', async () => {
    const provider = buildMarkerProvider()
    const { container } = renderPanel(provider, { canEdit: false })
    await flush()

    expect(
      tipCards(container).some((card) =>
        (card.textContent ?? '').includes('⟦en|ide.chat.tip.viewerTeamOnly⟧'),
      ),
      'the viewer orientation tip must render through its key',
    ).toBe(true)

    await provider.setLocale(MARKER_LOCALE)
    await flush()
    await flush()

    expect(
      tipCards(container).some((card) =>
        (card.textContent ?? '').includes(`⟦${MARKER_LOCALE}|ide.chat.tip.viewerTeamOnly⟧`),
      ),
    ).toBe(true)
  })
})
