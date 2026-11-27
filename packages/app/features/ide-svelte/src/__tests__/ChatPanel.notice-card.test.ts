// @vitest-environment jsdom
/**
 * Unified notice/tip card render guard.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ChatPanel.notice-card.test.tsx`
 * with the same test names and the same assertions: host notice cards of every
 * tone render through ONE structure (`chat-notice-card`) — an icon + accent bar
 * + tinted body, with a consistent left-aligned row of accent buttons — and
 * only the accent COLOUR + ICON vary, by `tone`. The old divergent
 * `chat-tone-card` treatment is gone, and a protocol-relative `//host` action
 * opens like an external link (new tab + noopener) while an app route stays
 * same-tab.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatMessage } from '@molecule/app-ai-chat'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { resetChatStoresForTests } from '@molecule/app-svelte/chat'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
} from './chat-panel-harness.js'

/**
 * The history seeded with one system card message per registered custom-event
 * name.
 *
 * @param cardNames - The custom event names to record.
 * @returns The seeded transcript.
 */
function seededCards(cardNames: string[]): ChatMessage[] {
  return cardNames.map((name, i) => ({
    id: `card-${i}`,
    role: 'system' as const,
    content: '',
    timestamp: 1000 + i,
    cardEvent: { kind: 'custom' as const, name },
  }))
}

/**
 * Polls `predicate` until it stops throwing.
 *
 * @param predicate - The assertion to retry.
 * @param timeout - How long to keep trying, in ms.
 * @returns A promise resolved once the predicate passes.
 */
async function waitFor(predicate: () => void, timeout = 1500): Promise<void> {
  const started = Date.now()
  for (;;) {
    try {
      predicate()
      return
    } catch (error) {
      if (Date.now() - started > timeout) throw error
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
  }
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Mounts the panel with the given custom-event cards seeded into history.
 *
 * @param cardNames - The custom event names to record.
 * @returns The mount container.
 */
function mountWithCards(cardNames: string[]): HTMLElement {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildRejectingHttpClient(),
    chat: buildChatProvider(seededCards(cardNames)),
    projectId: 'proj-notice',
    props: { agentName: 'Synthase' },
  })
  return mounted.container
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel unified notice cards', () => {
  it('renders every tone through ONE consistent structure, varying only colour/icon', async () => {
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

    const container = mountWithCards(['t_upgrade', 't_signup', 't_success', 't_gold'])

    let cards: NodeListOf<Element> | null = null
    await waitFor(() => {
      const els = container.querySelectorAll('[data-mol-id="chat-notice-card"]')
      expect(els.length).toBe(4) // ALL four notices share the one structure
      cards = els
    })

    // Consistency: every notice card has the SAME structure — an icon <svg> + a
    // body — and carries its tone as data-tone (the only thing that varies).
    const tones = Array.from(cards!).map((c) => c.getAttribute('data-tone'))
    expect(tones.sort()).toEqual(['gold', 'signup', 'success', 'upgrade'])
    for (const card of Array.from(cards!)) {
      expect(card.querySelector('svg'), 'every notice card shows an icon').not.toBeNull()
    }

    // The OLD divergent treatments are gone.
    expect(container.querySelector('[data-mol-id="chat-tone-card"]')).toBeNull()

    // Action cards render their actions as a row of buttons/links INSIDE the card.
    const upgrade = container.querySelector('[data-tone="upgrade"]') as HTMLElement
    expect(upgrade.textContent).toContain('Upgrade')
    expect(upgrade.textContent).toContain('Source')
    const upgradeBtn = upgrade.querySelector('a[href="/pricing"]') as HTMLElement
    expect(upgradeBtn).not.toBeNull()
    // Every action goes through `cm.button`; an action without an explicit
    // `color` takes the tone's semantic (upgrade → warning).
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
    // Nothing the design system owns may be set inline.
    expect(upgradeBtn.style.background).toBe('')
    expect(upgradeBtn.style.boxShadow).toBe('')
    expect(upgradeBtn.style.borderRadius).toBe('')
    expect(upgradeBtn.style.fontSize).toBe('')

    // The inline-content (gold) card renders its mid-sentence link, not a button row.
    const gold = container.querySelector('[data-tone="gold"]') as HTMLElement
    expect(gold.querySelector('a[href="/pricing"]')).not.toBeNull()
    expect(gold.textContent).toContain('upgrade options')
  })

  it('opens a protocol-relative //host action like an external link (new tab + noopener)', async () => {
    registerCustomEventCard('t_proto_relative', () => ({
      text: 'Your session expired.',
      tone: 'info',
      action: [
        { label: 'Re-auth', href: '//accounts.example.test/login' },
        { label: 'Docs', href: '/docs' },
        { label: 'Status', href: 'https://status.example.test' },
      ],
    }))
    const container = mountWithCards(['t_proto_relative'])
    await waitFor(() => {
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
  })
})
