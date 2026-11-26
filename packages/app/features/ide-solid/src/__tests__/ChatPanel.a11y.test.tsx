// @vitest-environment jsdom
/**
 * ChatPanel's keyboard and dialog semantics.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.a11y.test.tsx` with
 * the same test names and the same assertions: the queued-message editor takes
 * focus when it opens and is named with an `aria-label`, the team-only badge is
 * an image with a name, the conversation picker moves focus into its search
 * field, and the panel overlay is a non-modal dialog named from its heading and
 * closable with Escape from anywhere inside it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
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
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => void store.delete(key),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
  }
}

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
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders the panel with the given history and waits for the composer.
 *
 * @param history - The transcript the stub provider replays.
 * @returns The mount container.
 */
async function renderChatPanel(history: ChatMessage[] = []): Promise<HTMLElement> {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(history)}>
            <ChatPanel projectId="proj-a11y" agentName="Synthase" />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  await vi.waitFor(() => expect(container.querySelector('[data-mol-chat-input]')).not.toBeNull())
  return container.ownerDocument.body
}

/**
 * Submits a slash command through the real composer.
 *
 * @param container - The mount container.
 * @param text - The exact command text.
 */
function submitCommand(container: HTMLElement, text: string): void {
  const input = container.querySelector<HTMLTextAreaElement>('[data-mol-chat-input]')
  if (!input) throw new Error('composer input not found')
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
}

/**
 * The queued-message editor textarea (the one that is NOT the composer).
 *
 * @param container - The mount container.
 * @returns The editor, or undefined before it opens.
 */
function queuedEditor(container: HTMLElement): HTMLTextAreaElement | undefined {
  return Array.from(container.querySelectorAll('textarea')).find(
    (candidate) => candidate.getAttribute('data-mol-chat-input') === null,
  )
}

describe('ChatPanel — accessibility', () => {
  it('moves focus into the queued-message editor when it opens', async () => {
    const container = await renderChatPanel([QUEUED_MESSAGE])
    const edit = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>('button[title="Edit"]')
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    edit.click()

    const editor = await vi.waitFor(() => {
      const element = queuedEditor(container)
      expect(element).not.toBeUndefined()
      return element as HTMLTextAreaElement
    })
    expect(editor.defaultValue).toBe('queued message')
    await vi.waitFor(() => expect(document.activeElement).toBe(editor))
  })

  it('names the queued-message editor textarea with an aria-label', async () => {
    const container = await renderChatPanel([QUEUED_MESSAGE])
    const edit = await vi.waitFor(() => {
      const element = container.querySelector<HTMLButtonElement>('button[title="Edit"]')
      expect(element).not.toBeNull()
      return element as HTMLButtonElement
    })
    edit.click()

    const editor = await vi.waitFor(() => {
      const element = queuedEditor(container)
      expect(element).not.toBeUndefined()
      return element as HTMLTextAreaElement
    })
    expect(editor.getAttribute('aria-label')).toBe('Edit queued message')
  })

  it('names the team-only badge as an image', async () => {
    const container = await renderChatPanel([TEAM_NOTE_MESSAGE])
    const badge = await vi.waitFor(() => {
      const element = container.querySelector<HTMLElement>('[data-mol-id="chat-team-only-badge"]')
      expect(element).not.toBeNull()
      return element as HTMLElement
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
    const picker = await vi.waitFor(() => {
      const element = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Chat history'),
      )
      expect(element).not.toBeUndefined()
      return element as HTMLButtonElement
    })
    picker.click()

    const search = await vi.waitFor(() => {
      const element = container.querySelector<HTMLInputElement>(
        'input[placeholder="Search conversations…"]',
      )
      expect(element).not.toBeNull()
      return element as HTMLInputElement
    })
    await vi.waitFor(() => expect(document.activeElement).toBe(search))
  })

  it('names the panel overlay as a dialog and closes it on Escape from inside', async () => {
    const container = await renderChatPanel()
    submitCommand(container, '/settings')

    await vi.waitFor(() => {
      expect(container.querySelector('[role="dialog"][aria-label="Settings"]')).not.toBeNull()
    })
    // Escape from a field INSIDE the overlay (not the overlay itself) closes it.
    const escapeTarget = container.querySelector<HTMLElement>(
      '[role="dialog"][aria-label="Settings"] input, [role="dialog"][aria-label="Settings"] button',
    )
    const target = escapeTarget ?? document.body
    target.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    await vi.waitFor(() => {
      expect(container.querySelector('[role="dialog"][aria-label="Settings"]')).toBeNull()
    })
  })
})
