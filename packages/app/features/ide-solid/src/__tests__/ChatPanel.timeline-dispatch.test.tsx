// @vitest-environment jsdom
/**
 * Timeline dispatch and the activity slice — unit U4 of the Solid ChatPanel
 * port.
 *
 * A real Solid mount of {@link ChatPanel}: every timeline item kind reaches its
 * row or card (a chat message, a persisted commit record, a system notice, a
 * tip), the timestamp plan puts an item's time on its own line, and the
 * `chat:activity` slice restores a conversation's captured cards, writes this
 * viewer's cards back, and never writes a read-only viewer's.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatPanelProps } from '../components/chat-panel/context.js'
import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** One request the mounted panel made. */
interface RecordedCall {
  /** The HTTP method. */
  method: string
  /** The request's URL. */
  url: string
  /** The request's body, when it carried one. */
  body?: unknown
}

/** The captured email the activity-card store holds. */
const ACTIVITY_ENTRY = {
  id: 'act-1',
  activity: {
    id: 'act-1',
    type: 'email',
    status: 'captured',
    recipient: 'ada@example.test',
    summary: 'Welcome',
    timestamp: '2023-11-14T22:12:30.000Z',
  },
  timestamp: 1_700_000_000_000,
}

/** A chat provider that replays the given history and never streams. */
function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/**
 * A successful response carrying `data`.
 * @param url - The request's URL.
 * @param method - The request's method.
 * @param data - The body.
 * @returns The response.
 */
function response<T>(url: string, method: 'GET' | 'PUT', data: T): HttpResponse<T> {
  return { status: 200, statusText: 'OK', headers: {}, data, config: { method, url } }
}

/**
 * An HTTP client that answers the activity-card GET with the given list and
 * records every request; every other request rejects (the panel catches its
 * own).
 * @param activityCards - What the restore returns, or `'reject'` to fail it.
 * @param calls - The ordered log the requests are recorded into.
 * @returns The recording client.
 */
