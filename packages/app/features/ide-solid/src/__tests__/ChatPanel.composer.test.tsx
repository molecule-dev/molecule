// @vitest-environment jsdom

/**
 * The composer unit (P4): the input container renders React's DOM — the
 * container's attributes and inline style, the textarea's labels and style and
 * the hint row's controls — seeds itself from the draft, gates Send on sendable
 * content, focuses the textarea from the container's click, and persists the
 * draft to sessionStorage the way React's debounce does.
 *
 * The conformance kit checks the whole panel once its remaining units land;
 * these cases pin the unit's own contract meanwhile.
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
import { NOTICE_TONE } from '@molecule/app-ide-panel-logic'
import {
  ChatContext,
  HttpContext,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { ChatPanelProps } from '../components/ChatPanel.jsx'
import { ChatPanel } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The project the panel renders. */
const PROJECT_ID = 'p1'

/** The persisted draft's key (`ChatPanel` keys it by project). */
const DRAFT_KEY = `mol-chat-draft:${PROJECT_ID}`

/** The in-memory sessionStorage the draft tests read and write. */
let session: Map<string, string>

/** The mount alive right now, if any. */
let dispose: (() => void) | null = null

/** A chat provider that loads an empty history and never streams. */
function buildChatProvider(): ChatProvider {
  return {
    name: 'test',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => [],
  }
}

/** An HTTP client whose every request rejects; the panel catches its own. */
function buildRejectingHttp(): HttpClient {
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

/** Mounts the panel with the given props, ignoring React's own `projectId`. */
function mountPanel(props: Partial<ChatPanelProps> = {}): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildRejectingHttp()}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel projectId={PROJECT_ID} {...props} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
}

/**
 * The composer container the panel rendered.
 * @returns The container element.
 */
function composer(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-mol-id="chat-composer"]')
  if (!el) throw new Error('the composer container did not render')
  return el
}

/**
 * The composer's textarea.
 * @returns The textarea element.
 */
function textarea(): HTMLTextAreaElement {
  const el = composer().querySelector('textarea')
  if (!el) throw new Error('the composer textarea did not render')
  return el
}

/**
 * The hint row's Send button.
 * @returns The button element.
 */
function sendButton(): HTMLButtonElement {
  const el = composer().querySelector<HTMLButtonElement>('[data-mol-id="chat-send-button"]')
  if (!el) throw new Error('the send button did not render')
  return el
}

/**
 * A hex color in the form the DOM serializes it (`#e0a100` → `rgb(224, 161, 0)`).
 * @param hex - The six-digit hex color.
 * @returns The serialized color.
 */
