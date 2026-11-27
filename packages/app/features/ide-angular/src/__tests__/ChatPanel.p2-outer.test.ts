// @vitest-environment jsdom
/**
 * Unit P2 of the ChatPanel port: the outer panel's conversation state, the
 * history header and dropdown, the new-chat / select flows and the chatKey
 * remount.
 *
 * Port of `@molecule/app-ide-react/src/__tests__`'s conversation-header
 * coverage (the `history: ` cases the conformance kit derives from it), run
 * against the real `ChatPanel` with a scripted HTTP bond, so the requests,
 * storage reads/writes and the rendered header are the ones a host sees.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { resetChatStoresForTests } from '@molecule/app-angular/chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
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
  responseOf,
  settle,
} from './chat-panel-harness.js'

/** The project every case mounts. */
const PROJECT_ID = 'p1'

/** The conversation storage key React uses for {@link PROJECT_ID}. */
const STORAGE_KEY = `mol-chat-conv:${PROJECT_ID}`

/** The conversation-list endpoint the outer panel fetches. */
const LIST_URL = `/projects/${PROJECT_ID}/conversations`

/**
 * The conversation-list fetches among a mount's requests: the panel's other mount requests
 * (context usage, git status, preferences) are its inner chat's, not the outer panel's.
 *
 * @param calls - Every recorded request.
 * @returns The GETs of {@link LIST_URL}, in order.
 */
const listFetches = (calls: RecordedRequest[]): RecordedRequest[] =>
  calls.filter((call) => call.method === 'GET' && call.url === LIST_URL)

/** One conversation row as the server lists it. */
const conv = (id: string, preview: string | null): Record<string, unknown> => ({
  id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:05:00.000Z',
  preview,
})

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/** The requests a scripted client saw, in order. */
interface RecordedRequest {
  /** The HTTP method. */
  method: string
  /** The requested URL. */
  url: string
  /** The request body, when there was one. */
  body?: unknown
}

/**
 * Builds an HTTP bond that records every call and answers through `handler`.
 * @param handler - Answers a request, or rejects to simulate a failure.
 * @param calls - The recording list to append to.
 * @returns The client.
 */
