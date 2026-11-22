// @vitest-environment jsdom
/**
 * The outer `ChatPanel` unit: the conversation-selector header, its list and
 * selection, the new-chat request, the `chatKey` remount gate and the
 * `hideConversationMenu` headless switch.
 *
 * React's `ChatPanel` fetches the project's conversations once on mount (the
 * child's effects run first, which the panel reproduces with `tick()`), opens
 * the history dropdown on the header button, persists a selected conversation
 * under the project's storage key, and POSTs a new conversation before
 * remounting the inner chat. These are the observable halves the conformance
 * kit will compare; the DOM assertions pin the same attributes, classes and
 * text React renders.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { setIconSet } from '@molecule/app-icons'
import { chatConversationStorageKey } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

/** One conversation the list endpoint returns. */
const CONVERSATIONS = [
  {
    id: 'c-alpha',
    preview: 'Build the landing page',
    updatedAt: '2026-11-19T10:00:00.000Z',
  },
  {
    id: 'c-beta',
    preview: null,
    updatedAt: '2026-11-18T10:00:00.000Z',
  },
]

/**
 * An HTTP client that records every request and answers the conversation
 * routes; any other route rejects, as a live backend would.
 *
 * @param calls - Receives `method url` for each request, in order.
 * @param createdId - The id the create route answers with.
 * @returns The recording client.
 */
function buildHttp(calls: string[], createdId = 'c-created'): HttpClient {
  const base = buildRejectingHttpClient()
  return {
    ...base,
    get: async <T>(url: string): Promise<HttpResponse<T>> => {
      calls.push(`get ${url}`)
      return responseOf({ conversations: CONVERSATIONS }) as HttpResponse<T>
    },
    post: async <T>(url: string): Promise<HttpResponse<T>> => {
      calls.push(`post ${url}`)
      return responseOf({ id: createdId }) as HttpResponse<T>
    },
  }
}

/**
 * The recorded requests to the conversation-list endpoint. The panel's mount
 * also reads the catalog, the project settings, the git status and the skills
 * list (unit P3); this file is about the header's list only.
 *
 * @param calls - Every recorded call.
 * @returns The conversation-list calls, in order.
 */
function conversationCalls(calls: string[]): string[] {
  return calls.filter((call) => call.endsWith('/conversations'))
}

