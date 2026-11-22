// @vitest-environment jsdom
/**
 * Unified notice/tip card render guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.notice-card.test.tsx`
 * with the same test names and the same assertions: host notice cards (upgrade,
 * sign-up, saved-script, model-intro, …) ALL render through ONE structure
 * (`chat-notice-card`) — an icon + accent bar + tinted body, with a consistent
 * left-aligned row of accent buttons for action cards — and only the accent
 * COLOUR + ICON vary by `tone`. A real Solid mount of {@link ChatPanel}: it
 * seeds custom-event cards of each tone and asserts the shared structure +
 * per-tone variance.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import {
  ChatContext,
  HttpContext,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** History seeded with one system card message per registered custom-event name. */
function buildChatProvider(cardNames: string[]): ChatProvider {
  const history: ChatMessage[] = cardNames.map((name, index) => ({
    id: `card-${index}`,
    role: 'system',
    content: '',
    timestamp: 1000 + index,
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

/** An HTTP client whose every request rejects; mounted callers catch their own. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** A working in-memory Storage (Node's experimental web-storage shadows jsdom's). */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear: (): void => store.clear(),
    getItem: (key: string): string | null => store.get(key) ?? null,
    key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string): void => void store.delete(key),
    setItem: (key: string, value: string): void => void store.set(key, String(value)),
  }
}

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts {@link ChatPanel} with the given custom-event cards seeded into history.
 *
 * @param cardNames - The custom card names the stub history replays.
 * @returns The mount container.
 */
function renderWithCards(cardNames: string[]): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(cardNames)}>
            <ChatPanel projectId="proj-notice" agentName="Synthase" />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

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

    const container = renderWithCards(['t_upgrade', 't_signup', 't_success', 't_gold'])

    const cards = await vi.waitFor(() => {
      const elements = container.querySelectorAll('[data-mol-id="chat-notice-card"]')
      expect(elements.length).toBe(4) // ALL four notices share the one structure
      return Array.from(elements)
    })

    // Consistency: every notice card has the SAME structure — an icon <svg> + a body —
    // and carries its tone as data-tone (the only thing that varies).
    const tones = cards.map((card: Element) => card.getAttribute('data-tone'))
    expect(tones.sort()).toEqual(['gold', 'signup', 'success', 'upgrade'])
    for (const card of cards) {
      expect(card.querySelector('svg'), 'every notice card shows an icon').not.toBeNull()
    }

    // The OLD divergent treatment is gone.
    expect(container.querySelector('[data-mol-id="chat-tone-card"]')).toBeNull()

    // Action cards render their actions as a row of buttons/links INSIDE the card.
    const upgrade = container.querySelector('[data-tone="upgrade"]') as HTMLElement
    expect(upgrade.textContent).toContain('Upgrade')
    expect(upgrade.textContent).toContain('Source')
    const upgradeButton = upgrade.querySelector('a[href="/pricing"]') as HTMLElement
    expect(upgradeButton).not.toBeNull()
    // Every action goes through `cm.button`; an action without an explicit
    // `color` takes the tone's semantic (upgrade → warning).
    const cmForActions = getClassMap()
    const expectedActionClasses = cmForActions
      .cn(cmForActions.button({ color: 'warning', size: 'sm' }), cmForActions.touchTargetCompact)
      .split(/\s+/)
      .filter(Boolean)
    for (const className of expectedActionClasses) {
      expect(
        upgradeButton.classList.contains(className),
        `notice-card action must carry the design-system class ${className}`,
      ).toBe(true)
    }
    // Nothing the design system owns may be set inline.
    expect(upgradeButton.style.background).toBe('')
    expect(upgradeButton.style.boxShadow).toBe('')
    expect(upgradeButton.style.borderRadius).toBe('')
    expect(upgradeButton.style.fontSize).toBe('')

    // The inline-content (gold) card renders its mid-sentence link, not a button row.
    const gold = container.querySelector('[data-tone="gold"]') as HTMLElement
    expect(gold.querySelector('a[href="/pricing"]')).not.toBeNull()
    expect(gold.textContent).toContain('upgrade options')
  })

  it('opens a protocol-relative //host action like an external link (new tab + noopener)', async () => {
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
    const container = renderWithCards(['t_proto_relative'])
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
  })
})
