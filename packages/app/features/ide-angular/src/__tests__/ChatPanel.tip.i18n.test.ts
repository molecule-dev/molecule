// @vitest-environment jsdom
/**
 * The auto tips are translated AT RENDER, not when they are queued.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.tip.i18n.test.tsx`
 * with the same test names and the same assertions. A tip entry stores its
 * definition ({@link TipDef}); the timeline render calls
 * `tipText(t, tip, { agentName })` — the literal-key translator in
 * `@molecule/app-ide-panel-logic`. With a marker translator whose text names
 * the locale, a locale switch after the tip was queued must change the
 * rendered text — a tip whose sentence was captured into state at queue time
 * would keep the old language here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatProvider } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  settle,
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
    t: (key) => `⟦${base.getLocale()}|${key}⟧`,
  }
}

/** A chat provider whose history resolves empty — a fresh, deterministic mount. */
function emptyChatProvider(): ChatProvider {
  return buildChatProvider([])
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

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
})

/**
 * Renders the panel under the marker provider.
 *
 * @param provider - The provider the panel translates through.
 * @param props - Extra panel props.
 * @returns The mount container.
 */
async function renderPanel(
  provider: I18nProviderContract,
  props: Record<string, unknown> = {},
): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: emptyChatProvider(),
    i18n: provider,
    props: { projectId: 'proj-i18n', agentName: 'Synthase', ...props },
  })
  await settle(mounted)
  return mounted.container
}

/**
 * The tip card's text, once it is on screen.
 *
 * @param container - The mount container.
 * @returns The first tip card's text.
 */
function tipTextOf(container: HTMLElement): string {
  const el = container.querySelector('[data-mol-id="chat-tip-card"]')
  expect(el, 'the tip card must be mounted').not.toBeNull()
  return el?.textContent ?? ''
}

describe('ChatPanel tips are translated at render (marker translator)', () => {
  it(
    'renders the entry tip through ide.chat.tip.getStarted',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const provider = buildMarkerProvider()
      const container = await renderPanel(provider)

      const text = tipTextOf(container)
      expect(text).toContain('⟦en|ide.chat.tip.getStarted⟧')
      // The English sentence is the tip's default, not what the marker renders.
      expect(text).not.toContain('to work from')
    },
  )

  it(
    're-translates the queued entry tip after a locale switch',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const provider = buildMarkerProvider()
      const container = await renderPanel(provider)
      tipTextOf(container)

      await provider.setLocale(MARKER_LOCALE)
      await settle(mounted)

      expect(tipTextOf(container)).toContain(`⟦${MARKER_LOCALE}|ide.chat.tip.getStarted⟧`)
    },
  )

  it(
    'renders and re-translates the viewer tip through ide.chat.tip.viewerTeamOnly',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const provider = buildMarkerProvider()
      const container = await renderPanel(provider, { canEdit: false })

      const showsViewerTip = (): boolean =>
        Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]')).some((element) =>
          (element.textContent ?? '').includes('⟦en|ide.chat.tip.viewerTeamOnly⟧'),
        )
      expect(showsViewerTip(), 'the viewer orientation tip must render through its key').toBe(true)

      await provider.setLocale(MARKER_LOCALE)
      await settle(mounted)

      expect(
        Array.from(container.querySelectorAll('[data-mol-id="chat-tip-card"]')).some((element) =>
          (element.textContent ?? '').includes(`⟦${MARKER_LOCALE}|ide.chat.tip.viewerTeamOnly⟧`),
        ),
      ).toBe(true)
    },
  )
})
