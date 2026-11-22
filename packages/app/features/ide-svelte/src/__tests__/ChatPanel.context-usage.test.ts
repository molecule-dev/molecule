// @vitest-environment jsdom
/**
 * The context-usage ring: pre-dispatch usage and live compaction from the
 * stream, a slow history response never replacing provider-reported usage, and
 * a conversation switch clearing it.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.context-usage.test.tsx`
 * with the same test name and the same expected values. The panel reads the
 * conversation's stored usage from its chat endpoint and the live sample from
 * the stream; the ring, its breakdown, the completed compactions and the
 * session totals are the shared indicator's.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

const PROJECT_ID = 'context-test'

/** A chat provider that loads empty history and never streams. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'test',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (): Promise<ChatMessage[]> => [],
  }
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
  setProvider(createSimpleI18nProvider())
})

it('renders pre-dispatch usage and live compaction before an assistant message, then clears on conversation switch', async () => {
  const pushHandler: { push: ((conversationId: string, event: ChatStreamEvent) => void) | null } = {
    push: null,
  }
  let resolveHistory: (value: HttpResponse<never>) => void = () => {}
  const get = (url: string): Promise<HttpResponse<never>> => {
    if (url === `/projects/${PROJECT_ID}/chat-usage?conversationId=one`)
      return Promise.resolve(
        responseOf({
          inputTokens: 1000,
          outputTokens: 2000,
          cacheReadInputTokens: 5000,
          allowancePercent: 40,
          allowanceWindow: 'billing-period',
        }),
      )
    if (url.includes('/chat?conversationId=one'))
      return new Promise((resolve) => {
        resolveHistory = resolve
      })
    if (url.includes('/chat?conversationId=two')) return Promise.resolve(responseOf({}))
    return Promise.reject(new Error('Unused endpoint in test'))
  }
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const http: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
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

  mounted?.unmount()
  mounted = mountPanel({
    http,
    chat: buildChatProvider(),
    props: {
      projectId: PROJECT_ID,
      endpoint: `/projects/${PROJECT_ID}/chat`,
      conversationId: 'one',
      onRegisterPushHandler: (handler) => {
        pushHandler.push = handler
      },
    },
  })
  await vi.waitFor(() => expect(pushHandler.push).not.toBeNull())

  const usageButton = (): HTMLElement => {
    const element = document.querySelector<HTMLElement>('[data-mol-id="chat-context-usage"]')
    if (!element) throw new Error('the context-usage trigger should render')
    return element
  }

  pushHandler.push?.('one', {
    type: 'context_usage',
    usage: {
      requestId: 'request-2',
      at: '2026-10-20T10:01:00Z',
      inputTokens: 5000,
      contextWindow: 100000,
      backgroundCompactAtTokens: 10000,
    },
  })
  await vi.waitFor(() => expect(usageButton().textContent).toContain('50%'))

  await Promise.resolve(
    resolveHistory(
      responseOf({
        contextUsage: {
          requestId: 'request-1',
          at: '2026-10-20T10:00:00Z',
          inputTokens: 1000,
          contextWindow: 100000,
          backgroundCompactAtTokens: 10000,
        },
      }),
    ),
  )
  expect(usageButton().textContent).toContain('50%')

  pushHandler.push?.('one', {
    type: 'compaction',
    compactedCount: 10,
    remainingCount: 3,
    summary: 'summary',
    at: '2026-10-20T10:01:30Z',
    beforeChars: 50000,
    afterChars: 5000,
    elapsedMs: 3000,
  })
  usageButton().click()
  await vi.waitFor(() =>
    expect(document.body.textContent).toContain('50,000 → 5,000 characters · 3s'),
  )
  await vi.waitFor(() => expect(document.body.textContent).toContain('~60% remaining'))
  expect(document.body.textContent).toContain('8.0K tokens')
  expect(
    Array.from(document.querySelectorAll('button')).some(
      (button) => button.textContent === 'Chat settings',
    ),
  ).toBe(true)
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await vi.waitFor(() =>
    expect(document.querySelector('[data-mol-id="chat-context-usage"]')).not.toBeNull(),
  )
  mounted.setProps({ conversationId: 'two' })
  await flush()
  await vi.waitFor(() =>
    expect(document.querySelector('[data-mol-id="chat-context-usage"]')).toBeNull(),
  )
})
