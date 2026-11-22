// @vitest-environment jsdom

/**
 * The ChatPanel skeleton: the exported panel renders, `ChatInner` asks every
 * section for its part in React's render order, and the inner chat's mount
 * effects run before the outer panel's conversation fetch.
 *
 * The last point is the framework's one ordering hazard: React's children run
 * their effects before the parent's, and the port keeps that by evaluating
 * `ChatPanel`'s JSX into a const before registering its own effects. While a
 * slice is unported, its effect registers a mount-time report of its ledger
 * position, so the order is observable; now that every slice is ported, the
 * inner chat's real mount reads are the evidence.
 *
 * A ported section leaves the report stream and renders its root instead, so
 * the tests read one ordered log of BOTH the outgoing requests and the
 * remaining reports — real work instead of a stub report where the port has
 * landed, and the same order assertion either way.
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

/** The project the panel renders. */
const PROJECT_ID = 'p1'

/** The conversation-list request the outer panel makes on mount. */
const CONVERSATIONS_URL = `/projects/${PROJECT_ID}/conversations`

/**
 * React's render order for the sections: the outer header first, then
 * `ChatInner`'s tree, with each parent section followed by the sections it
 * nests.
 */
const SECTION_ORDER = [
  'section:conversation-header',
  'section:drag-overlay',
  'section:messages',
  'section:timeline-items',
  'section:activity-slot',
  'section:input-area',
  'section:attachment-chips',
  'section:command-menu',
  'section:mic-picker',
  // The model picker's shell (header, rows and BYO seam included) renders its
  // subtree only while the picker is open; it is closed at mount, so none of
  // its sections is asked for its part.
  'section:effort-picker',
  'section:sounds-picker',
  'section:panel-overlay',
  'section:file-picker',
  'section:queued-messages',
  'section:tests-strip',
  'section:composer',
  'section:report-modal',
  'section:share-modal',
]

/**
 * The sections that are ported already: they render their root instead of
 * reporting. The header renders inside the outer panel; the two modal slots and
 * the command-menu, effort, sounds and panel-overlay popups render nothing
 * while closed, so their evidence at mount is the absent report and the panel
 * root's unchanged shape.
 */
const REAL_SECTIONS = new Set<string>([
  'section:conversation-header',
  'section:messages',
  'section:timeline-items',
  'section:activity-slot',
  'section:auto-fix-banner',
  'section:retry-banner',
  'section:input-area',
  'section:drag-overlay',
  'section:attachment-chips',
  'section:file-picker',
  'section:command-menu',
  'section:mic-picker',
  'section:effort-picker',
  'section:sounds-picker',
  'section:panel-overlay',
  'section:composer',
  'section:report-modal',
  'section:share-modal',
  'section:tests-strip',
  'section:queued-messages',
])

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
 * The rejecting client with every GET recorded into the shared event log.
 * @param events - The ordered log the request is recorded in, as it is made.
 * @returns The recording client.
 */
function buildRecordingHttp(events: string[]): HttpClient {
  const record = (url: string): Promise<never> => {
    events.push(`http:GET ${url}`)
    return Promise.reject(new Error('http disabled in test'))
  }
  return { ...buildRejectingHttp(), get: record }
}

/** The mount alive right now, if any. */
let dispose: (() => void) | null = null

/** The ordered log of outgoing requests and console warnings, as they happen. */
let events: string[] = []

beforeEach(() => {
  events = []
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    events.push(`warn: ${args.map((arg) => String(arg)).join(' ')}`)
  })
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

/**
 * Renders the panel with the baseline props.
 * The mount is kept in {@link dispose}.
 * @param http - The HTTP client the panel (and its parts) use.
 */
function mountPanel(http: HttpClient = buildRejectingHttp()): void {
  const container = document.createElement('div')
  document.body.appendChild(container)
  dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={http}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel projectId={PROJECT_ID} />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
}

/**
 * The index of the first event carrying a needle, or -1.
 * @param needle - The text to look for.
 * @returns The event's position in {@link events}.
 */
function indexOf(needle: string): number {
  return events.findIndex((event) => event.includes(needle))
}

/**
 * The section reports, in the order the sections were asked for their part.
 * @returns The `section:<name>` markers, in order.
 */
function sectionReports(): string[] {
  return events.flatMap((event) => {
    const match = event.match(/section:[a-z-]+/)
    return match ? [match[0]] : []
  })
}

/**
 * The slice mount-effect reports, in the order their effects ran.
 * @returns Each report's ledger name and its position in {@link events}.
 */
function effectReports(): { name: string; index: number }[] {
  return events.flatMap((event, index) => {
    const match = event.match(/[a-z-]+\.effects\.\d+/)
    return match ? [{ name: match[0], index }] : []
  })
}

describe('the ChatPanel skeleton', () => {
  it('mounts the exported panel without throwing', () => {
    expect(() => mountPanel()).not.toThrow()
  })

  it('runs the inner chat’s mount effects before the outer panel’s conversation fetch', () => {
    mountPanel(buildRecordingHttp(events))

    // Every slice's effects are real now, so nothing reports itself.
    expect(effectReports()).toEqual([])

    // The inner chat's mount reads are real requests, and they still land
    // before the outer panel's own conversation fetch (child before parent).
    const outer = indexOf(`http:GET ${CONVERSATIONS_URL}`)
    expect(outer).toBeGreaterThanOrEqual(0)
    const earlier = events.flatMap((event, index) =>
      event.startsWith('http:GET ') && index < outer ? [event] : [],
    )
    expect(earlier.length).toBeGreaterThan(0)
  })

  it('asks every section for its part in React’s render order', () => {
    mountPanel()

    // A ported section renders its root and leaves the report stream. Every
    // section is ported now, so no report remains.
    const expected = SECTION_ORDER.filter((name) => !REAL_SECTIONS.has(name))
    expect(expected).toEqual([])
    expect(sectionReports()).toEqual(expected)

    // The header is real: it renders its root (the conversation toggle) above
    // the inner chat, which stays the panel root's last child.
    const container = document.body.firstElementChild as HTMLElement
    const root = container.firstElementChild as HTMLElement
    const header = root.firstElementChild as HTMLElement
    expect(header.querySelector('[data-mol-id="chat-conversation-toggle"]')).not.toBeNull()
    expect(root.lastElementChild).not.toBe(header)

    // The two ported modal slots add nothing at mount (their popup is closed),
    // so the panel root still holds exactly the header and the inner chat.
    expect(root.children).toHaveLength(2)
  })
})
