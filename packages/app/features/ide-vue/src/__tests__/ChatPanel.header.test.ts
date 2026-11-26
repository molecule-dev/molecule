// @vitest-environment jsdom
/**
 * The outer ChatPanel unit: the conversation-selector header (its state, list
 * and selection, the new-chat POST and the chatKey remount) and the report /
 * share modal slots rendered at the chat root.
 *
 * The header cases drive the real panel through the DOM the conformance kit
 * uses (`data-mol-id` selectors); the modal cases build the panel context the
 * way `ChatInner` does, from the real slice factories, so the slots receive
 * the same values they receive in the running panel.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  computed,
  createApp,
  defineComponent,
  h,
  nextTick,
  ref,
  shallowReactive,
  type VNodeChild,
} from 'vue'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { moleculePlugin, resetChatStoresForTests, useTranslation } from '@molecule/app-vue'

import type { ChatCtx, ChatInnerProps } from '../components/chat-panel/context.js'
import { renderChatReportModal } from '../components/chat-panel/render-chat-report-modal.js'
import { renderChatShareModal } from '../components/chat-panel/render-chat-share-modal.js'
import type { ChatEnvSlice } from '../components/chat-panel/use-chat-env.js'
import { createChatPopups } from '../components/chat-panel/use-chat-popups.js'
import { createChatRenderHandlers } from '../components/chat-panel/use-chat-render-handlers.js'
import { createChatSystemCards } from '../components/chat-panel/use-chat-system-cards.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  flush,
  makeStorage,
  mountPanel,
  type PanelMount,
  responseOf,
} from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** One scripted request of the fake client. */
interface ScriptedRequest {
  /** The verb. */
  method: 'GET' | 'POST'
  /** The exact URL the call passes. */
  url: string
  /** The response payload. */
  data?: unknown
}

/**
 * A client that answers the scripted requests in order (the first unused entry
 * with the same method and URL) and records every call.
 *
 * @param script - The scripted requests.
 * @param calls - The call log the assertions read.
 * @returns The fake client.
 */
function buildScriptedHttpClient(script: ScriptedRequest[], calls: string[]): HttpClient {
  const pending = [...script]
  const respond = (method: 'GET' | 'POST', url: string): Promise<HttpResponse<never>> => {
    calls.push(`${method} ${url}`)
    const index = pending.findIndex((entry) => entry.method === method && entry.url === url)
    if (index < 0) return Promise.reject(new Error(`${method} ${url} is not scripted`))
    const [entry] = pending.splice(index, 1)
    return Promise.resolve(responseOf(entry?.data))
  }
  return {
    ...buildRejectingHttpClient(),
    get: (url: string) => respond('GET', url),
    post: (url: string) => respond('POST', url),
  }
}

/** A conversation list row the fake server returns. */
const conversationOf = (id: string, preview: string | null, minutesAgo: number) => ({
  id,
  createdAt: new Date(Date.now() - 60_000 * 60).toISOString(),
  updatedAt: new Date(Date.now() - 60_000 * minutesAgo).toISOString(),
  preview,
})

/** The list route of the panel's default project. */
const LIST_URL = '/projects/proj-test/conversations'

/** The create route of the panel's default project. */
const CREATE_URL = '/projects/proj-test/conversations'

/** Lets the panel's reactive updates and the fake HTTP microtasks settle. */
const settle = async (): Promise<void> => {
  await flush()
  await flush()
}

/** The storage key the panel remembers the open conversation in. */
const STORAGE_KEY = 'mol-chat-conv:proj-test'

/** The mount alive right now, if any. */
let mounted: PanelMount | null = null

/** The requests the current mount made. */
let calls: string[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
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
  calls = []
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  resetChatStoresForTests()
})

