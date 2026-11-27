// @vitest-environment jsdom
/**
 * One limit, one surface.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.limit-card-dedupe.test.tsx`
 * with the same test names and the same assertions: a recorded card that
 * declares `coversLimitType` steps aside while the live error banner states the
 * same limit (the banner is never the one suppressed), a card covering a
 * different limit is untouched, and the panel hands the host the backend's full
 * description of the refusal (`limitType`, `billingAction`, `upgradeTier`) so
 * the banner's button says what the hidden card's did.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import { registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import type { UpgradeCtaContext } from '../parts/MessageItem.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The card the interrupted turn recorded (the host's copy). */
const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."
/** The live banner the refused NEXT send gets (the backend's copy for the same limit). */
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 23 hours — or create a free account for more."
/** A card for an unrelated limit — must survive the dedupe. */
const OTHER_CARD_TEXT = 'Your usage balance is empty. Add funds in Billing to keep building.'

/** History with both limit cards; every send is refused with the `ai_cost` limit. */
function buildChatProvider(): ChatProvider {
  const history: ChatMessage[] = [
    {
      id: 'card-budget',
      role: 'system',
      content: '',
      timestamp: 1000,
      cardEvent: { kind: 'custom', name: 'lim_budget' },
    },
    {
      id: 'card-balance',
      role: 'system',
      content: '',
      timestamp: 1001,
      cardEvent: { kind: 'custom', name: 'lim_balance' },
    },
  ]
  return {
    name: 'stub',
    sendMessage: async (
      _message: string,
      _config: ChatConfig,
      onEvent: (event: ChatStreamEvent) => void,
    ): Promise<void> => {
      onEvent({
        type: 'error',
        message: BANNER_TEXT,
        status: 429,
        limitType: 'ai_cost',
        requiresSignup: true,
        billingAction: 'sign_up',
        upgradeTier: 'pro',
      })
    },
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** A full {@link HttpResponse} for a stub to resolve with. */
function responseOf(data: unknown): HttpResponse<never> {
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
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
    patch: async () => responseOf({}),
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
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  }
}

/** The CTA-builder contract the panel calls — the host's, forwarded verbatim. */
type BuildUpgradeCta = (context: UpgradeCtaContext) => ChatEventCardAction[] | null

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
  registerCustomEventCard('lim_budget', () => ({
    text: CARD_TEXT,
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  }))
  registerCustomEventCard('lim_balance', () => ({
    text: OTHER_CARD_TEXT,
    tone: 'info',
    action: [{ label: 'Add funds', href: '/billing' }],
    coversLimitType: 'usage_balance',
  }))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel over the seeded provider.
 *
 * @param buildUpgradeCta - Host CTA builder, when the test asserts on it.
 * @returns The mount container.
 */
function renderPanel(buildUpgradeCta?: BuildUpgradeCta): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel
              projectId="proj-limit"
              agentName="Synthase"
              buildUpgradeCta={buildUpgradeCta}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/**
 * Types a message into the composer and submits it.
 *
 * @param container - The mount container.
 * @param text - The message text.
 */
function send(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

describe('ChatPanel limit-card dedupe', () => {
  it('drops a card whose limit the live banner is already stating, keeping the banner', async () => {
    const container = renderPanel()

    // Before any send there is no error, so BOTH recorded cards render.
    await vi.waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
      expect(container.textContent).toContain(OTHER_CARD_TEXT)
    })

    send(container, 'keep going')

    await vi.waitFor(() => {
      // The live banner states the limit…
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    // …and the card that covers that same limit stepped aside, so the limit is
    // stated ONCE. A card covering a DIFFERENT limit is untouched.
    expect(container.textContent).not.toContain(CARD_TEXT)
    expect(container.textContent).toContain(OTHER_CARD_TEXT)
  })

  it('hands the host the backend’s limitType, billingAction and upgradeTier', async () => {
    const buildUpgradeCta = vi.fn<BuildUpgradeCta>((context) => [
      { label: `cta:${context.billingAction ?? 'unknown'}`, href: '/signup' },
    ])
    const container = renderPanel(buildUpgradeCta)

    send(container, 'keep going')

    await vi.waitFor(() => {
      expect(container.textContent).toContain(BANNER_TEXT)
    })

    const contexts = buildUpgradeCta.mock.calls.map(([context]) => context)
    expect(contexts).toContainEqual({
      requiresSignup: true,
      limitType: 'ai_cost',
      billingAction: 'sign_up',
      upgradeTier: 'pro',
    })
    expect(container.textContent).toContain('cta:sign_up')
  })
})
