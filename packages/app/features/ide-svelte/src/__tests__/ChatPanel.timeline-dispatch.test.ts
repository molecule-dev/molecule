// @vitest-environment jsdom

/**
 * ChatPanel unit U4 — the per-item timeline dispatch and the `chat:activity`
 * slice, mounted through the shared panel harness against the real components.
 *
 * Every timeline item kind reaches its row or card (a chat message, a persisted
 * commit record, a custom system notice, the onboarding tip), a reply's time
 * lands on its own line when the stored preference is on, and the activity
 * slice restores a conversation's captured cards, writes this viewer's cards
 * back, and never writes a read-only viewer's.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { CHAT_TIMESTAMPS_STORAGE_KEY, registerCustomEventCard } from '@molecule/app-ide-panel-logic'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

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
    type: 'email' as const,
    status: 'sent' as const,
    recipient: 'ada@example.test',
    summary: 'Welcome',
    timestamp: '2023-11-14T22:12:30.000Z',
  },
  timestamp: 1_700_000_000_000,
}

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/** The ordered requests the mounted panel made. */
let calls: RecordedCall[] = []

/**
 * An HTTP client that answers the activity-card GET with the given list and
 * records every request; every other request rejects (the panel catches its
 * own).
 *
 * @param activityCards - What the restore returns, or `'reject'` to fail it.
 * @returns The recording client.
 */
function buildHttpClient(activityCards: unknown[] | 'reject'): HttpClient {
  const get = async <T>(url: string): Promise<HttpResponse<T>> => {
    calls.push({ method: 'GET', url })
    if (!url.endsWith('/activity-cards') || activityCards === 'reject') {
      throw new Error('not scripted')
    }
    return responseOf({ activityCards }) as HttpResponse<T>
  }
  const put = async <T>(url: string, body?: unknown): Promise<HttpResponse<T>> => {
    calls.push({ method: 'PUT', url, body })
    return responseOf({}) as HttpResponse<T>
  }
  return { ...buildRejectingHttpClient(), get, put }
}

/** A chat provider that replays the given history and never streams. */
function historyProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
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

beforeEach(() => {
  calls = []
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
  vi.restoreAllMocks()
})

/**
 * Mounts the real panel over the activity-card HTTP client.
 *
 * @param history - The transcript the stub provider replays.
 * @param activityCards - What the activity-card restore returns (`'reject'` to fail it).
 * @param props - Extra panel props.
 * @returns The mount.
 */
function renderPanel(
  history: ChatMessage[],
  activityCards: unknown[] | 'reject',
  props: Record<string, unknown> = {},
): PanelMount {
  mounted?.unmount()
  mounted = mountPanel({
    http: buildHttpClient(activityCards),
    chat: historyProvider(history),
    projectId: 'p1',
    props: { endpoint: '/projects/p1/chat?conversationId=c1', ...props } as never,
  })
  return mounted
}

describe('ChatPanel timeline dispatch (U4)', () => {
  it('renders a message row, a persisted commit card and a plain system notice', async () => {
    registerCustomEventCard('t_notice', () => ({ text: 'A plain provider notice.' }))
    const { container } = renderPanel(
      [
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
          role: 'assistant',
          content: '',
          timestamp: 1_700_000_003_000,
          commitRecord: { message: 'feat: the first build', files: ['src/app.ts'] },
        },
      ],
      [],
    )

    await vi.waitFor(() => {
      expect(container.querySelectorAll('[data-mol-id="chat-user-message"]').length).toBe(1)
    })
    expect(container.querySelector('[data-mol-id="chat-user-message"]')?.textContent).toContain(
      'Build the thing',
    )
    expect(container.textContent).toContain('Built it.')
    // The system-card kind: a plain, tone-less notice is one muted inline line.
    expect(container.textContent).toContain('A plain provider notice.')
    // A persisted commit record renders its card, not a message row.
    expect(container.textContent).toContain('feat: the first build')
    expect(
      container.querySelectorAll('[data-mol-id="chat-user-message"]').length,
      'the commit record is not a second message row',
    ).toBe(1)
  })

  it('renders the onboarding tip and dismissing it reveals the empty hint', async () => {
    const { container } = renderPanel([], [], {
      // A fresh conversation: no endpoint conversation id, no discovery.
      endpoint: '/projects/p1/chat',
    })

    const tip = await vi.waitFor(() => {
      const element = container.querySelector<HTMLElement>('[data-mol-id="chat-tip-card"]')
      if (!element) throw new Error('missing chat-tip-card')
      return element
    })
    expect(tip.textContent?.length).toBeGreaterThan(0)

    const dismiss = container.querySelector<HTMLButtonElement>('[data-mol-id="chat-tip-dismiss"]')
    if (!dismiss) throw new Error('missing chat-tip-dismiss')
    dismiss.click()
    await flush()

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="chat-tip-card"]')).toBeNull()
    })
    expect(container.querySelector('[data-mol-id="chat-empty-hint"]')).not.toBeNull()
  })

  it('puts a reply’s time on its own line when the stored preference is on', async () => {
    localStorage.setItem(CHAT_TIMESTAMPS_STORAGE_KEY, 'true')
    const now = Date.now()
    const replyAt = now - 600_000
    const history: ChatMessage[] = [
      { ...USER_MESSAGE, timestamp: now - 3_600_000 },
      { ...REPLY, timestamp: replyAt },
    ]
    const { container } = renderPanel(history, [])

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Built it.')
    })
    const replyTime = new Date(replyAt).toISOString()
    const stamps = Array.from(
      container.querySelectorAll<HTMLTimeElement>('[data-mol-id="chat-timestamp"]'),
    )
    const line = stamps.find((stamp) => stamp.getAttribute('datetime') === replyTime)
    expect(line, 'the reply carries its own line-placed time').toBeDefined()
    // The line sits outside every message row (a header time lives inside one).
    expect(line?.closest('[data-mol-id="chat-user-message"]')).toBeNull()
  })
})

describe('ChatPanel activity cards (chat:activity)', () => {
  it('restores a conversation’s cards and writes this viewer’s back', async () => {
    const { container } = renderPanel([], [ACTIVITY_ENTRY])

    await vi.waitFor(() => {
      expect(
        container.querySelector('[data-mol-id="activity-card-act-1"]'),
        'the restored card renders in the timeline',
      ).not.toBeNull()
    })

    await vi.waitFor(() => {
      expect(calls.filter((call) => call.method === 'PUT').length).toBe(1)
    })
    const put = calls.find((call) => call.method === 'PUT')
    expect(put?.url).toBe('/projects/p1/conversations/c1/activity-cards')
    expect(put?.body).toEqual({ activityCards: [ACTIVITY_ENTRY] })
  })

  it('never writes a read-only viewer’s restored cards', async () => {
    const { container } = renderPanel([], [ACTIVITY_ENTRY], { canEdit: false })

    await vi.waitFor(() => {
      expect(container.querySelector('[data-mol-id="activity-card-act-1"]')).not.toBeNull()
    })
    await flush()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
  })

  it('leaves the transcript intact when the restore fails, with no write', async () => {
    const { container } = renderPanel([USER_MESSAGE, REPLY], 'reject')

    await vi.waitFor(() => {
      expect(container.textContent).toContain('Built it.')
    })
    await flush()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(calls.filter((call) => call.method === 'PUT')).toHaveLength(0)
    expect(container.querySelector('[data-mol-id="activity-card-act-1"]')).toBeNull()
  })
})
