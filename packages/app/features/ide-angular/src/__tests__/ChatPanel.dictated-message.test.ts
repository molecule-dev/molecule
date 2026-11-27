// @vitest-environment jsdom
/**
 * The voice-dictation badge — a message the user composed through the mic
 * button (`viaDictation`) renders with a red mic badge in its Slack-style
 * header, so the transcript shows HOW it was written, live and after a reload.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.dictated-message.test.tsx`
 * with the same test names and the same assertions: a real jsdom render of the
 * panel, seeded through a stub `ChatProvider.loadHistory`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular/chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
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
} from './chat-panel-harness.js'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DICTATED_TEXT = 'add a login page to the app'
const TYPED_TEXT = 'now make it dark mode'

/**
 * The seeded transcript: a dictated message, an assistant reply, and a typed one.
 * @returns The seeded history for `loadHistory`.
 */
function seededHistory(): ChatMessage[] {
  return [
    // Composed through the mic button — the badge must render on this one.
    { id: 'u1', role: 'user', content: DICTATED_TEXT, viaDictation: true, timestamp: 1000 },
    { id: 'a1', role: 'assistant', content: 'On it.', timestamp: 2000 },
    // Typed by hand — no badge.
    { id: 'u2', role: 'user', content: TYPED_TEXT, timestamp: 3000 },
  ]
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
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
 * Renders the panel with the seeded transcript.
 *
 * @returns The mount container.
 */
async function renderChatPanel(): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(seededHistory()),
    props: { projectId: 'proj-dictated', userAvatar: null },
  })
  return mounted.container
}

describe('ChatPanel dictated messages (voice-dictation badge)', () => {
  it(
    'renders the mic badge on a viaDictation user message, with an accessible name',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel()

      await vi.waitFor(() => {
        expect(container.textContent).toContain(DICTATED_TEXT)
      })

      const userCard = container.querySelector<HTMLElement>('[data-mol-id="chat-user-message"]')
      expect(userCard).not.toBeNull()
      expect(userCard!.textContent).toContain(DICTATED_TEXT)

      const badge = userCard!.querySelector<HTMLElement>('[data-mol-id="chat-dictated-badge"]')
      expect(badge).not.toBeNull()
      // Hard to miss: a filled mic glyph, red per theme, at the shared 16px icon size.
      const svg = badge!.querySelector('svg')
      expect(svg).not.toBeNull()
      expect(svg!.getAttribute('width')).toBe('16')
      expect(badge!.getAttribute('title')).toBe('Dictated by voice')
      expect(badge!.getAttribute('aria-label')).toBe('Dictated by voice')
      // An icon-only badge is an image with a name (axe `aria-prohibited-attr`:
      // a span without a role may not carry aria-label).
      expect(badge!.getAttribute('role')).toBe('img')
      // Filled capsule (the "listening" mic shape — bolder than the idle outline).
      const capsule = svg!.querySelector('rect')
      expect(capsule).not.toBeNull()
      expect(capsule!.getAttribute('fill')).toBe('currentColor')
    },
  )

  it(
    'renders NO badge on a hand-typed user message',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const container = await renderChatPanel()

      await vi.waitFor(() => {
        expect(container.textContent).toContain(TYPED_TEXT)
      })

      const cards = Array.from(
        container.querySelectorAll<HTMLElement>('[data-mol-id="chat-user-message"]'),
      )
      expect(cards.length).toBe(2)
      const typedCard = cards.find((card) => card.textContent!.includes(TYPED_TEXT))!
      expect(typedCard).toBeTruthy()
      expect(typedCard.querySelector('[data-mol-id="chat-dictated-badge"]')).toBeNull()
    },
  )
})