describe('conversation-selector header', () => {
  it('renders React’s header controls above the chat, titled Chat history', () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([] as ChatMessage[]),
    })
    const container = mounted.container

    const toggle = container.querySelector('[data-mol-id="chat-conversation-toggle"]')
    expect(toggle, 'the conversation toggle renders').not.toBeNull()
    expect(toggle?.textContent).toContain('Chat history')
    expect(container.querySelector('[data-mol-id="chat-share-button"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="chat-report-button"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="chat-settings-button"]')).not.toBeNull()
    expect(container.querySelector('[data-mol-id="chat-new-conversation"]')).not.toBeNull()

    const header = toggle?.parentElement as HTMLElement
    expect(header.style.height).toBe('33px')
    expect(header.style.minHeight).toBe('33px')
    expect(header.style.zIndex).toBe('10')
  })

  it('fetches the conversation list on mount and titles itself after the open conversation', async () => {
    localStorage.setItem(STORAGE_KEY, 'c1')
    const http = buildScriptedHttpClient(
      [
        {
          method: 'GET',
          url: LIST_URL,
          data: { conversations: [conversationOf('c1', 'Build a todo app', 5)] },
        },
      ],
      calls,
    )
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })

    await settle()
    expect(calls).toContain(`GET ${LIST_URL}`)
    expect(
      mounted.container.querySelector('[data-mol-id="chat-conversation-toggle"]')?.textContent,
    ).toContain('Build a todo app')
  })

  it('fetches nothing and renders no header in headless mode', async () => {
    const http = buildScriptedHttpClient(
      [{ method: 'GET', url: LIST_URL, data: { conversations: [] } }],
      calls,
    )
    mounted = mountPanel({
      http,
      chat: buildChatProvider([] as ChatMessage[]),
      props: { renderConversationHeader: false },
    })

    await settle()
    expect(calls).not.toContain(`GET ${LIST_URL}`)
    expect(mounted.container.querySelector('[data-mol-id="chat-conversation-toggle"]')).toBeNull()
  })

  it('hides the header during discovery but still loads the list', async () => {
    const http = buildScriptedHttpClient(
      [{ method: 'GET', url: LIST_URL, data: { conversations: [] } }],
      calls,
    )
    mounted = mountPanel({
      http,
      chat: buildChatProvider([] as ChatMessage[]),
      props: { hideConversationMenu: true },
    })

    await settle()
    expect(mounted.container.querySelector('[data-mol-id="chat-conversation-toggle"]')).toBeNull()
    expect(calls).toContain(`GET ${LIST_URL}`)
  })

  it('opens the dropdown with the saved conversations, their ages and a refetch', async () => {
    const http = buildScriptedHttpClient(
      [
        {
          method: 'GET',
          url: LIST_URL,
          data: {
            conversations: [
              conversationOf('c1', 'Build a todo app', 5),
              conversationOf('c2', 'Fix the login bug', 90),
            ],
          },
        },
        {
          method: 'GET',
          url: LIST_URL,
          data: {
            conversations: [
              conversationOf('c1', 'Build a todo app', 5),
              conversationOf('c2', 'Fix the login bug', 90),
              conversationOf('c3', 'Add a settings page', 1500),
            ],
          },
        },
      ],
      calls,
    )
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    const toggle = mounted.container.querySelector<HTMLElement>(
      '[data-mol-id="chat-conversation-toggle"]',
    )
    toggle?.click()
    await settle()

    const rows = mounted.container.querySelectorAll('[data-mol-id^="chat-conversation-c"]')
    expect(Array.from(rows).map((row) => row.getAttribute('data-mol-id'))).toEqual([
      'chat-conversation-c1',
      'chat-conversation-c2',
      'chat-conversation-c3',
    ])
    expect(rows[0]?.textContent).toContain('Build a todo app')
    expect(rows[0]?.textContent).toContain('5m ago')
    expect(rows[1]?.textContent).toContain('1h ago')
    expect(rows[2]?.textContent).toContain('1d ago')
    expect(calls.filter((call) => call === `GET ${LIST_URL}`)).toHaveLength(2)
  })

  it('filters the dropdown by the search query and shows the empty state', async () => {
    const list = {
      method: 'GET' as const,
      url: LIST_URL,
      data: {
        conversations: [
          conversationOf('c1', 'Build a todo app', 5),
          conversationOf('c2', 'Fix the login bug', 90),
        ],
      },
    }
    const http = buildScriptedHttpClient([list, { ...list }], calls)
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    mounted.container
      .querySelector<HTMLElement>('[data-mol-id="chat-conversation-toggle"]')
      ?.click()
    await settle()

    const search = mounted.container.querySelector<HTMLInputElement>(
      'input[placeholder="Search conversations…"]',
    )
    expect(search, 'the dropdown carries its search field').not.toBeNull()
    ;(search as HTMLInputElement).value = 'todo'
    search?.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()

    expect(
      Array.from(mounted.container.querySelectorAll('[data-mol-id^="chat-conversation-c"]')).map(
        (row) => row.getAttribute('data-mol-id'),
      ),
    ).toEqual(['chat-conversation-c1'])

    ;(search as HTMLInputElement).value = 'zzz'
    search?.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    expect(mounted.container.textContent).toContain('No conversations yet')
  })

  it('shows New conversation for a row without a preview', async () => {
    const http = buildScriptedHttpClient(
      [
        {
          method: 'GET',
          url: LIST_URL,
          data: { conversations: [conversationOf('c1', null, 5)] },
        },
        {
          method: 'GET',
          url: LIST_URL,
          data: { conversations: [conversationOf('c1', null, 5)] },
        },
      ],
      calls,
    )
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    mounted.container
      .querySelector<HTMLElement>('[data-mol-id="chat-conversation-toggle"]')
      ?.click()
    await settle()

    expect(
      mounted.container.querySelector('[data-mol-id="chat-conversation-c1"]')?.textContent,
    ).toContain('New conversation')
  })

  it('selects a conversation, remembers it and titles the header after it', async () => {
    const list = {
      method: 'GET' as const,
      url: LIST_URL,
      data: {
        conversations: [
          conversationOf('c1', 'Build a todo app', 5),
          conversationOf('c2', 'Fix the login bug', 90),
        ],
      },
    }
    const http = buildScriptedHttpClient([list, { ...list }], calls)
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    mounted.container
      .querySelector<HTMLElement>('[data-mol-id="chat-conversation-toggle"]')
      ?.click()
    await settle()
    mounted.container.querySelector<HTMLElement>('[data-mol-id="chat-conversation-c2"]')?.click()
    await settle()

    expect(localStorage.getItem(STORAGE_KEY)).toBe('c2')
    expect(
      mounted.container.querySelector('[data-mol-id="chat-conversation-toggle"]')?.textContent,
    ).toContain('Fix the login bug')
    expect(mounted.container.querySelector('[data-mol-id="chat-conversation-c2"]')).toBeNull()
  })

  it('starts a new conversation from the POST and closes the dropdown', async () => {
    const http = buildScriptedHttpClient(
      [
        {
          method: 'GET',
          url: LIST_URL,
          data: { conversations: [conversationOf('c1', 'Build a todo app', 5)] },
        },
        {
          method: 'GET',
          url: LIST_URL,
          data: { conversations: [conversationOf('c1', 'Build a todo app', 5)] },
        },
        { method: 'POST', url: CREATE_URL, data: { id: 'c-new' } },
      ],
      calls,
    )
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    mounted.container
      .querySelector<HTMLElement>('[data-mol-id="chat-conversation-toggle"]')
      ?.click()
    await settle()
    mounted.container.querySelector<HTMLElement>('[data-mol-id="chat-new-conversation"]')?.click()
    await settle()

    expect(calls).toContain(`POST ${CREATE_URL}`)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('c-new')
    expect(
      mounted.container.querySelector('[data-mol-id="chat-conversation-toggle"]')?.textContent,
    ).toContain('Chat history')
  })

  it('forgets the conversation when the create request fails', async () => {
    localStorage.setItem(STORAGE_KEY, 'c1')
    const http = buildScriptedHttpClient(
      [
        {
          method: 'GET',
          url: LIST_URL,
          data: { conversations: [conversationOf('c1', 'Build a todo app', 5)] },
        },
      ],
      calls,
    )
    const failing: HttpClient = {
      ...http,
      post: (url: string): Promise<HttpResponse<never>> => {
        calls.push(`POST ${url}`)
        return Promise.reject(new Error('create failed'))
      },
    }
    mounted = mountPanel({ http: failing, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    mounted.container.querySelector<HTMLElement>('[data-mol-id="chat-new-conversation"]')?.click()
    await settle()

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('hides the new-chat button from a viewer', async () => {
    mounted = mountPanel({
      http: buildRejectingHttpClient(),
      chat: buildChatProvider([] as ChatMessage[]),
      props: { canEdit: false },
    })
    await settle()

    expect(mounted.container.querySelector('[data-mol-id="chat-new-conversation"]')).toBeNull()
    expect(mounted.container.querySelector('[data-mol-id="chat-report-button"]')).not.toBeNull()
  })

  it('closes the dropdown on a mousedown outside it', async () => {
    const http = buildScriptedHttpClient(
      [
        { method: 'GET', url: LIST_URL, data: { conversations: [conversationOf('c1', null, 5)] } },
        { method: 'GET', url: LIST_URL, data: { conversations: [conversationOf('c1', null, 5)] } },
      ],
      calls,
    )
    mounted = mountPanel({ http, chat: buildChatProvider([] as ChatMessage[]) })
    await settle()

    mounted.container
      .querySelector<HTMLElement>('[data-mol-id="chat-conversation-toggle"]')
      ?.click()
    await settle()
    expect(mounted.container.querySelector('[data-mol-id="chat-conversation-c1"]')).not.toBeNull()

    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    await settle()
    expect(mounted.container.querySelector('[data-mol-id="chat-conversation-c1"]')).toBeNull()
  })
})

describe('report and share modal slots', () => {
  /** What the mock close/submitted handlers recorded. */
  interface ModalLog {
    /** How many times the report modal was closed. */
    reportClosed: number
    /** The results the report modal submitted. */
    reportSubmitted: unknown[]
    /** How many times the share modal was closed. */
    shareClosed: number
  }

  /** The mounted modal harness. */
  interface ModalMount {
    /** The element the app mounted into. */
    container: HTMLElement
    /** The live panel context. */
    ctx: ChatCtx
    /** Unmounts the app. */
    unmount: () => void
  }

  /**
   * Mounts the two modal slots over a real context.
   *
   * @param props - The inner chat props.
   * @param http - The HTTP client the modals use.
   * @param log - The handler log.
   * @returns The mount.
   */
  function mountModals(props: ChatInnerProps, http: HttpClient, log: ModalLog): ModalMount {
    document.body.innerHTML = ''
    const container = document.createElement('div')
    document.body.appendChild(container)
    const reactiveProps = shallowReactive<ChatInnerProps>(props)
    let built: ChatCtx | null = null
    const app = createApp(
      defineComponent({
        name: 'ModalSlotsHarness',
        setup() {
          const { t, locale } = useTranslation()
          const env: ChatEnvSlice = {
            t,
            locale,
            cm: getClassMap(),
            http,
            themeMode: computed(() => 'light'),
            isLight: computed(() => true),
            isNarrow: ref(false),
            isCoarse: ref(false),
            popupMaxHeight: computed(() => '70vh'),
            transcriptOnly: computed(() => false),
            shareAllowed: computed(() => reactiveProps.canShare ?? reactiveProps.canEdit !== false),
            hasConversation: computed(() => true),
            conversationId: computed(() => 'conv-1'),
            conversationIdRef: { current: 'conv-1' },
            effects: { 1: () => {} },
          }
          const ctx = { props: reactiveProps, env } as ChatCtx
          built = createAppContext(ctx, log)
          return (): VNodeChild => [renderChatReportModal(ctx), renderChatShareModal(ctx)]
        },
      }),
    )
    app.use(moleculePlugin, {
      i18n: createSimpleI18nProvider('en'),
      theme: buildThemeProvider(),
      http,
    })
    app.mount(container)
    if (!built) throw new Error('the modal context was not built')
    return {
      container: container.ownerDocument.body,
      ctx: built,
      unmount: () => {
        app.unmount()
        document.body.innerHTML = ''
      },
    }
  }

  /**
   * Fills the context's slice surfaces the modal slots read.
   *
   * @param ctx - The partially built context (props and env set).
   * @param log - The handler log.
   * @returns The same context, completed.
   */
  function createAppContext(ctx: ChatCtx, log: ModalLog): ChatCtx {
    ctx.popups = createChatPopups(ctx)
    ctx.renderHandlers = {
      ...createChatRenderHandlers(ctx),
      closeReportModal: () => {
        log.reportClosed += 1
        ctx.popups.setReportModal(null)
      },
      handleReportSubmitted: (result) => {
        log.reportSubmitted.push(result)
        ctx.popups.setReportModal(null)
      },
      closeShareModal: () => {
        log.shareClosed += 1
        ctx.popups.setShareModal(null)
      },
    }
    ctx.systemCards = createChatSystemCards(ctx)
    return ctx
  }

  /** A fresh handler log. */
  const emptyLog = (): ModalLog => ({ reportClosed: 0, reportSubmitted: [], shareClosed: 0 })

  let modal: ModalMount | null = null

  afterEach(() => {
    modal?.unmount()
    modal = null
  })

  it('opens the report modal on its seed and closes from the modal', async () => {
    const log = emptyLog()
    modal = mountModals(
      { projectId: 'proj-modal', endpoint: '/projects/proj-modal/chat' },
      buildRejectingHttpClient(),
      log,
    )
    expect(modal.container.querySelector('[data-mol-id="report-modal"]')).toBeNull()

    modal.ctx.popups.setReportModal({ title: 'Broken build' })
    await nextTick()

    const dialog = modal.container.querySelector('[data-mol-id="report-modal"]')
    expect(dialog, 'the seeded report modal renders').not.toBeNull()
    const title = modal.container.querySelector<HTMLInputElement>('[data-mol-id="report-title"]')
    expect(title?.value).toBe('Broken build')

    modal.container.querySelector<HTMLElement>('[data-mol-id="report-cancel"]')?.click()
    await nextTick()
    expect(log.reportClosed).toBe(1)
    expect(modal.container.querySelector('[data-mol-id="report-modal"]')).toBeNull()
  })

  it('submits the report against the open conversation', async () => {
    const log = emptyLog()
    const http = buildScriptedHttpClient(
      [
        {
          method: 'POST',
          url: '/projects/proj-modal/report?conversationId=conv-1',
          data: { ok: true, id: 'r1' },
        },
      ],
      calls,
    )
    modal = mountModals(
      { projectId: 'proj-modal', endpoint: '/projects/proj-modal/chat' },
      http,
      log,
    )
    modal.ctx.popups.setReportModal({ title: 'Broken build' })
    await nextTick()

    const description = modal.container.querySelector<HTMLTextAreaElement>(
      '[data-mol-id="report-description"]',
    )
    expect(description, 'the description field renders').not.toBeNull()
    ;(description as HTMLTextAreaElement).value = 'The preview never loads.'
    description?.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    modal.container.querySelector<HTMLElement>('[data-mol-id="report-submit"]')?.click()
    await settle()

    expect(calls).toContain('POST /projects/proj-modal/report?conversationId=conv-1')
    expect(log.reportSubmitted).toEqual([{ ok: true, id: 'r1' }])
  })

  it('opens the share modal with the host section and closes from it', async () => {
    const log = emptyLog()
    modal = mountModals(
      {
        projectId: 'proj-modal',
        endpoint: '/projects/proj-modal/chat',
        shareLinksAllowed: false,
        shareModalContent: h('div', { 'data-mol-id': 'host-share-extra' }, ['Host section']),
      },
      buildRejectingHttpClient(),
      log,
    )
    expect(modal.container.querySelector('[data-mol-id="share-modal"]')).toBeNull()

    modal.ctx.popups.setShareModal({ role: 'viewer' })
    await nextTick()

    const dialog = modal.container.querySelector('[data-mol-id="share-modal"]')
    expect(dialog, 'the seeded share modal renders').not.toBeNull()
    expect(dialog?.textContent).toContain('Share project')
    expect(modal.container.querySelector('[data-mol-id="host-share-extra"]')?.textContent).toBe(
      'Host section',
    )

    modal.container.querySelector<HTMLElement>('[data-mol-id="share-close"]')?.click()
    await nextTick()
    expect(log.shareClosed).toBe(1)
    expect(modal.container.querySelector('[data-mol-id="share-modal"]')).toBeNull()
  })
})
