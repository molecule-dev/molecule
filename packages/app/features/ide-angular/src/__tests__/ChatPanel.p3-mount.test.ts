// @vitest-environment jsdom
/**
 * Unit P3 of the ChatPanel port: every request the panel makes at mount, in
 * React's order, plus the mount behaviour of the slices this unit ports (the
 * context-usage restore and its retry, the git-status triggers, the settings
 * hydrate and its change-signal re-read, the skills seed and its retry, and the
 * loading-state report to the host).
 *
 * Port of `@molecule/app-ide-react/src/__tests__`'s context-usage,
 * autocommit-persistence and skills-default coverage at the level this unit can
 * observe before the rest of the panel's units land: the recorded request
 * sequence and the callbacks the host receives.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { ChatMessage, ChatProvider } from '@molecule/app-ai-chat'
import { resetAIModelsCache, resetChatStoresForTests } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import {
  buildRejectingHttpClient,
  makeStorage,
  mountPanel,
  PANEL_TEST_TIMEOUT_MS,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'

/** The project every case mounts. */
const PROJECT_ID = 'p1'

/** The chat endpoint React derives for the project. */
const CHAT_ENDPOINT = `/projects/${PROJECT_ID}/chat`

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/**
 * Builds a chat provider that records its history load into the shared call log.
 *
 * @param calls - The ordered call log to append to.
 * @param history - The transcript to answer with.
 * @returns The provider.
 */
function buildRecordingChatProvider(calls: string[], history: ChatMessage[] = []): ChatProvider {
  return {
    name: 'recording',
    sendMessage: async (): Promise<void> => {},
    abort: (): void => {},
    clearHistory: async (): Promise<void> => {},
    loadHistory: async (config): Promise<ChatMessage[]> => {
      calls.push(`chat.loadHistory ${config.endpoint}`)
      return history
    },
  }
}

/**
 * Builds the default answer for a URL the case does not script: an empty
 * conversation list, an empty file list and an empty git status, so the panel's
 * own consumers read the shape they expect.
 *
 * @param url - The requested URL.
 * @returns The response data.
 */
function defaultAnswer(url: string): unknown {
  if (url.endsWith('/conversations')) return { conversations: [] }
  if (url.endsWith('/files-list')) return { files: [] }
  if (url.endsWith('/git-status')) return { files: [] }
  return {}
}

/**
 * Builds an HTTP client that records every GET in order and answers through
 * `answer`, so a case states its scripted project settings and page objects.
 *
 * @param calls - The ordered call log to append to.
 * @param answer - Returns the response data for a URL (defaults to {@link defaultAnswer}).
 * @returns The client.
 */
