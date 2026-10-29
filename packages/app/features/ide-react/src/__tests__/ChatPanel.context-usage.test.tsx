// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  ChatProvider as ChatContextProvider,
  HttpProvider,
  I18nProvider,
  resetChatStoresForTests,
  ThemeProvider,
} from '@molecule/app-react'
import type { ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { lightTheme } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'

const themeProvider: ThemeProviderType = {
  getTheme: () => lightTheme,
  getThemes: () => [lightTheme],
  setTheme: () => {},
  toggleMode: () => {},
  subscribe: () => () => {},
}
const provider: ChatProvider = {
  name: 'test',
  sendMessage: async () => {},
  abort: () => {},
  clearHistory: async () => {},
  loadHistory: async () => [],
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  resetChatStoresForTests()
  for (const name of ['localStorage', 'sessionStorage']) {
    const values = new Map<string, string>()
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: {
        get length() {
          return values.size
        },
        clear: () => values.clear(),
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
        key: (index: number) => [...values.keys()][index] ?? null,
      },
    })
  }
  Element.prototype.scrollIntoView = (): void => {}
})
afterEach(() => {
  cleanup()
  resetChatStoresForTests()
})

it('renders pre-dispatch usage and live compaction before an assistant message, then clears on conversation switch', async () => {
  let push: ((conversationId: string, event: ChatStreamEvent) => void) | null = null
  let resolveHistory!: (value: unknown) => void
  const get = vi.fn(async (url: string) => {
    if (url === '/projects/context-test/chat-usage?conversationId=one')
      return {
        data: {
          inputTokens: 1000,
          outputTokens: 2000,
          cacheReadInputTokens: 5000,
          allowancePercent: 40,
          allowanceWindow: 'billing-period',
        },
      }
    if (url.includes('/chat?conversationId=one'))
      return new Promise((resolve) => {
        resolveHistory = resolve
      })
    if (url.includes('/chat?conversationId=two')) return { data: {} }
    throw new Error('Unused endpoint in test')
  })
  const http = {
    baseURL: '',
    defaultHeaders: {},
    get,
    request: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  } as unknown as HttpClient
  const panel = (conversationId: string) => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={themeProvider}>
        <HttpProvider client={http}>
          <ChatContextProvider provider={provider}>
            <ChatPanel
              projectId="context-test"
              conversationId={conversationId}
              endpoint="/projects/context-test/chat"
              onRegisterPushHandler={(handler) => {
                push = handler
              }}
              userAvatar={null}
            />
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  const { rerender } = render(panel('one'))
  await waitFor(() => expect(push).not.toBeNull())
  act(() =>
    push?.('one', {
      type: 'context_usage',
      usage: {
        requestId: 'request-2',
        at: '2026-10-20T10:01:00Z',
        inputTokens: 5000,
        contextWindow: 100000,
        backgroundCompactAtTokens: 10000,
      },
    }),
  )
  expect(screen.getByRole('button', { name: /Context usage/ }).textContent).toContain('50%')
  await act(async () =>
    resolveHistory({
      data: {
        contextUsage: {
          requestId: 'request-1',
          at: '2026-10-20T10:00:00Z',
          inputTokens: 1000,
          contextWindow: 100000,
          backgroundCompactAtTokens: 10000,
        },
      },
    }),
  )
  expect(screen.getByRole('button', { name: /Context usage/ }).textContent).toContain('50%')
  act(() =>
    push?.('one', {
      type: 'compaction',
      compactedCount: 10,
      remainingCount: 3,
      summary: 'summary',
      at: '2026-10-20T10:01:30Z',
      beforeChars: 50000,
      afterChars: 5000,
      elapsedMs: 3000,
    }),
  )
  fireEvent.click(screen.getByRole('button', { name: /Context usage/ }))
  expect(screen.getByText(/50,000 → 5,000 characters · 3s/)).toBeTruthy()
  await screen.findByText('~60% remaining')
  expect(screen.getByText('8.0K tokens')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Chat settings' })).toBeTruthy()
  fireEvent.keyDown(document, { key: 'Escape' })
  await act(async () => rerender(panel('two')))
  expect(screen.queryByRole('button', { name: /Context usage/ })).toBeNull()
})