/**
 * Polls until `predicate` stops throwing.
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

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  vi.restoreAllMocks()
})

describe('ChatPanel outer panel', () => {
  it('fetches the conversation list on mount and titles the header from it', async () => {
    const calls: string[] = []
    mounted = mountPanel({ http: buildHttp(calls), chat: buildChatProvider([]), projectId: 'p1' })

    await waitFor(() => {
      expect(conversationCalls(calls)).toEqual(['get /projects/p1/conversations'])
    })
    const toggle = mounted.container.querySelector('[data-mol-id="chat-conversation-toggle"]')
    expect(toggle, 'the header renders the conversation disclosure').not.toBeNull()
    expect(toggle?.textContent?.trim()).toBe('Chat history')
  })

  it('renders React’s header buttons and their accessible names', async () => {
    mounted = mountPanel({
      http: buildHttp([]),
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { canShare: true },
    })
    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-mol-id="chat-share-button"]')).not.toBeNull()
    })
    const container = mounted.container
    const share = container.querySelector('[data-mol-id="chat-share-button"]')
    const report = container.querySelector('[data-mol-id="chat-report-button"]')
    const settings = container.querySelector('[data-mol-id="chat-settings-button"]')
    const newChat = container.querySelector('[data-mol-id="chat-new-conversation"]')
    expect(share?.getAttribute('aria-label')).toBe('Share project')
    expect(report?.getAttribute('aria-label')).toBe('Report a bug')
    expect(settings?.getAttribute('aria-label')).toBe('Settings')
    expect(newChat?.getAttribute('title')).toBe('New chat')
    expect(newChat?.textContent?.trim()).toBe('+')
  })

  it('hides the new-chat button for a viewer and the share button below the share gate', async () => {
    mounted = mountPanel({
      http: buildHttp([]),
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { canEdit: false, canShare: false },
    })
    await waitFor(() => {
      expect(mounted?.container.querySelector('[data-mol-id="chat-report-button"]')).not.toBeNull()
    })
    const container = mounted.container
    expect(container.querySelector('[data-mol-id="chat-new-conversation"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-share-button"]')).toBeNull()
  })

  it('opens the dropdown, focuses its search field and re-fetches the list', async () => {
    const calls: string[] = []
    mounted = mountPanel({ http: buildHttp(calls), chat: buildChatProvider([]), projectId: 'p1' })
    const container = mounted.container
    await waitFor(() => {
      expect(conversationCalls(calls).length).toBe(1)
    })

    container.querySelector<HTMLButtonElement>('[data-mol-id="chat-conversation-toggle"]')?.click()

    const search = await vi.waitFor(() => {
      const input = container.querySelector<HTMLInputElement>(
        'input[placeholder="Search conversations…"]',
      )
      expect(input).not.toBeNull()
      return input as HTMLInputElement
    })
    await waitFor(() => {
      expect(document.activeElement).toBe(search)
    })
    await waitFor(() => {
      expect(conversationCalls(calls)).toEqual([
        'get /projects/p1/conversations',
        'get /projects/p1/conversations',
      ])
    })
  })

  it('lists the conversations and persists the one the user selects', async () => {
    mounted = mountPanel({ http: buildHttp([]), chat: buildChatProvider([]), projectId: 'p1' })
    const container = mounted.container
    const toggle = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-conversation-toggle"]',
      )
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    toggle.click()

    const row = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-conversation-c-alpha"]',
      )
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    expect(row.textContent).toContain('Build the landing page')
    // React renders a bare 'New conversation' for a row with no preview.
    expect(
      container.querySelector('[data-mol-id="chat-conversation-c-beta"]')?.textContent,
    ).toContain('New conversation')

    row.click()
    await waitFor(() => {
      expect(localStorage.getItem(chatConversationStorageKey('p1'))).toBe('c-alpha')
    })
    expect(container.querySelector('input[placeholder="Search conversations…"]')).toBeNull()
  })

  it('creates a conversation on the new-chat button and stores its id', async () => {
    const calls: string[] = []
    mounted = mountPanel({
      http: buildHttp(calls, 'c-new'),
      chat: buildChatProvider([]),
      projectId: 'p1',
    })
    const container = mounted.container
    const newChat = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-new-conversation"]',
      )
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })

    newChat.click()
    await waitFor(() => {
      expect(calls).toContain('post /projects/p1/conversations')
    })
    await waitFor(() => {
      expect(localStorage.getItem(chatConversationStorageKey('p1'))).toBe('c-new')
    })
  })

  it('closes the dropdown on an outside mousedown', async () => {
    mounted = mountPanel({ http: buildHttp([]), chat: buildChatProvider([]), projectId: 'p1' })
    const container = mounted.container
    const toggle = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>(
        '[data-mol-id="chat-conversation-toggle"]',
      )
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    toggle.click()
    await vi.waitFor(() => {
      expect(container.querySelector('input[placeholder="Search conversations…"]')).not.toBeNull()
    })

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await waitFor(() => {
      expect(container.querySelector('input[placeholder="Search conversations…"]')).toBeNull()
    })
  })

  it('renders no header in headless mode (hideConversationMenu)', async () => {
    mounted = mountPanel({
      http: buildHttp([]),
      chat: buildChatProvider([]),
      projectId: 'p1',
      props: { hideConversationMenu: true },
    })
    const container = mounted.container
    expect(container.querySelector('[data-mol-id="chat-conversation-toggle"]')).toBeNull()
    expect(container.querySelector('[data-mol-id="chat-report-button"]')).toBeNull()
  })
})