function cssColor(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgb(${(value >> 16) & 0xff}, ${(value >> 8) & 0xff}, ${value & 0xff})`
}

/**
 * Types into the textarea the way a user does: set its value, then dispatch the
 * native input and change events React's onChange listens for.
 * @param value - The textarea's new value.
 */
function type(value: string): void {
  const ta = textarea()
  ta.value = value
  ta.dispatchEvent(new Event('input', { bubbles: true }))
  ta.dispatchEvent(new Event('change', { bubbles: true }))
}

beforeEach(() => {
  session = new Map()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'localStorage', {
    value: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
      getItem: (key: string) => session.get(key) ?? null,
      setItem: (key: string, value: string) => {
        session.set(key, value)
      },
      removeItem: (key: string) => {
        session.delete(key)
      },
      clear: () => {
        session.clear()
      },
    },
    configurable: true,
    writable: true,
  })
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  dispose?.()
  dispose = null
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
  vi.restoreAllMocks()
})

describe('the composer unit', () => {
  it('renders the input container with React’s attributes and inline styles', () => {
    mountPanel()

    const box = composer()
    expect(box.getAttribute('role')).toBe('presentation')
    expect(box.hasAttribute('hidden')).toBe(false)
    expect(box.hasAttribute('data-mol-viewer')).toBe(false)
    expect(box.style.borderRadius).toBe('8px 8px 0 0')
    expect(box.style.padding).toBe('8px 10px')
    expect(box.style.cursor).toBe('text')
    expect(box.style.position).toBe('')

    const ta = textarea()
    expect(ta.getAttribute('data-mol-chat-input')).toBe('')
    expect(ta.getAttribute('aria-label')).toBe('Write a message')
    expect(ta.getAttribute('placeholder')).toBe('Send a message...')
    expect(ta.getAttribute('autocomplete')).toBe('off')
    expect(ta.getAttribute('rows')).toBe('1')
    expect(ta.style.width).toBe('100%')
    expect(ta.style.resize).toBe('none')
    // React writes `border: 'none'` as a style property; compare with an element
    // given that same write, so the check holds whatever text the DOM serializes
    // the shorthand to (jsdom 30 writes `border: medium`).
    const reference = document.createElement('textarea')
    reference.style.border = 'none'
    expect(ta.style.border).toBe(reference.style.border)
    expect(ta.style.borderStyle).toBe(reference.style.borderStyle)
    expect(ta.style.boxSizing).toBe('border-box')

    expect(composer().querySelector('[data-mol-id="chat-mic-button"]')).not.toBeNull()
    // React renders the mic glyph inside an explicitly namespaced svg; the DOM
    // records the attribute, so the port must keep it.
    expect(
      composer().querySelector('[data-mol-id="chat-mic-button"] svg')?.getAttribute('xmlns'),
    ).toBe('http://www.w3.org/2000/svg')

    // The mount focuses the textarea with the caret at its end (React's second
    // composer effect, recorded as the mount case's focused node).
    expect(document.activeElement).toBe(ta)
    expect(ta.selectionStart).toBe(ta.value.length)
  })

  it('seeds the textarea from the persisted draft and lights Send', () => {
    session.set(DRAFT_KEY, 'Half a plan from yesterday')
    mountPanel()

    expect(textarea().value).toBe('Half a plan from yesterday')
    expect(sendButton().disabled).toBe(false)
  })

  it('keeps Send disabled with an empty composer', () => {
    mountPanel()

    expect(textarea().value).toBe('')
    expect(sendButton().disabled).toBe(true)
  })

  it('focuses the textarea when the container body is clicked', () => {
    mountPanel()

    composer().click()
    expect(document.activeElement).toBe(textarea())
  })

  it('persists the typed draft after half a second and drops it when cleared', async () => {
    mountPanel()
    type('Build the header first')

    expect(sendButton().disabled).toBe(false)
    await vi.waitFor(() => expect(session.get(DRAFT_KEY)).toBe('Build the header first'), {
      timeout: 1500,
    })

    type('')
    await vi.waitFor(() => expect(session.has(DRAFT_KEY)).toBe(false), { timeout: 1500 })
    expect(sendButton().disabled).toBe(true)
  })

  it('marks a viewer’s box, prefills /teamsay and keeps Send dark for the bare prefix', async () => {
    mountPanel({ canEdit: false })

    const box = composer()
    expect(box.getAttribute('data-mol-viewer')).toBe('')
    // The gold team-message border, serialized by the DOM (hex → rgb).
    expect(box.getAttribute('style')).toContain(
      `border: 1px solid ${cssColor(NOTICE_TONE.gold.accent)}`,
    )
    expect(textarea().getAttribute('placeholder')).toBe('Message your team')

    await vi.waitFor(() => expect(textarea().value).toBe('/teamsay '), { timeout: 1500 })
    expect(sendButton().disabled).toBe(true)
  })

  it('hides the composer for a transcript-only viewer', () => {
    mountPanel({ canEdit: false, canSendTeamMessages: false })

    expect(composer().hasAttribute('hidden')).toBe(true)
  })

  it('rounds all four corners during discovery', () => {
    mountPanel({ hideConversationMenu: true })

    expect(composer().style.borderRadius).toBe('8px')
  })
})
