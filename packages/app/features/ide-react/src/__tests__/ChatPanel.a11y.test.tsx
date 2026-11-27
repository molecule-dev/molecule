// @vitest-environment jsdom

/**
 * ChatPanel's keyboard and dialog semantics, moved off static elements.
 *
 * `autoFocus` is gone from the queued-message editor and the conversation
 * search field: each opens because the user just asked for it, so focus moves
 * in from a ref in an effect (the WAI-ARIA pattern for a popover that opened).
 * The panel overlay above the composer is a non-modal dialog, named from the
 * same key its header title renders and closable with Escape from anywhere
 * inside it.
 *
 * @module
 */

import { fireEvent, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider, I18nProvider, ThemeProvider } from '@molecule/app-react'
import {
  ChatProvider as ChatContextProvider,
  resetChatStoresForTests,
} from '@molecule/app-react/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A user message still waiting for delivery — the queued-message row. */
const QUEUED_MESSAGE: ChatMessage = {
  id: 'queued-1',
  role: 'user',
  content: 'queued message',
  timestamp: 1,
  queued: true,
}

/** A human side-channel note — the gold team-only badge marks it. */
const TEAM_NOTE_MESSAGE: ChatMessage = {
  id: 'team-1',
  role: 'user',
  content: 'note for the team',
  timestamp: 2,
  teamOnly: true,
}

/** A chat provider that loads the given history and never streams. */
function buildChatProvider(history: ChatMessage[] = []): ChatProvider {
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
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  }
}

/** Wrap children in the i18n, theme, http and chat contexts ChatPanel needs. */
function wrap(children: ReactNode, chat: ChatProvider): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <ThemeProvider provider={buildThemeProvider()}>
        <HttpProvider client={buildHttpClient()}>
          <ChatContextProvider provider={chat}>{children}</ChatContextProvider>
        </HttpProvider>
      </ThemeProvider>
    </I18nProvider>
  )
}

/** Render ChatPanel with the given history and wait for the composer. */
async function renderChatPanel(history: ChatMessage[] = []): Promise<HTMLElement> {
  const { baseElement: container } = render(
    wrap(<ChatPanel projectId="proj-a11y" agentName="Synthase" />, buildChatProvider(history)),
  )
  await waitFor(() => {
    expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull()
  })
  return container
}

/** Submit a slash command through the real composer. */
function submitCommand(container: HTMLElement, text: string): void {
  const input = container.querySelector('[data-mol-chat-input]') as HTMLTextAreaElement
  fireEvent.change(input, { target: { value: text } })
  fireEvent.keyDown(input, { key: 'Enter' })
}

beforeEach(() => {
  setClassMap(classMap)
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
  document.body.innerHTML = ''
})

describe('ChatPanel — accessibility', () => {
  it('moves focus into the queued-message editor when it opens', async () => {
    const container = await renderChatPanel([QUEUED_MESSAGE])
    const edit = await waitFor(() => {
      const el = container.querySelector(`button[title="Edit"]`)
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })
    fireEvent.click(edit)

    const editor = await waitFor(() => {
      const el = Array.from(container.querySelectorAll('textarea')).find(
        (ta) => ta.getAttribute('data-mol-chat-input') === null,
      )
      expect(el).not.toBeUndefined()
      return el as HTMLTextAreaElement
    })
    expect(editor.defaultValue).toBe('queued message')
    await waitFor(() => expect(document.activeElement).toBe(editor))
  })

  it('names the queued-message editor textarea with an aria-label', async () => {
    // The editor is a bare textarea with a defaultValue — no label element and
    // no placeholder, so without an aria-label it has no accessible name (axe
    // `label`).
    const container = await renderChatPanel([QUEUED_MESSAGE])
    const edit = await waitFor(() => {
      const el = container.querySelector(`button[title="Edit"]`)
      expect(el).not.toBeNull()
      return el as HTMLButtonElement
    })
    fireEvent.click(edit)

    const editor = await waitFor(() => {
      const el = Array.from(container.querySelectorAll('textarea')).find(
        (ta) => ta.getAttribute('data-mol-chat-input') === null,
      )
      expect(el).not.toBeUndefined()
      return el as HTMLTextAreaElement
    })
    expect(editor.getAttribute('aria-label')).toBe('Edit queued message')
  })

  it('names the team-only badge as an image', async () => {
    // The badge is an icon-only span; a span without a role may not carry
    // `aria-label` (axe `aria-prohibited-attr`), so it is an image with a name.
    const container = await renderChatPanel([TEAM_NOTE_MESSAGE])
    const badge = await waitFor(() => {
      const el = container.querySelector('[data-mol-id="chat-team-only-badge"]')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    expect(badge.getAttribute('role')).toBe('img')
    expect(badge.getAttribute('aria-label')).toBe(
      'Team only — visible to your team; Synthase will ignore it',
    )
    expect(badge.getAttribute('title')).toBe(
      'Team only — visible to your team; Synthase will ignore it',
    )
  })

  it('focuses the conversation search field when the picker opens', async () => {
    const container = await renderChatPanel()
    const picker = await waitFor(() => {
      const el = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Chat history'),
      )
      expect(el).not.toBeUndefined()
      return el as HTMLButtonElement
    })
    fireEvent.click(picker)

    const search = await waitFor(() => {
      const el = container.querySelector('input[placeholder="Search conversations…"]')
      expect(el).not.toBeNull()
      return el as HTMLInputElement
    })
    await waitFor(() => expect(document.activeElement).toBe(search))
  })

  it('names the panel overlay as a dialog and closes it on Escape from inside', async () => {
    const container = await renderChatPanel()
    submitCommand(container, '/settings')

    await waitFor(() => {
      expect(container.querySelector('[role="dialog"][aria-label="Settings"]')).not.toBeNull()
    })
    // Escape from a field inside the overlay (not the overlay element itself)
    // still closes it — the listener is on the window, as for a dialog.
    const escapeTarget = container.querySelector(
      '[role="dialog"][aria-label="Settings"] input, [role="dialog"][aria-label="Settings"] button',
    ) as HTMLElement
    fireEvent.keyDown(escapeTarget ?? document.body, { key: 'Escape' })

    await waitFor(() => {
      expect(container.querySelector('[role="dialog"][aria-label="Settings"]')).toBeNull()
    })
  })
})
