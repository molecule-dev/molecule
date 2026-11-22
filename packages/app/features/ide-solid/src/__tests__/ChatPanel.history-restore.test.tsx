// @vitest-environment jsdom
/**
 * History restore, the verification advisory and the resource-limit upgrade
 * card — all rendered from a restored transcript.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ChatPanel.history-restore.test.tsx`
 * with the same test names and the same assertions. A stub
 * `ChatProvider.loadHistory` returns the persisted conversation; the panel
 * always loads it on mount (even with a stale `initialInputValue` and no
 * conversation id), renders a discovery turn whose only content is a resolved
 * tool_call, renders the stored render-check advisory in the theme's warning
 * token (never an inline colour) and nothing for a clean pass, and renders a
 * resource-limit block through the shared notice card with the host's buttons.
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
import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
import {
  ChatContext,
  HttpContext,
  resetChatStoresForTests,
  ThemeContext,
} from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatPanel } from '../components/ChatPanel.jsx'
import type { UpgradeCtaContext } from '../parts/MessageItem.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** A stub chat provider replaying a fixed transcript. */
function buildChatProvider(history: ChatMessage[]): ChatProvider {
  return {
    name: 'stub',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (_config: ChatConfig): Promise<ChatMessage[]> => history,
  }
}

/** An HTTP client whose every request rejects; callers catch their own. */
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

const USER_PROMPT = 'An e-learning platform with quizzes and certificates'
const ASSISTANT_TEXT = 'Saved the plan — building it now.'

/** A persisted discovery conversation: prompt, ask_user turn, closing reply. */
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

/** The mount alive right now, if any. */
const mounted: { dispose?: () => void } = {}

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
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  resetChatStoresForTests()
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts a panel over the given transcript.
 *
 * @param history - The transcript the stub provider replays.
 * @param props.initialInputValue - A stale composer seed (the refresh shape).
 * @param props.buildUpgradeCta - The host's upgrade CTA builder.
 * @returns The mount container.
 */
function mountPanel(
  history: ChatMessage[],
  props: {
    initialInputValue?: string
    buildUpgradeCta?: (
      context: UpgradeCtaContext,
    ) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
    projectId?: string
  } = {},
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <ThemeContext.Provider value={buildThemeProvider()}>
        <HttpContext.Provider value={buildHttpClient()}>
          <ChatContext.Provider value={buildChatProvider(history)}>
            <ChatPanel
              projectId={props.projectId ?? 'proj-refresh'}
              userAvatar={null}
              initialInputValue={props.initialInputValue}
              buildUpgradeCta={props.buildUpgradeCta}
            />
          </ChatContext.Provider>
        </HttpContext.Provider>
      </ThemeContext.Provider>
    ),
    container,
  )
  return container
}

/** A transcript whose only message is a verification block. */
function verificationHistory(renderCheckUnavailable?: boolean): ChatMessage[] {
  return [
    {
      id: 'a-verification',
      role: 'assistant',
      content: '',
      timestamp: 2000,
      blocks: [
        {
          type: 'verification',
          status: 'ok',
          workspaces: ['app'],
          ...(renderCheckUnavailable ? { renderCheckUnavailable } : {}),
        },
      ],
    },
  ]
}

describe('ChatPanel history restore on refresh (loadOnMount)', () => {
  it('loads the persisted conversation on mount even when initialInputValue is set and the endpoint has no conversation id', async () => {
    // initialInputValue set + no conversationId = the refresh case where the old
    // `loadOnMount` suppression left the whole conversation unloaded.
    const container = mountPanel(seededHistory(), { initialInputValue: USER_PROMPT })
    await vi.waitFor(() => expect(container.textContent).toContain(USER_PROMPT))
    expect(container.textContent).toContain(ASSISTANT_TEXT)
  })

  it('restores a discovery turn whose only block is a resolved tool_call (empty content)', async () => {
    const container = mountPanel(seededHistory(), { initialInputValue: USER_PROMPT })
    await vi.waitFor(() =>
      expect(container.textContent).toContain('What quiz question types do you need?'),
    )
  })
})

describe('ChatPanel verification render advisory', () => {
  it('renders the stored unavailable advisory in the actual success badge', async () => {
    const container = mountPanel(verificationHistory(true))
    await vi.waitFor(() => expect(container.textContent).toContain('Checks passed'))
    expect(container.textContent).toContain('Render check unavailable')
  })

  it('uses the registered ClassMap warning token without an inline color', async () => {
    setClassMap({ ...classMap, textWarning: 'review-warning-token' })
    try {
      const container = mountPanel(verificationHistory(true))
      await vi.waitFor(() => expect(container.textContent).toContain('Render check unavailable'))
      const advisory = container.querySelector<HTMLElement>(
        '[data-mol-id="render-check-unavailable"]',
      )
      expect(advisory).not.toBeNull()
      expect(advisory?.className).toBe('review-warning-token')
      expect(advisory?.getAttribute('style')).toBeNull()
    } finally {
      setClassMap(classMap)
    }
  })

  it('renders no advisory for a clean pass', async () => {
    const container = mountPanel(verificationHistory())
    await vi.waitFor(() => expect(container.textContent).toContain('Checks passed'))
    expect(container.textContent).not.toContain('Render check unavailable')
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
    const container = mountPanel(oomHistory(), {
      projectId: 'proj-oom',
      buildUpgradeCta: () => [
        { label: 'Sign up', href: '/signup' },
        { label: 'Log in', href: '/login' },
      ],
    })
    await vi.waitFor(() => expect(container.textContent).toContain('ran out of memory'))
    const card = container.querySelector('[data-mol-id="chat-notice-card"]')
    expect(card).toBeTruthy()
    expect(card?.querySelector('a[href="/signup"]')).toBeTruthy()
    expect(card?.querySelector('a[href="/login"]')).toBeTruthy()
    // NOT the old bespoke raw warning triangle.
    expect(card?.querySelector('svg path[d^="M8.485"]')).toBeNull()
  })
})
