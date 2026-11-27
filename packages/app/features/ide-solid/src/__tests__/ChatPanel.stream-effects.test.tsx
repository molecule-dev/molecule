// @vitest-environment jsdom
/**
 * The stream-event handler on the one path reachable without a local send: a
 * teammate's broadcast frame. It proves the sender-only effects stay on the
 * sender — a failed verification never arms this client's auto-fix, a captured
 * side effect renders but is not written back — while the host callbacks a
 * pushed frame still owes (the forwarded client action, the turn-complete
 * signal) do fire.
 *
 * The zero-to-three-second countdown itself needs an own turn, which the
 * composer's submit path starts; the conformance suite's `auto-fix: ` cases
 * cover it once their DOM matches.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ChatConfig, ChatMessage, ChatProvider, ChatStreamEvent } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpContext, ThemeContext } from '@molecule/app-solid'
import { ChatContext, resetChatStoresForTests } from '@molecule/app-solid/chat'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel, type ChatPanelProps } from '../components/ChatPanel.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** The project and conversation the panel mounts on. */
const PROJECT_ID = 'p1'
const CONVERSATION_ID = 'c1'

/** The panel's endpoint, naming the conversation the broadcast frames belong to. */
const ENDPOINT = `/projects/${PROJECT_ID}/chat?conversationId=${CONVERSATION_ID}`

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

/** A full {@link HttpResponse} for a stub to resolve with. */
function responseOf(data: unknown): HttpResponse<never> {
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/** The mount alive right now, if any. */
let dispose: (() => void) | null = null

beforeEach(() => {
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

/** Every request the panel makes, with its method, URL and body. */
interface RecordedRequest {
  /** The HTTP method. */
  method: string
  /** The request URL. */
  url: string
  /** The request body, when it carries one. */
  body?: unknown
}

/**
 * Mounts the panel with the broadcast handler captured and every request recorded.
 * @param props - The host callbacks the case asserts on.
 * @returns The mounted container, the captured handler and the recorded requests.
 */
function mountPanel(props: {
  onClientAction?: ChatPanelProps['onClientAction']
  onTurnComplete?: ChatPanelProps['onTurnComplete']
  onReadyToBuild?: ChatPanelProps['onReadyToBuild']
}): {
  container: HTMLElement
  requests: RecordedRequest[]
  push: (event: ChatStreamEvent) => void
} {
  const requests: RecordedRequest[] = []
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const record = (method: string, url: string, body?: unknown): Promise<HttpResponse<never>> => {
    requests.push({ method, url, body })
    return Promise.resolve(responseOf({}))
  }
  const http: HttpClient = {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (url: string) => record('GET', url),
    post: (url: string) => record('POST', url),
    put: (url: string, body?: unknown) => record('PUT', url, body),
    patch: (url: string) => record('PATCH', url),
    delete: (url: string) => record('DELETE', url),
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
  const holder: { handler: ((conversationId: string, event: ChatStreamEvent) => void) | null } = {
    handler: null,
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={http}>
          <ChatContext.Provider value={buildChatProvider()}>
            <ChatPanel
              projectId={PROJECT_ID}
              endpoint={ENDPOINT}
              onRegisterPushHandler={(handler) => {
                holder.handler = handler
              }}
              onClientAction={props.onClientAction}
              onTurnComplete={props.onTurnComplete}
              onReadyToBuild={props.onReadyToBuild}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return {
    container,
    requests,
    push: (event) => {
      const handler = holder.handler
      if (!handler) throw new Error('the panel has not registered its broadcast handler yet')
      handler(CONVERSATION_ID, event)
    },
  }
}

/** A teammate's failed verification, as the broadcast carries it. */
const VERIFICATION_FAILED: ChatStreamEvent = {
  type: 'verification_result',
  status: 'error',
  output: 'src/app.ts(4,11): error TS2304: Cannot find name "quizzer"',
  workspaces: [],
  categories: ['type'],
  changedPaths: ['src/app.ts'],
}

it("does not arm this client's auto-fix from a teammate's failed verification", async () => {
  const panel = mountPanel({})
  await vi.waitFor(() =>
    expect(panel.container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
  )

  panel.push({ type: 'message_start', id: 'tm-1', timestamp: 1_000 })
  panel.push({ type: 'text', content: 'Checking the build now.' })
  panel.push(VERIFICATION_FAILED)
  panel.push({ type: 'done' })

  await vi.waitFor(() => expect(document.body.textContent).toContain('Checking the build now.'))
  expect(document.querySelector('[data-mol-id="chat-autofix-pause"]')).toBeNull()
  expect(document.querySelector('[data-mol-id="chat-autofix-resume"]')).toBeNull()
  expect(document.querySelector('[data-mol-id="chat-autofix-cancel"]')).toBeNull()
  expect(document.body.textContent).not.toContain('Auto-fixing in')
})

it('forwards every field of a pushed client_action to the host', async () => {
  const onClientAction = vi.fn()
  const panel = mountPanel({ onClientAction })
  await vi.waitFor(() =>
    expect(panel.container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
  )

  panel.push({
    type: 'client_action',
    action: 'preview_ui',
    requestId: 'req-7',
    command: 'fill',
    molId: 'login-email',
    selector: '#email',
    text: 'Email',
    value: 'ada@example.test',
    path: '/login',
  })

  await vi.waitFor(() =>
    expect(onClientAction).toHaveBeenCalledWith({
      action: 'preview_ui',
      path: '/login',
      requestId: 'req-7',
      command: 'fill',
      molId: 'login-email',
      selector: '#email',
      text: 'Email',
      value: 'ada@example.test',
    }),
  )
})

it('tells the host a pushed turn completed', async () => {
  const onTurnComplete = vi.fn()
  const panel = mountPanel({ onTurnComplete })
  await vi.waitFor(() =>
    expect(panel.container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
  )

  panel.push({ type: 'message_start', id: 'tm-2', timestamp: 1_000 })
  panel.push({ type: 'text', content: 'All done.' })
  panel.push({ type: 'done' })

  await vi.waitFor(() => expect(onTurnComplete).toHaveBeenCalledTimes(1))
})

it('does not boot the sandbox from a pushed ready_to_build', async () => {
  const onReadyToBuild = vi.fn()
  const panel = mountPanel({ onReadyToBuild })
  await vi.waitFor(() =>
    expect(panel.container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
  )

  panel.push({ type: 'ready_to_build' })

  await Promise.resolve()
  expect(onReadyToBuild).not.toHaveBeenCalled()
})

it("renders a teammate's captured side effect without writing it back", async () => {
  const panel = mountPanel({})
  await vi.waitFor(() =>
    expect(panel.container.querySelector('[data-mol-chat-input]')).not.toBeNull(),
  )

  panel.push({
    type: 'activity',
    activity: {
      id: 'act-9',
      type: 'email',
      status: 'captured',
      recipient: 'ada@example.test',
      summary: 'Welcome aboard',
      timestamp: '2023-11-14T22:13:22.000Z',
    },
  })

  await vi.waitFor(() => expect(document.body.textContent).toContain('Welcome aboard'))
  // The card renders for this viewer, but every write-back of the store leaves
  // it out: a pushed card is `received`, never re-persisted by the receiver.
  const writes = panel.requests.filter(
    (request) => request.method === 'PUT' && request.url.includes('activity-cards'),
  )
  expect(writes.length).toBeGreaterThan(0)
  for (const write of writes) {
    const body = write.body as { activityCards?: { id: string }[] } | undefined
    expect(body?.activityCards?.some((card) => card.id === 'act-9') ?? false).toBe(false)
  }
})
