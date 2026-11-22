// @vitest-environment jsdom
/**
 * A guest limit is stale the moment the guest signs in.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.stale-guest-limit.test.tsx`
 * with the same test names and the same assertions. The in-IDE auth modal never
 * navigates, so the panel keeps running across the login with the refused
 * send's error still in state. `isAnonymous={false}` + `requiresSignup` is the
 * whole signal: the banner goes, and the `coversLimitType` card it was
 * suppressing comes back. A real Solid mount of {@link ChatPanel} driving a
 * real send.
 *
 * React re-reads the prop on a rerender; Solid's props are reactive, so the
 * host flips the same signal the live panel tracks.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
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
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The live banner the refused send gets — the backend's guest-tier copy. */
const BANNER_TEXT =
  "You've used today's free AI budget for guests. It refreshes in about 17 hours — or create a free account for more."
/** The card the interrupted turn recorded, declaring it covers the same limit. */
const CARD_TEXT = "You've used today's free AI budget for guests. It refreshes tomorrow."

/** History with the budget card; every send is refused with the guest `ai_cost` limit. */
function buildChatProvider(): ChatProvider {
  const history: ChatMessage[] = [
    {
      id: 'card-budget',
      role: 'system',
      content: '',
      timestamp: 1000,
      cardEvent: { kind: 'custom', name: 'guest_budget' },
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
      } as ChatStreamEvent)
    },
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

/** One provider instance for the whole mount, so a prop flip never re-seeds the chat. */
let chatProvider: ChatProvider

/** The mount alive right now, plus the host's anonymous-flag setter. */
const mounted: {
  dispose?: () => void
  setAnonymous?: (anonymous: boolean) => void
} = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  chatProvider = buildChatProvider()
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
  registerCustomEventCard('guest_budget', () => ({
    text: CARD_TEXT,
    tone: 'upgrade',
    action: [{ label: 'Sign up', href: '/signup' }],
    coversLimitType: 'ai_cost',
  }))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  mounted.setAnonymous = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the panel with a host-owned anonymous flag the test can flip.
 *
 * @param projectId - The project id.
 * @returns The mount container.
 */
function renderPanel(projectId: string): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(() => {
    const [anonymous, setAnonymous] = createSignal(true)
    mounted.setAnonymous = setAnonymous
    return (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={chatProvider}>
            <ChatPanel projectId={projectId} agentName="Synthase" isAnonymous={anonymous()} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    )
  }, container)
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

describe('ChatPanel stale guest limit', () => {
  it('drops a requiresSignup limit banner once the viewer is no longer anonymous', async () => {
    const container = renderPanel('proj-guest')

    // The recorded budget card is in the restored history.
    await vi.waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
    })

    // Guest hits the budget: the refused send raises the guest-tier limit banner,
    // and the card covering that same limit steps aside for it.
    send(container, 'keep going')

    await vi.waitFor(() => {
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    expect(container.textContent).not.toContain(CARD_TEXT)

    // They sign up in the in-IDE modal — nothing navigates, the panel keeps
    // running, and the error is still in useChat state. The host flips isAnonymous.
    mounted.setAnonymous?.(false)

    await vi.waitFor(() => {
      expect(container.textContent).not.toContain(BANNER_TEXT)
    })
    // The banner is gone, so it no longer suppresses the card it was covering.
    expect(container.textContent).toContain(CARD_TEXT)
  })

  it('keeps the banner up while the viewer is still a guest', async () => {
    const container = renderPanel('proj-guest-2')

    await vi.waitFor(() => {
      expect(container.textContent).toContain(CARD_TEXT)
    })
    send(container, 'keep going')

    await vi.waitFor(() => {
      expect(container.textContent).toContain(BANNER_TEXT)
    })
    expect(container.textContent).not.toContain(CARD_TEXT)
  })
})