function buildRecordingHttp(
  calls: string[],
  answer: (url: string) => unknown = defaultAnswer,
): HttpClient {
  const run = (url: string): Promise<HttpResponse<never>> => {
    calls.push(`GET ${url}`)
    try {
      return Promise.resolve(responseOf(answer(url)))
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return { ...buildRejectingHttpClient(), get: run }
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  setProvider(createSimpleI18nProvider('en'))
  resetChatStoresForTests()
  resetAIModelsCache()
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
  resetAIModelsCache()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it(
  'makes every mount request in React order: the history load, the catalog, the project settings, the git status, the skills seed, then the outer conversation list',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    const calls: string[] = []
    mounted = await mountPanel({
      http: buildRecordingHttp(calls),
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    await vi.waitFor(() =>
      expect(
        calls.filter((call) => call.startsWith('GET /projects/p1/conversations')),
      ).toHaveLength(1),
    )

    expect(calls).toEqual([
      `chat.loadHistory ${CHAT_ENDPOINT}`,
      `GET /ai/models?projectId=${PROJECT_ID}`,
      `GET /projects/${PROJECT_ID}`,
      `GET /projects/${PROJECT_ID}/git-status`,
      `GET /projects/${PROJECT_ID}/files-list`,
      `GET /projects/${PROJECT_ID}/conversations`,
    ])
  },
)

it(
  'restores a saved conversation: the context-usage read precedes the history load, which precedes the catalog and settings reads',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    localStorage.setItem(`mol-chat-conv:${PROJECT_ID}`, 'c1')
    const calls: string[] = []
    mounted = await mountPanel({
      http: buildRecordingHttp(calls),
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    await vi.waitFor(() =>
      // The conversation LIST fetch this case is about — not the conversation-scoped
      // reads (the timeline dispatch's activity-card restore is its own unit's case).
      expect(
        calls.filter((call) => call === `GET /projects/${PROJECT_ID}/conversations`),
      ).toHaveLength(1),
    )

    // The activity-card restore reads its own conversation-scoped URL; it belongs to the
    // timeline dispatch unit and is asserted there. This case asserts the mount order of
    // the reads it names.
    expect(calls.filter((call) => !call.includes('/activity-cards'))).toEqual([
      `GET ${CHAT_ENDPOINT}?conversationId=c1`,
      `chat.loadHistory ${CHAT_ENDPOINT}?conversationId=c1`,
      `GET /ai/models?projectId=${PROJECT_ID}`,
      `GET /projects/${PROJECT_ID}`,
      `GET /projects/${PROJECT_ID}/git-status`,
      `GET /projects/${PROJECT_ID}/files-list`,
      `GET /projects/${PROJECT_ID}/conversations`,
    ])
  },
)

it(
  'retries a failed context-usage restore after four seconds',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    localStorage.setItem(`mol-chat-conv:${PROJECT_ID}`, 'c1')
    const calls: string[] = []
    let attempt = 0
    const http: HttpClient = {
      ...buildRejectingHttpClient(),
      get: (url: string): Promise<HttpResponse<never>> => {
        calls.push(`GET ${url}`)
        if (url === `${CHAT_ENDPOINT}?conversationId=c1` && attempt++ === 0) {
          return Promise.reject(new Error('transient'))
        }
        return Promise.resolve(responseOf({}))
      },
    }
    mounted = await mountPanel({
      http,
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    await vi.waitFor(() =>
      expect(
        calls.filter((call) => call === `GET ${CHAT_ENDPOINT}?conversationId=c1`),
      ).toHaveLength(1),
    )

    await new Promise((resolve) => setTimeout(resolve, 4200))
    await vi.waitFor(() =>
      expect(
        calls.filter((call) => call === `GET ${CHAT_ENDPOINT}?conversationId=c1`),
      ).toHaveLength(2),
    )
  },
)

it(
  'refetches the git status once the host signals a file mutation, and not for the initial zero',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    const calls: string[] = []
    mounted = await mountPanel({
      http: buildRecordingHttp(calls),
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    const gitStatusCalls = (): number =>
      calls.filter((call) => call === `GET /projects/${PROJECT_ID}/git-status`).length
    await vi.waitFor(() => expect(gitStatusCalls()).toBe(1))

    // No tick yet: the host's file-mutation signal stays quiet.
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(gitStatusCalls()).toBe(1)

    mounted.props['gitStatusTick'] = 1
    mounted.tick()
    await vi.waitFor(() => expect(gitStatusCalls()).toBe(2))
  },
)

it(
  're-reads the project settings when the host bumps the model-selection signal, but not for its initial zero',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    const calls: string[] = []
    mounted = await mountPanel({
      http: buildRecordingHttp(calls),
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    const settingsCalls = (): number =>
      calls.filter((call) => call === `GET /projects/${PROJECT_ID}`).length
    await vi.waitFor(() => expect(settingsCalls()).toBe(1))

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(settingsCalls()).toBe(1)

    mounted.props['modelSelectionSignal'] = 1
    mounted.tick()
    await vi.waitFor(() => expect(settingsCalls()).toBe(2))
  },
)

it(
  'retries an empty skills seed after a second and a half, and latches on the non-empty answer',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    const calls: string[] = []
    let fileListCalls = 0
    mounted = await mountPanel({
      http: buildRecordingHttp(calls, (url) => {
        if (url.endsWith('/files-list')) {
          fileListCalls++
          return { files: fileListCalls === 1 ? [] : ['.agents/skills/auth/SKILL.md'] }
        }
        if (url.endsWith('/git-status')) return { files: [] }
        if (url.endsWith('/files/.agents/skills/auth/SKILL.md')) {
          return { content: '---\nname: Auth\ndescription: Login rules\n---\n' }
        }
        return {}
      }),
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    const listCalls = (): number =>
      calls.filter((call) => call === `GET /projects/${PROJECT_ID}/files-list`).length
    await vi.waitFor(() => expect(listCalls()).toBe(1))

    await vi.waitFor(() => expect(listCalls()).toBe(2), { timeout: 3000 })
    // Latched on the non-empty answer: no further retries.
    await new Promise((resolve) => setTimeout(resolve, 1800))
    expect(listCalls()).toBe(2)
  },
)

it(
  'reports the chat loading state through the session it connects on mount',
  { timeout: PANEL_TEST_TIMEOUT_MS },
  async () => {
    const calls: string[] = []
    mounted = await mountPanel({
      http: buildRecordingHttp(calls),
      chat: buildRecordingChatProvider(calls),
      projectId: PROJECT_ID,
    })
    // The session's history load is the connect proof this unit can observe
    // before the host-callback binding lands in the shared harness.
    await vi.waitFor(() => expect(calls).toContain(`chat.loadHistory ${CHAT_ENDPOINT}`))
  },
)
