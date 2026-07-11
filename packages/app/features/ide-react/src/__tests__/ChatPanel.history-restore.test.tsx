// @vitest-environment jsdom

/**
 * History-restore-on-refresh regression guard.
 *
 * Symptom (reported): after a page refresh the IDE chat showed "everything gone
 * but a few things" — the whole persisted conversation (discovery Q&A, plan,
 * etc.) vanished even though the server still held it and returned it.
 *
 * Root cause: ChatPanel computed `loadOnMount` as
 *   `hasConversation || (!initialMessage && !initialInputValue)`
 * On a refresh, Workspace re-seeds `initialInputValue` from a stale
 * `mol_initial_prompt` localStorage entry (the prompt→chat morph fallback). With
 * the conversation id absent from the endpoint (`hasConversation === false`),
 * that made `loadOnMount === false`, so the on-mount history load never ran and
 * the existing conversation rendered EMPTY. Suppressing the load was unnecessary —
 * useChat.loadHistory already refuses to overwrite a non-empty (streaming) store —
 * so the fix is to always load history on mount.
 *
 * This is a real jsdom render of the actual {@link ChatPanel}, mirroring the
 * sibling automatic-message test: a stub `ChatProvider.loadHistory` returns a
 * persisted conversation, and we assert it renders EVEN WHEN `initialInputValue`
 * is set and the endpoint carries no conversation id. Reverting the fix
 * (restoring the `loadOnMount` suppression) makes these assertions time out.
 *
 * @module
 */

import { render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
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
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'

// ── Stubs (mirrors ChatPanel.automatic-message.test.tsx) ────────────────────

function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

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

function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length(): number {
      return store.size
    },
    clear(): void {
      store.clear()
    },
    getItem(key: string): string | null {
      const value = store.get(key)
      return value === undefined ? null : value
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
  }
}

function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const USER_PROMPT = 'An e-learning platform with quizzes and certificates'
const ASSISTANT_TEXT = 'Saved the plan — building it now.'

/**
 * A persisted discovery conversation: the opening user prompt, a discovery
 * `ask_user` turn whose ONLY block is a resolved tool_call (empty text content —
 * exactly the shape that vanished on refresh), and a closing assistant message.
 * @returns The seeded history for `loadHistory`.
 */
function seededHistory(): ChatMessage[] {
  return [
    { id: 'u1', role: 'user', content: USER_PROMPT, timestamp: 1000 },
    {
      id: 'a-ask',
      role: 'assistant',
      content: '',
      timestamp: 2000,
      blocks: [{ type: 'tool_call', id: 'tc-ask' }],
      toolCalls: [
        {
          id: 'tc-ask',
          name: 'ask_user',
          input: { question: 'What quiz question types do you need?' },
          output: 'Multiple choice + true/false',
          status: 'done',
        },
      ],
    },
    { id: 'a-final', role: 'assistant', content: ASSISTANT_TEXT, timestamp: 3000 },
  ]
}

/**
 * Renders {@link ChatPanel} with a stale `initialInputValue` (the leftover
 * `mol_initial_prompt` morph seed) and NO conversation id in the endpoint —
 * the exact refresh shape that used to suppress the history load.
 * @returns The wrapped element.
 */
function renderChatPanel(): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={buildChatProvider(seededHistory())}>
            {children}
          </ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
  // initialInputValue set + no conversationId in the endpoint = the refresh case
  // where the old `loadOnMount` was false and the conversation never loaded.
  return wrap(
    <ChatPanel projectId="proj-refresh" userAvatar={null} initialInputValue={USER_PROMPT} />,
  )
}

beforeEach(() => {
  setClassMap(classMap)
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
  document.body.innerHTML = ''
})

describe('ChatPanel history restore on refresh (loadOnMount)', () => {
  it('loads the persisted conversation on mount even when initialInputValue is set and the endpoint has no conversation id', async () => {
    const { container } = render(renderChatPanel())

    // The persisted user prompt AND the closing assistant message both render —
    // proving the on-mount history load ran despite the stale initialInputValue.
    await waitFor(() => {
      expect(container.textContent).toContain(USER_PROMPT)
    })
    expect(container.textContent).toContain(ASSISTANT_TEXT)
  })

  it('restores a discovery turn whose only block is a resolved tool_call (empty content)', async () => {
    const { container } = render(renderChatPanel())

    // The ask_user turn carried no text — just a tool_call block. It is exactly
    // the message shape that disappeared on refresh; it must render its question.
    await waitFor(() => {
      expect(container.textContent).toContain('What quiz question types do you need?')
    })
  })
})

describe('ChatPanel resource-limit (OOM) upgrade banner', () => {
  const oomHistory = (): ChatMessage[] => [
    { id: 'u1', role: 'user', content: 'add 2fa', timestamp: 1000 },
    {
      id: 'a-oom',
      role: 'assistant',
      content: '',
      timestamp: 2000,
      blocks: [
        {
          type: 'resource_limit',
          resource: 'memory',
          message: 'A process ran out of memory. Upgrade for more sandbox resources.',
        },
      ],
    },
  ]

  it('renders the host upgrade buttons through the shared notice card (no bespoke svg)', async () => {
    const wrap = (children: ReactNode): ReactElement => (
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <ThemeProvider provider={buildThemeProvider()}>
          <HttpProvider client={buildHttpClient()}>
            <ChatContextProvider provider={buildChatProvider(oomHistory())}>
              {children}
            </ChatContextProvider>
          </HttpProvider>
        </ThemeProvider>
      </I18nProvider>
    )
    const { container } = render(
      wrap(
        <ChatPanel
          projectId="proj-oom"
          userAvatar={null}
          buildUpgradeCta={() => [
            { label: 'Sign up', href: '/signup' },
            { label: 'Log in', href: '/login' },
          ]}
        />,
      ),
    )

    await waitFor(() => expect(container.textContent).toContain('ran out of memory'))
    // The OOM block renders through the SAME notice-card structure as every other
    // upgrade notice — not a one-off banner.
    const card = container.querySelector('[data-mol-id="chat-notice-card"]')
    expect(card).toBeTruthy()
    // It now carries the host's sign-in/upgrade BUTTONS (previously it had none).
    expect(card?.querySelector('a[href="/signup"]')).toBeTruthy()
    expect(card?.querySelector('a[href="/login"]')).toBeTruthy()
    // And NOT the old bespoke raw <svg> warning triangle (the inconsistent icon).
    expect(card?.querySelector('svg path[d^="M8.485"]')).toBeNull()
  })
})
