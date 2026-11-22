// @vitest-environment jsdom

/**
 * The timeline-base unit (P5): the messages column renders React's log port —
 * its role, its live-region attributes, its label, its classes and its inline
 * style — the empty-conversation hint and its gates, the persistent activity
 * slot with its reserved geometry and its sandbox-boot copy, and the input
 * area's position-relative block around the composer.
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

/**
 * Mounts the panel with the given props.
 * @param props - The panel's props, beyond the project id.
 */
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
 * Lets the panel's mount effects and the history load settle.
 * @returns A promise that resolves after the next macrotask.
 */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * The messages column the panel rendered.
 * @returns The container element.
 */
function messages(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[aria-label="Conversation messages"]')
  if (!element) throw new Error('the messages container did not render')
  return element
}

/**
 * The activity slot the panel rendered.
 * @returns The slot element.
 */
function activitySlot(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-mol-id="chat-activity-slot"]')
  if (!element) throw new Error('the activity slot did not render')
  return element
}

beforeEach(() => {
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

describe('the timeline-base unit', () => {
  it('renders the log port with React’s attributes, class and inline style', async () => {
    // Discovery shows no onboarding tip, so the timeline is empty and the
    // empty-conversation hint renders inside the log.
    mountPanel({ hideConversationMenu: true })
    await settle()

    const log = messages()
    expect(log.getAttribute('role')).toBe('log')
    expect(log.getAttribute('aria-live')).toBe('polite')
    expect(log.getAttribute('aria-relevant')).toBe('additions')
    expect(log.className).toBe(classMap.sp('p', 3))
    expect(log.style.flex).toBe('1 1 0%')
    expect(log.style.overflowY).toBe('auto')
    expect(log.style.scrollbarWidth).toBe('thin')
    expect(log.style.overflowAnchor).toBe('none')
  })

  it('renders the empty-conversation hint with React’s text, icon and geometry', async () => {
    mountPanel({ hideConversationMenu: true })
    await settle()

    const hint = messages().querySelector<HTMLElement>('[data-mol-id="chat-empty-hint"]')
    if (!hint) throw new Error('the empty hint did not render')
    expect(hint.className).toBe(classMap.cn(classMap.textSize('sm'), classMap.textMuted))
    expect(hint.style.display).toBe('flex')
    expect(hint.style.flexDirection).toBe('column')
    expect(hint.style.alignItems).toBe('center')
    expect(hint.style.justifyContent).toBe('center')
    expect(hint.style.gap).toBe('10px')
    expect(hint.style.height).toBe('calc(100% - 28px)')
    expect(hint.style.minHeight).toBe('120px')
    expect(hint.style.textAlign).toBe('center')

    const icon = hint.querySelector('svg')
    if (!icon) throw new Error('the empty hint icon did not render')
    expect(icon.getAttribute('aria-hidden')).toBe('true')
    expect(icon.getAttribute('width')).toBe('28')
    expect(icon.style.opacity).toBe('0.5')
    expect(hint.textContent).toContain('Describe what you want to build...')
  })

  it('keeps the activity slot in the layout and empty while idle', async () => {
    mountPanel({ hideConversationMenu: true })
    await settle()

    const slot = activitySlot()
    expect(slot.getAttribute('aria-hidden')).toBe('true')
    expect(slot.style.minHeight).toBe('28px')
    expect(slot.style.opacity).toBe('0')
    expect(slot.style.pointerEvents).toBe('none')
    expect(slot.style.transition).toBe('opacity 0.18s ease-out')
    expect(slot.childElementCount).toBe(0)
  })

  it('shows the sandbox-boot copy and hides the empty hint while boot waits', async () => {
    mountPanel({ hideConversationMenu: true, awaitingSandboxBoot: true })
    await settle()

    expect(messages().querySelector('[data-mol-id="chat-empty-hint"]')).toBeNull()

    const slot = activitySlot()
    expect(slot.getAttribute('aria-hidden')).toBe('false')
    expect(slot.style.opacity).toBe('1')
    expect(slot.style.pointerEvents).toBe('auto')
    expect(slot.textContent).toContain(
      'Waiting for the development environment to finish starting…',
    )
  })

  it('wraps the composer in one position-relative block', async () => {
    mountPanel({ hideConversationMenu: true })
    await settle()

    const composer = document.querySelector<HTMLElement>('[data-mol-id="chat-composer"]')
    if (!composer) throw new Error('the composer did not render')
    const block = composer.parentElement
    if (!block) throw new Error('the composer has no parent')
    expect(block.className).toBe(classMap.shrink0)
    expect(block.style.position).toBe('relative')
  })
})