function buildHttpClient(activityCards: unknown[] | 'reject', calls: RecordedCall[]): HttpClient {
  const reject = (url: string, method: string) => (): Promise<never> => {
    calls.push({ method, url })
    return Promise.reject(new Error('http disabled in test'))
  }
  const get: HttpClient['get'] = <T,>(url: string): Promise<HttpResponse<T>> => {
    calls.push({ method: 'GET', url })
    if (!url.endsWith('/activity-cards') || activityCards === 'reject')
      return Promise.reject(new Error('not scripted'))
    const data: unknown = { activityCards }
    return Promise.resolve(response(url, 'GET', data as T))
  }
  const put: HttpClient['put'] = <T,>(url: string, body?: unknown): Promise<HttpResponse<T>> => {
    calls.push({ method: 'PUT', url, body })
    const data: unknown = {}
    return Promise.resolve(response(url, 'PUT', data as T))
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject('', 'REQUEST'),
    get,
    post: reject('', 'POST'),
    put,
    patch: reject('', 'PATCH'),
    delete: reject('', 'DELETE'),
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/**
 * A working in-memory Storage (Node's experimental web-storage shadows jsdom's).
 * @param seed - Initial entries.
 * @returns The storage.
 */
function makeStorage(seed: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(seed))
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

/** The ordered requests the mounted panel made. */
let calls: RecordedCall[] = []

/**
 * Installs fresh storage, optionally seeded.
 * @param seed - Initial entries.
 */
function setStorage(seed: Record<string, string> = {}): void {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(seed),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  calls = []
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  resetChatStoresForTests()
  setStorage()
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
 * Mounts {@link ChatPanel} with the given history and activity-card answers.
 * @param history - The transcript the stub provider replays.
 * @param activityCards - What the activity-card restore returns (`'reject'` to fail it).
 * @param props - Extra panel props.
 * @returns The mount container.
 */
function mountPanel(
  history: ChatMessage[],
  activityCards: unknown[] | 'reject',
  props: Partial<ChatPanelProps> = {},
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient(activityCards, calls)}>
          <ChatContext.Provider value={buildChatProvider(history)}>
            <ChatPanel projectId="p1" agentName="Synthase" {...props} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/** One user message, as history carries it. */
const USER_MESSAGE: ChatMessage = {
  id: 'm-user',
  role: 'user',
  content: 'Build the thing',
  timestamp: 1_700_000_000_000,
}

/** One assistant reply, as history carries it. */
const REPLY: ChatMessage = {
  id: 'm-reply',
  role: 'assistant',
  content: 'Built it.',
  timestamp: 1_700_000_001_000,
}

describe('ChatPanel timeline dispatch', () => {
  it('renders a message row, a persisted commit card and a plain system notice', async () => {
    registerCustomEventCard('t_notice', () => ({ text: 'A plain provider notice.' }))
    const history: ChatMessage[] = [
      USER_MESSAGE,
      REPLY,
      {
        id: 'm-card',
        role: 'system',
        content: '',
        timestamp: 1_700_000_002_000,
        cardEvent: { kind: 'custom', name: 't_notice' },
      },
      {
        id: 'm-commit',
        role: 'system',
        content: '',
        timestamp: 1_700_000_003_000,
        commitRecord: { message: 'feat: the first build', files: ['src/app.ts'] },
      },
    ]
    const container = mountPanel(history, [])

    // The message kind renders its row, not a card.
    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-mol-id="chat-user-message"]').length).toBe(1)
    })
    expect(container.querySelector('[data-mol-id="chat-user-message"]')?.textContent).toContain(
      'Build the thing',
    )
    expect(container.textContent).toContain('Built it.')

    // The system-card kind: a plain, tone-less notice is one muted inline line.
    expect(container.textContent).toContain('A plain provider notice.')

    // A persisted commit record renders its card's message, not a message row.
    expect(container.textContent).toContain('feat: the first build')
  })

  it('shows the onboarding tip on a fresh conversation and removes it when dismissed', async () => {
    const container = mountPanel([], [])

    const tip = await vi.waitFor(() => {
      const element = container.querySelector('[data-mol-id="chat-tip-card"]')
      expect(element).not.toBeNull()
      return element as HTMLElement
    })
    expect(tip.textContent).toContain('Tip:')

    const dismiss = container.querySelector('[data-mol-id="chat-tip-dismiss"]') as HTMLElement
    expect(dismiss).not.toBeNull()
    dismiss.click()

    // The tip kind leaves the timeline, revealing the empty-state hint.
    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-empty-hint"]')).not.toBeNull()
  })

  it("puts a reply's time on its own line when the stored preference is on", async () => {
    setStorage({ mol_chat_show_timestamps: 'true' })
    const container = mountPanel([USER_MESSAGE, REPLY], [])

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-timestamp"]')).not.toBeNull()
    })
    // The user's own message keeps its time in the header instead; the reply
    // gets the line-placed time above it.
    const timestamps = container.querySelectorAll('[data-mol-id="chat-timestamp"]')
    expect(timestamps.length).toBeGreaterThan(0)
    const reply = Array.from(container.querySelectorAll('p')).find((element) =>
      element.textContent?.includes('Built it.'),
    )
    expect(reply).toBeDefined()
  })
})

describe('ChatPanel activity cards', () => {
  it("restores the conversation's captured cards and writes this viewer's back", async () => {
    const container = mountPanel([USER_MESSAGE], [ACTIVITY_ENTRY], { conversationId: 'c1' })

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="activity-card-act-1"]')).not.toBeNull()
    })
    expect(container.textContent).toContain('Welcome')
    // Restored from the conversation's own store…
    expect(calls).toContainEqual({
      method: 'GET',
      url: '/projects/p1/conversations/c1/activity-cards',
    })
    // …and written back (a viewer-captured card carries no `received` flag).
    await vi.waitFor(() => {
      const write = calls.find((call) => call.method === 'PUT')
      expect(write).toBeDefined()
      expect(write?.url).toBe('/projects/p1/conversations/c1/activity-cards')
      expect(write?.body).toEqual({ activityCards: [ACTIVITY_ENTRY] })
    })
  })

  it("never writes a read-only viewer's restored cards back", async () => {
    const container = mountPanel([USER_MESSAGE], [ACTIVITY_ENTRY], {
      conversationId: 'c1',
      canEdit: false,
    })

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="activity-card-act-1"]')).not.toBeNull()
    })
    await vi.waitFor(() => {
      expect(calls.some((call) => call.method === 'PUT')).toBe(false)
    })
  })

  it('renders the transcript without cards when the restore fails', async () => {
    const container = mountPanel([USER_MESSAGE], 'reject', { conversationId: 'c1' })

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-user-message"]')).not.toBeNull()
    })
    expect(container.querySelector('[data-mol-id="activity-card-act-1"]')).toBeNull()
    expect(calls.some((call) => call.method === 'PUT')).toBe(false)
  })
})