function buildScriptedHttp(
  handler: (method: string, url: string, body?: unknown) => unknown,
  calls: RecordedRequest[],
): HttpClient {
  const run = (method: string, url: string, body?: unknown): Promise<HttpResponse<never>> => {
    calls.push({ method, url, body })
    try {
      return Promise.resolve(responseOf(handler(method, url, body)))
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return {
    ...buildRejectingHttpClient(),
    get: (url: string) => run('GET', url),
    post: (url: string, body?: unknown) => run('POST', url, body),
  }
}

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
 * Queries one element, failing loudly when the header did not render it.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function required(selector: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(selector)
  if (!element) throw new Error(`expected ${selector} to render`)
  return element
}

/**
 * Clicks an element and lets the panel settle.
 * @param element - The element to click.
 */
async function click(element: Element): Promise<void> {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await settle(mounted)
}

describe('ChatPanel outer panel (P2)', () => {
  it(
    'fetches the conversation list on mount and titles the header from the saved conversation',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      localStorage.setItem(STORAGE_KEY, 'c1')
      const calls: RecordedRequest[] = []
      const http = buildScriptedHttp(
        () => ({ conversations: [conv('c1', 'Build a todo app')] }),
        calls,
      )
      mounted = await mountPanel({ http, chat: buildChatProvider([]), projectId: PROJECT_ID })
      await settle(mounted)

      expect(listFetches(calls)).toEqual([{ method: 'GET', url: LIST_URL }])
      const toggle = required('[data-mol-id="chat-conversation-toggle"]')
      expect(toggle.textContent).toContain('Build a todo app')
    },
  )

  it(
    'renders no header and fetches no list when the host renders its own chrome',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const calls: RecordedRequest[] = []
      const http = buildScriptedHttp(() => ({ conversations: [] }), calls)
      mounted = await mountPanel({
        http,
        chat: buildChatProvider([]),
        projectId: PROJECT_ID,
        props: { renderConversationHeader: false },
      })
      await settle(mounted)

      expect(document.querySelector('[data-mol-id="chat-conversation-toggle"]')).toBeNull()
      expect(listFetches(calls)).toEqual([])
    },
  )

  it(
    'opens the dropdown, refetches, lists rows and filters them by the search',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      localStorage.setItem(STORAGE_KEY, 'c2')
      const calls: RecordedRequest[] = []
      const http = buildScriptedHttp(
        () => ({
          conversations: [
            conv('c1', 'Build a todo app'),
            conv('c2', 'Fix the login bug'),
            conv('c3', null),
          ],
        }),
        calls,
      )
      mounted = await mountPanel({ http, chat: buildChatProvider([]), projectId: PROJECT_ID })
      await settle(mounted)

      const toggle = required('[data-mol-id="chat-conversation-toggle"]')
      expect(toggle.textContent, 'the title names the open conversation').toContain(
        'Fix the login bug',
      )

      await click(toggle)
      expect(document.querySelector('[data-mol-id="chat-conversation-c1"]')).not.toBeNull()
      expect(
        document.querySelector('[data-mol-id="chat-conversation-c3"]')?.textContent,
        'a row without a preview shows the new-conversation label',
      ).toContain('New conversation')
      expect(listFetches(calls), 'opening the dropdown refetches the list').toHaveLength(2)

      const search = required('input[placeholder="Search conversations…"]') as HTMLInputElement
      expect(document.activeElement, 'opening the dropdown focuses its search field').toBe(search)
      search.value = 'todo'
      search.dispatchEvent(new Event('input', { bubbles: true }))
      await settle(mounted)

      expect(document.querySelector('[data-mol-id="chat-conversation-c1"]')).not.toBeNull()
      expect(document.querySelector('[data-mol-id="chat-conversation-c2"]')).toBeNull()
      expect(
        toggle.textContent,
        'the title still names the open conversation when the search hides its row',
      ).toContain('Fix the login bug')

      search.value = 'zzz'
      search.dispatchEvent(new Event('input', { bubbles: true }))
      await settle(mounted)

      expect(document.body.textContent).toContain('No conversations yet')
    },
  )

  it(
    'creates a conversation, persists it and closes the dropdown',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      localStorage.setItem(STORAGE_KEY, 'c1')
      const calls: RecordedRequest[] = []
      const http = buildScriptedHttp((method, url) => {
        if (method === 'POST' && url === `/projects/${PROJECT_ID}/conversations`) {
          return { id: 'c-new' }
        }
        return { conversations: [conv('c1', 'Build a todo app')] }
      }, calls)
      mounted = await mountPanel({ http, chat: buildChatProvider([]), projectId: PROJECT_ID })
      await settle(mounted)

      await click(required('[data-mol-id="chat-new-conversation"]'))

      expect(calls).toContainEqual({
        method: 'POST',
        url: `/projects/${PROJECT_ID}/conversations`,
        body: {},
      })
      expect(localStorage.getItem(STORAGE_KEY)).toBe('c-new')
      expect(document.querySelector('input[placeholder="Search conversations…"]')).toBeNull()
    },
  )

  it(
    'falls back to a client-side key and clears the stored id when the create fails',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      localStorage.setItem(STORAGE_KEY, 'c1')
      const http = buildScriptedHttp((method) => {
        if (method === 'POST') throw new Error('create failed')
        return { conversations: [conv('c1', 'Build a todo app')] }
      }, [])
      mounted = await mountPanel({ http, chat: buildChatProvider([]), projectId: PROJECT_ID })
      await settle(mounted)

      await click(required('[data-mol-id="chat-new-conversation"]'))

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      expect(document.querySelector('input[placeholder="Search conversations…"]')).toBeNull()
    },
  )

  it(
    'selecting a conversation remembers it and closes the dropdown',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const http = buildScriptedHttp(
        () => ({ conversations: [conv('c1', 'Build a todo app'), conv('c2', 'Fix the bug')] }),
        [],
      )
      mounted = await mountPanel({ http, chat: buildChatProvider([]), projectId: PROJECT_ID })
      await settle(mounted)

      await click(required('[data-mol-id="chat-conversation-toggle"]'))
      await click(required('[data-mol-id="chat-conversation-c2"]'))

      expect(localStorage.getItem(STORAGE_KEY)).toBe('c2')
      expect(document.querySelector('input[placeholder="Search conversations…"]')).toBeNull()
    },
  )

  it('a viewer gets no new-chat button', { timeout: PANEL_TEST_TIMEOUT_MS }, async () => {
    const http = buildScriptedHttp(() => ({ conversations: [] }), [])
    mounted = await mountPanel({
      http,
      chat: buildChatProvider([]),
      projectId: PROJECT_ID,
      props: { canEdit: false },
    })
    await settle(mounted)

    expect(document.querySelector('[data-mol-id="chat-new-conversation"]')).toBeNull()
    expect(document.querySelector('[data-mol-id="chat-report-button"]')).not.toBeNull()
  })

  it(
    'closes the dropdown on an outside mousedown but not on one inside it',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const http = buildScriptedHttp(
        () => ({ conversations: [conv('c1', 'Build a todo app')] }),
        [],
      )
      mounted = await mountPanel({ http, chat: buildChatProvider([]), projectId: PROJECT_ID })
      await settle(mounted)

      await click(required('[data-mol-id="chat-conversation-toggle"]'))
      const inside = required('[data-mol-id="chat-conversation-c1"]')
      inside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await settle(mounted)
      expect(
        document.querySelector('input[placeholder="Search conversations…"]'),
        'a mousedown inside the header keeps the dropdown open',
      ).not.toBeNull()

      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await settle(mounted)
      expect(document.querySelector('input[placeholder="Search conversations…"]')).toBeNull()
    },
  )

  it(
    'hideConversationMenu removes the header but still fetches the list',
    { timeout: PANEL_TEST_TIMEOUT_MS },
    async () => {
      const calls: RecordedRequest[] = []
      const http = buildScriptedHttp(() => ({ conversations: [] }), calls)
      mounted = await mountPanel({
        http,
        chat: buildChatProvider([]),
        projectId: PROJECT_ID,
        props: { hideConversationMenu: true },
      })
      await settle(mounted)

      expect(document.querySelector('[data-mol-id="chat-conversation-toggle"]')).toBeNull()
      expect(listFetches(calls)).toHaveLength(1)
    },
  )
})

describe('chat:popups slice (P2)', () => {
  it('accepts React setState values and updaters for every field', async () => {
    const { ChatPopups } = await import('../components/chat-panel/chat-popups.slice.js')
    const popups = new ChatPopups()
    popups.setMentionStart(3)
    expect(popups.mentionStart()).toBe(3)
    popups.setMentionStart((prev) => prev + 1)
    expect(popups.mentionStart()).toBe(4)
    popups.setAttachmentError('too large')
    popups.setAttachmentError(null)
    expect(popups.attachmentError()).toBeNull()
    popups.setSystemCards((prev) => [...prev, { id: 'a', text: 'hi', timestamp: 1 }])
    expect(popups.systemCards()).toHaveLength(1)
    popups.setReportModal({ title: 'Bug' })
    expect(popups.reportModal()).toEqual({ title: 'Bug' })
    popups.setShareModal({ role: 'viewer' })
    expect(popups.shareModal()).toEqual({ role: 'viewer' })
  })
})
