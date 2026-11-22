// @vitest-environment jsdom
/**
 * Unified notice/tip card render guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.notice-card.test.tsx`
 * with the same test names and the same assertions: host notice cards
 * (upgrade, sign-up, saved-script, model-intro, …) all render through ONE
 * structure (`chat-notice-card`) — an icon + accent bar + tinted body, with a
 * consistent left-aligned row of accent buttons for action cards — and only
 * the accent COLOUR + ICON vary by `tone`. A real jsdom render of the actual
 * {@link ChatPanel}: it seeds custom-event cards of each tone into history and
 * asserts the shared structure, per-tone variance, the design-system action
 * classes, and that a protocol-relative `//host` action opens like an external
 * link.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { resetChatStoresForTests } from '@molecule/app-angular'
import { setIconSet } from '@molecule/app-icons'
import { registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
} from './chat-panel-harness.js'

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * History seeded with one system card message per registered custom-event name.
 *
 * @param cardNames - The registered custom-event names, one card each.
 * @returns A stub chat provider replaying that history.
 */
function buildChatProvider(cardNames: string[]): ChatProvider {
  const history: ChatMessage[] = cardNames.map((name, i) => ({
    id: `card-${i}`,
    role: 'system',
    content: '',
    timestamp: 1000 + i,
    cardEvent: { kind: 'custom', name },
  }))
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/**
 * Mounts {@link ChatPanel} with the given custom-event cards seeded into history.
 *
 * @param cardNames - The custom-event names to seed.
 * @returns The mount container.
 */
async function renderWithCards(cardNames: string[]): Promise<HTMLElement> {
  mounted = await mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(cardNames),
    props: { projectId: 'proj-notice', agentName: 'Synthase' },
  })
  return mounted.container
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
})

describe('ChatPanel unified notice cards', () => {
  it(
    'renders every tone through ONE consistent structure, varying only colour/icon',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // One card per tone — an action card (upgrade) + an inline-content card (gold).
      registerCustomEventCard('t_upgrade', () => ({
        text: 'You hit a plan limit.',
        tone: 'upgrade',
        action: [
          { label: 'Upgrade', href: '/pricing' },
          { label: 'Source', href: 'https://example.com/repo' },
        ],
      }))
      registerCustomEventCard('t_signup', () => ({
        text: 'Sign up to keep your work.',
        tone: 'signup',
        action: [{ label: 'Sign up', href: '/signup' }],
      }))
      registerCustomEventCard('t_success', () => ({
        text: 'Saved script: deploy',
        tone: 'success',
        action: [{ label: 'Run', onClick: () => {} }],
      }))
      registerCustomEventCard('t_gold', () => ({
        text: 'For free users… see our upgrade options.',
        tone: 'gold',
        content: ['For free users… see our ', { label: 'upgrade options', href: '/pricing' }, '.'],
      }))

      const container = await renderWithCards(['t_upgrade', 't_signup', 't_success', 't_gold'])

      const cards = await vi.waitFor(() => {
        const els = container.querySelectorAll('[data-mol-id="chat-notice-card"]')
        expect(els.length).toBe(4) // ALL four notices share the one structure
        return els
      })

      // Consistency: every notice card has the SAME structure — an icon <svg> + a body —
      // and carries its tone as data-tone (the only thing that varies).
      const tones = Array.from(cards).map((c) => c.getAttribute('data-tone'))
      expect(tones.sort()).toEqual(['gold', 'signup', 'success', 'upgrade'])
      for (const card of cards) {
        expect(card.querySelector('svg'), 'every notice card shows an icon').not.toBeNull()
      }

      // The OLD divergent treatments are gone — no `chat-tone-card`, and the notice cards are
      // NOT centered (the old emphasized box used textAlign:center + filled buttons).
      expect(container.querySelector('[data-mol-id="chat-tone-card"]')).toBeNull()

      // Action cards render their actions as a row of buttons/links INSIDE the card.
      const upgrade = container.querySelector('[data-tone="upgrade"]') as HTMLElement
      expect(upgrade.textContent).toContain('Upgrade')
      expect(upgrade.textContent).toContain('Source')
      const upgradeBtn = upgrade.querySelector('a[href="/pricing"]') as HTMLElement
      expect(upgradeBtn).not.toBeNull()
      // The buttons must read as ACTUAL buttons — and as the SAME button the rest of
      // the app shows, so a coloured action and a colourless one can't sit side by
      // side on one card at two different sizes and radii. Every action goes through
      // `cm.button`; an action without an explicit `color` takes the tone's semantic
      // (upgrade → warning).
      const cmForActions = getClassMap()
      const expectedActionClasses = cmForActions
        .cn(cmForActions.button({ color: 'warning', size: 'sm' }), cmForActions.touchTargetCompact)
        .split(/\s+/)
        .filter(Boolean)
      for (const cls of expectedActionClasses) {
        expect(
          upgradeBtn.classList.contains(cls),
          `notice-card action must carry the design-system class ${cls}`,
        ).toBe(true)
      }
      // Nothing the design system owns may be set inline — inline styles outrank
      // ClassMap classes (molecule AGENTS.md anti-pattern 12), which is exactly how
      // the hand-rolled fill/shadow this replaced defeated it.
      expect(upgradeBtn.style.background).toBe('')
      expect(upgradeBtn.style.boxShadow).toBe('')
      expect(upgradeBtn.style.borderRadius).toBe('')
      expect(upgradeBtn.style.fontSize).toBe('')

      // The inline-content (gold) card renders its mid-sentence link, not a button row.
      const gold = container.querySelector('[data-tone="gold"]') as HTMLElement
      expect(gold.querySelector('a[href="/pricing"]')).not.toBeNull()
      expect(gold.textContent).toContain('upgrade options')
    },
  )

  it(
    'opens a protocol-relative //host action like an external link (new tab + noopener)',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      // `//host` carries no scheme, so the scheme gate lets it anchor — but the
      // browser resolves it against the page's protocol to ANOTHER origin. It
      // must open like an http(s) action: `target="_blank"` +
      // `rel="noopener noreferrer"`, never a same-tab off-origin navigation.
      registerCustomEventCard('t_proto_relative', () => ({
        text: 'Your session expired.',
        tone: 'info',
        action: [
          { label: 'Re-auth', href: '//accounts.example.test/login' },
          { label: 'Docs', href: '/docs' },
          { label: 'Status', href: 'https://status.example.test' },
        ],
      }))
      const container = await renderWithCards(['t_proto_relative'])
      await vi.waitFor(() => {
        expect(container.querySelectorAll('[data-mol-id="chat-notice-card"]').length).toBe(1)
      })

      const protoRelative = container.querySelector(
        'a[href="//accounts.example.test/login"]',
      ) as HTMLAnchorElement
      expect(protoRelative).not.toBeNull()
      expect(protoRelative.getAttribute('target')).toBe('_blank')
      expect(protoRelative.getAttribute('rel')).toBe('noopener noreferrer')

      // An app-ROUTE action stays same-tab (no target/rel)…
      const route = container.querySelector('a[href="/docs"]') as HTMLAnchorElement
      expect(route).not.toBeNull()
      expect(route.getAttribute('target')).toBeNull()
      expect(route.getAttribute('rel')).toBeNull()

      // …and an https action opens in a new tab with noopener as before.
      const https = container.querySelector(
        'a[href="https://status.example.test"]',
      ) as HTMLAnchorElement
      expect(https.getAttribute('target')).toBe('_blank')
      expect(https.getAttribute('rel')).toBe('noopener noreferrer')
    },
  )
})
