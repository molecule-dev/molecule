// @vitest-environment jsdom
/**
 * The `chat:submit`, `chat:auto-send` and `chat:queued-edit` slices.
 *
 * `chat:submit` is driven directly (the composer's Enter path belongs to the
 * keyboard unit), so each case asserts React's exact route effect — the card,
 * the request, the send and its flags — without the units that still stub the
 * keyboard and the sections.
 *
 * `chat:auto-send` needs prop changes (the pending-message key bump, the
 * user-edit key), so its host keeps the props in a store: updating it is
 * React's `rerender` and re-runs the same effect branch.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { writable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ChatAttachment,
  ChatConfig,
  ChatEventHandler,
  ChatProvider,
} from '@molecule/app-ai-chat'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { CHAT_TIMESTAMPS_STORAGE_KEY } from '@molecule/app-ide-panel-logic'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { createChatActivity } from '../components/chat-panel/chat-activity.svelte.js'
import { createChatAttachments } from '../components/chat-panel/chat-attachments.svelte.js'
import { createChatAutoCommit } from '../components/chat-panel/chat-auto-commit.svelte.js'
import { createChatAutoFix } from '../components/chat-panel/chat-auto-fix.svelte.js'
import { createChatAutoSend } from '../components/chat-panel/chat-auto-send.svelte.js'
import { createChatChat } from '../components/chat-panel/chat-chat.svelte.js'
import { createChatCommands } from '../components/chat-panel/chat-commands.svelte.js'
import { createChatComposer } from '../components/chat-panel/chat-composer.svelte.js'
import { createChatContextUsage } from '../components/chat-panel/chat-context-usage.svelte.js'
import { createChatEnv } from '../components/chat-panel/chat-env.svelte.js'
import { createChatGit } from '../components/chat-panel/chat-git.svelte.js'
import { createChatInput } from '../components/chat-panel/chat-input.svelte.js'
import { createChatMention } from '../components/chat-panel/chat-mention.svelte.js'
import { createChatModelActions } from '../components/chat-panel/chat-model-actions.svelte.js'
import { createChatModels } from '../components/chat-panel/chat-models.svelte.js'
import { createChatOverlay } from '../components/chat-panel/chat-overlay.svelte.js'
import { createChatPopups } from '../components/chat-panel/chat-popups.svelte.js'
import { createChatPrefs } from '../components/chat-panel/chat-prefs.svelte.js'
import {
  type ChatQueuedEditSlice,
  createChatQueuedEdit,
} from '../components/chat-panel/chat-queued-edit.svelte.js'
import { createChatScroll } from '../components/chat-panel/chat-scroll.svelte.js'
import { createChatSkills } from '../components/chat-panel/chat-skills.svelte.js'
import { createChatSounds } from '../components/chat-panel/chat-sounds.svelte.js'
import { createChatStream } from '../components/chat-panel/chat-stream.svelte.js'
import {
  type ChatSubmitSlice,
  createChatSubmit,
} from '../components/chat-panel/chat-submit.svelte.js'
import { createChatSystemCards } from '../components/chat-panel/chat-system-cards.svelte.js'
import { createChatTests } from '../components/chat-panel/chat-tests.svelte.js'
import { createChatTestsBar } from '../components/chat-panel/chat-tests-bar.svelte.js'
import { createChatTips } from '../components/chat-panel/chat-tips.svelte.js'
import { createChatUndo } from '../components/chat-panel/chat-undo.svelte.js'
import { createChatVoice } from '../components/chat-panel/chat-voice.svelte.js'
import type { ChatContext, ChatInnerProps } from '../components/chat-panel/context.svelte.js'
import { buildRejectingHttpClient, flush, makeStorage, responseOf } from './chat-panel-harness.js'
import ChatSlicePropsHost from './ChatSlicePropsHost.svelte'
import { buildThemeProvider } from './theme-test-provider.js'

/** The project the panel belongs to. */
const PROJECT_ID = 'p1'

/** One request the slices made, in order. */
interface RecordedRequest {
  /** The method, uppercased. */
  method: string
  /** The requested path. */
  url: string
  /** The request body, when the method carries one. */
  body?: unknown
}

/** One send the chat provider received, with its config and attachments. */
interface RecordedSend {
  /** The message text. */
  message: string
  /** The per-send config (its intent flags ride here). */
  config: ChatConfig
  /** The attachments that rode the send. */
  attachments?: ChatAttachment[]
}

/** One queue acceptance the provider received. */
interface RecordedQueue {
  /** The message text. */
  message: string
  /** The id the server holds the queued message under. */
  messageId: string | undefined
}

/** What a recording provider kept. */
interface ChatRecorder {
  /** Every turn send, in order. */
  sends: RecordedSend[]
  /** Every side-channel send, in order. */
  sideSends: RecordedSend[]
  /** Every durable queue acceptance, in order. */
  queues: RecordedQueue[]
  /** Every deleted queued message id, in order. */
  deleted: string[]
  /** Settles the send currently held open (when one is). */
  finishStream: () => void
}

/**
 * A chat provider that records sends, queue acceptances and deletes, and can
 * hold its first reply open so a turn stays streaming.
 *
 * @param holdStream - Whether a send's reply is held open until `finishStream`.
 * @returns The recorder, with its provider fields on it.
 */
function chatRecorder(holdStream: boolean): ChatRecorder & ChatProvider {
  let finish: (() => void) | null = null
  const recorder: ChatRecorder & ChatProvider = {
    name: 'recording',
    sends: [],
    sideSends: [],
    queues: [],
    deleted: [],
    async sendMessage(
      message: string,
      config: ChatConfig,
      onEvent: ChatEventHandler,
      attachments?: ChatAttachment[],
    ): Promise<void> {
      recorder.sends.push({ message, config, attachments })
      if (!holdStream) {
        onEvent({ type: 'done' })
        return
      }
      await new Promise<void>((resolve) => {
        finish = () => {
          onEvent({ type: 'done' })
          resolve()
        }
      })
    },
    async sendSideMessage(message: string, config: ChatConfig): Promise<void> {
      recorder.sideSends.push({ message, config })
    },
    async queueMessage(message: string, config: ChatConfig): Promise<void> {
      recorder.queues.push({ message, messageId: config.messageId })
    },
    async deleteQueuedMessage(messageId: string): Promise<void> {
      recorder.deleted.push(messageId)
    },
    abort(): void {},
    async clearHistory(): Promise<void> {},
    async loadHistory(): Promise<never[]> {
      return []
    },
    finishStream(): void {
      finish?.()
    },
  }
  return recorder
}

/** One scripted answer. */
interface Reply {
  /** The response body. */
  data: unknown
  /** The HTTP status (`>= 400` rejects the request). */
  status?: number
}

/**
 * An HTTP client that records every request and answers from a script.
 *
 * @param requests - Receives every recorded request.
 * @param replies - Answers keyed by `METHOD /path`.
 * @returns The client.
 */
function scriptedHttp(requests: RecordedRequest[], replies: Record<string, Reply>): HttpClient {
  const base = buildRejectingHttpClient()
  const answer = async <T>(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<HttpResponse<T>> => {
    requests.push({ method, url, body })
    const reply = replies[`${method} ${url}`]
    if (!reply) throw new Error(`unscripted ${method} ${url}`)
    if ((reply.status ?? 200) >= 400) throw new Error(`refused ${method} ${url}`)
    const response = responseOf(reply.data)
    return { ...response, status: reply.status ?? 200 } as HttpResponse<T>
  }
  return {
    ...base,
    request: (config) => answer(config.method.toUpperCase(), config.url, config.data),
    get: async (url) => answer('GET', url),
    post: async (url, body) => answer('POST', url, body),
    put: async (url, body) => answer('PUT', url, body),
    patch: async (url, body) => answer('PATCH', url, body),
    delete: async (url) => answer('DELETE', url),
  }
}

/** What a slice-level mount keeps. */
interface MountedSlices {
  /** The shared context. */
  ctx: ChatContext
  /** The submit slice under test. */
  submit: ChatSubmitSlice
  /** The queued-edit slice under test. */
  queuedEdit: ChatQueuedEditSlice
  /** Every send the chat provider received. */
  sends: RecordedSend[]
  /** The chat provider recorder. */
  chat: ChatRecorder & ChatProvider
  /** Every request made, in order. */
  requests: RecordedRequest[]
  /** Applies a partial props change — React's `rerender`. */
  setProps: (next: Partial<ChatInnerProps>) => void
  /** Tears the mount down. */
  unmount: () => void
}

/** The mounts alive right now. */
const sliceMounts: MountedSlices[] = []

/**
 * Mounts the ported slices over the shared context, with every slice they read
 * created by its own factory. The queued-edit effect is always registered at
 * ChatInner's position; `autoSend` also registers the four auto-send effects
 * there, so the initial / pending sends run on mount and on each props change.
 *
 * @param options - The scripted replies, the props, the chat provider and
 *   whether the auto-send effects register.
 * @returns The mounted slices.
 */
function mountSlices(options: {
  replies?: Record<string, Reply>
  props?: Partial<ChatInnerProps>
  chat?: ChatProvider
  autoSend?: boolean
}): MountedSlices {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const requests: RecordedRequest[] = []
  const chat = chatRecorder(false)
  const propsStore = writable<ChatInnerProps>({
    projectId: PROJECT_ID,
    endpoint: `/projects/${PROJECT_ID}/chat`,
    ...options.props,
  })
  let ctx!: ChatContext
  const instance = mount(ChatSlicePropsHost, {
    target: container,
    props: {
      http: scriptedHttp(requests, options.replies ?? {}),
      chat: options.chat ?? chat,
      theme: buildThemeProvider(),
      props: propsStore,
      build: (context: ChatContext) => {
        context.env = createChatEnv(context)
        context.stream = createChatStream(context)
        context.contextUsage = createChatContextUsage(context)
        context.autoFix = createChatAutoFix(context)
        context.autoCommit = createChatAutoCommit(context)
        context.chat = createChatChat(context)
        context.git = createChatGit(context)
        context.scroll = createChatScroll(context)
        context.undo = createChatUndo(context)
        context.composer = createChatComposer(context)
        context.popups = createChatPopups(context)
        context.sounds = createChatSounds(context)
        context.overlay = createChatOverlay(context)
        context.voice = createChatVoice(context)
        context.systemCards = createChatSystemCards(context)
        context.activity = createChatActivity(context)
        context.tips = createChatTips(context)
        context.prefs = createChatPrefs(context)
        context.tests = createChatTests(context)
        context.skills = createChatSkills(context)
        context.models = createChatModels(context)
        context.queuedEdit = createChatQueuedEdit(context)
        context.queuedEdit.effects[1]()
        context.autoSend = createChatAutoSend(context)
        if (options.autoSend) {
          context.autoSend.effects[1]()
          context.autoSend.effects[2]()
          context.autoSend.effects[3]()
          context.autoSend.effects[4]()
        }
        context.testsBar = createChatTestsBar(context)
        context.mention = createChatMention(context)
        context.attachments = createChatAttachments(context)
        context.input = createChatInput(context)
        context.modelActions = createChatModelActions(context)
        context.commands = createChatCommands(context)
        context.submit = createChatSubmit(context)
        ctx = context
      },
    },
  })
  flushSync()
  const mounted: MountedSlices = {
    ctx,
    submit: ctx.submit,
    queuedEdit: ctx.queuedEdit,
    sends: chat.sends,
    chat,
    requests,
    setProps: (next): void => {
      propsStore.update((current) => ({ ...current, ...next }))
      flushSync()
    },
    unmount: () => {
      void unmount(instance)
      document.body.innerHTML = ''
    },
  }
  sliceMounts.push(mounted)
  return mounted
}

/**
 * The text of every system card published so far.
 *
 * @param ctx - The shared context.
 * @returns The cards' text, in order.
 */
function cardTexts(ctx: ChatContext): string[] {
  return ctx.popups.systemCards.map((card) => card.text)
}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  resetChatStoresForTests()
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  for (const mounted of sliceMounts.splice(0)) mounted.unmount()
  resetChatStoresForTests()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel chat:submit slice', () => {
  it('sends the composer text and clears the draft', async () => {
    const { ctx, submit, sends, requests } = mountSlices({})
    ctx.composer.inputRef.current = 'Build the header'
    await submit.handleSubmit()
    expect(sends).toHaveLength(1)
    expect(sends[0]?.message).toBe('Build the header')
    expect(sends[0]!.attachments).toBeUndefined()
    expect(ctx.composer.inputRef.current).toBe('')
    expect(ctx.composer.hasInput).toBe(false)
    expect(requests).toEqual([])
  })

  it('ignores an empty submit and sends nothing', async () => {
    const { submit, sends } = mountSlices({})
    await submit.handleSubmit()
    expect(sends).toEqual([])
  })

  it('fetches an @-mentioned file and embeds its contents in the message', async () => {
    const { ctx, submit, sends, requests } = mountSlices({
      replies: { 'GET /projects/p1/files/src/a.ts': { data: { content: 'export const a = 1' } } },
    })
    ctx.composer.inputRef.current = 'Look at this'
    ctx.popups.setAttachedFiles([
      { path: '/src/a.ts', filename: 'a.ts', mediaType: 'text/plain', size: 19 },
    ])
    await submit.handleSubmit()
    expect(requests).toEqual([
      { method: 'GET', url: '/projects/p1/files/src/a.ts', body: undefined },
    ])
    expect(sends[0]?.message).toBe(
      'Look at this\n\n<file path="src/a.ts">\n```ts\nexport const a = 1\n```\n</file>',
    )
    expect(ctx.popups.attachedFiles).toEqual([])
    expect(ctx.popups.attachmentError).toBeNull()
  })

  it('sends a placeholder block when the mentioned file cannot be read', async () => {
    const { ctx, submit, sends } = mountSlices({})
    ctx.composer.inputRef.current = 'Look at this'
    ctx.popups.setAttachedFiles([
      { path: '/src/a.ts', filename: 'a.ts', mediaType: 'text/plain', size: 19 },
    ])
    await submit.handleSubmit()
    expect(sends[0]?.message).toBe(
      'Look at this\n\n<file path="src/a.ts">[Could not read file]</file>',
    )
  })

  it('encodes a binary attachment and rides it on the send', async () => {
    const { ctx, submit, sends } = mountSlices({})
    ctx.composer.inputRef.current = 'See the image'
    ctx.popups.setAttachedFiles([
      {
        file: new File(['hi'], 'note.txt', { type: 'text/plain' }),
        filename: 'note.txt',
        mediaType: 'text/plain',
        size: 2,
      },
    ])
    await submit.handleSubmit()
    expect(sends[0]?.attachments).toEqual([
      { mediaType: 'text/plain', data: 'aGk=', filename: 'note.txt', size: 2 },
    ])
  })

  it('flags a send that still carries dictated text', async () => {
    const { ctx, submit, sends } = mountSlices({})
    ctx.composer.inputRef.current = 'dictated words'
    ctx.composer.dictatedSnippetsRef.current = ['dictated']
    await submit.handleSubmit()
    expect(sends[0]?.config.viaDictation).toBe(true)
    expect(ctx.composer.dictatedSnippetsRef.current).toEqual([])
  })

  it('refuses a typed message from a viewer with the read-only note', async () => {
    const { ctx, submit, sends } = mountSlices({ props: { canEdit: false } })
    ctx.composer.inputRef.current = 'Build a page'
    await submit.handleSubmit()
    expect(sends).toEqual([])
    expect(ctx.composer.inputRef.current).toBe('')
    expect(cardTexts(ctx)).toEqual([
      "You have view-only access, so you can't run the assistant here. You can still read along and use /teamsay to message the team.",
    ])
  })

  it('answers a typed team note with the unavailable card when team messaging is off', async () => {
    const { ctx, submit, sends } = mountSlices({
      props: {
        canSendTeamMessages: false,
        extraCommands: [
          {
            id: 'teamsay',
            label: '/teamsay',
            description: 'Post a note',
            category: 'collaborate',
            sideChannel: true,
          },
        ],
      },
    })
    ctx.composer.inputRef.current = '/teamsay hello'
    await submit.handleSubmit()
    expect(sends).toEqual([])
    expect(cardTexts(ctx)).toEqual(['Team messaging is unavailable in this workspace.'])
  })

  it('sends a viewer’s team note on the side channel and refills the prefix', async () => {
    const chat = chatRecorder(false)
    const { ctx, submit } = mountSlices({
      chat,
      props: {
        canEdit: false,
        canSendTeamMessages: true,
        extraCommands: [
          {
            id: 'teamsay',
            label: '/teamsay',
            description: 'Post a note',
            category: 'collaborate',
            sideChannel: true,
          },
        ],
      },
    })
    ctx.composer.inputRef.current = '/teamsay hello'
    await submit.handleSubmit()
    // A side-channel note never takes the turn stream: it leaves on the
    // provider's own side request, suppressed so no user bubble is echoed.
    expect(chat.sends).toEqual([])
    expect(chat.sideSends).toHaveLength(1)
    expect(chat.sideSends[0]?.message).toBe('/teamsay hello')
    expect(chat.sideSends[0]?.config).toMatchObject({ suppressUserMessage: true })
    expect(ctx.composer.inputRef.current).toBe('/teamsay ')
  })

  it('turns timestamps on through /timestamps and announces it', async () => {
    const { ctx, submit } = mountSlices({})
    ctx.composer.inputRef.current = '/timestamps on'
    await submit.handleSubmit()
    expect(cardTexts(ctx)).toEqual(['Timestamps shown.'])
    expect(localStorage.getItem(CHAT_TIMESTAMPS_STORAGE_KEY)).toBe('true')
  })

  it('shows the /timestamps usage line for an unrecognized argument', async () => {
    const { ctx, submit } = mountSlices({})
    ctx.composer.inputRef.current = '/timestamps maybe'
    await submit.handleSubmit()
    expect(cardTexts(ctx)).toEqual(['Usage: /timestamps [on | off]'])
  })

  it('runs /autofix through the command dispatcher', async () => {
    const { ctx, submit, requests } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: { settings: {} } } },
    })
    ctx.composer.inputRef.current = '/autofix'
    await submit.handleSubmit()
    // The dispatcher is async; the card lands after its PATCH settles.
    await flush()
    expect(requests).toEqual([
      { method: 'PATCH', url: '/projects/p1', body: { settings: { autoFix: false } } },
    ])
    expect(cardTexts(ctx)).toEqual(['Auto-fix disabled.'])
  })

  it('shows the /run usage line when no script is named', async () => {
    const { ctx, submit } = mountSlices({})
    ctx.composer.inputRef.current = '/run'
    await submit.handleSubmit()
    expect(cardTexts(ctx)).toEqual([
      'Usage: /run <name> — run a saved script. Use /scripts to see them.',
    ])
  })

  it('sends the /explain prompt', async () => {
    const { ctx, submit, sends } = mountSlices({})
    ctx.composer.inputRef.current = '/explain the login form'
    await submit.handleSubmit()
    expect(sends[0]?.message).toBe('Explain this in detail: the login form')
    expect(ctx.composer.inputRef.current).toBe('')
  })

  it('persists /maxloops and announces the new limit', async () => {
    const { ctx, submit, requests } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: { settings: {} } } },
    })
    ctx.composer.inputRef.current = '/maxloops 5'
    await submit.handleSubmit()
    expect(requests).toEqual([
      { method: 'PATCH', url: '/projects/p1', body: { settings: { maxToolLoops: 5 } } },
    ])
    expect(ctx.models.currentMaxLoops).toBe(5)
    expect(cardTexts(ctx)).toEqual(['Max tool iterations set to 5'])
  })

  it('shows the /model usage line from the live catalog', async () => {
    const { ctx, submit } = mountSlices({})
    ctx.composer.inputRef.current = '/model'
    await submit.handleSubmit()
    // An empty catalog leaves the example list empty, exactly as React's would.
    expect(cardTexts(ctx)).toEqual(['Usage: /model <model-name>  (e.g. )'])
  })

  it('opens the share modal for /share and its usage line for a bad role', async () => {
    const { ctx, submit } = mountSlices({})
    ctx.composer.inputRef.current = '/share editor'
    await submit.handleSubmit()
    expect(ctx.popups.shareModal).toEqual({ role: 'editor' })

    ctx.composer.inputRef.current = '/share nobody'
    await submit.handleSubmit()
    expect(cardTexts(ctx)).toEqual([
      'Usage: /share [role] — create a public link. Roles: viewer, commenter, editor, owner (default viewer).',
    ])
  })

  it('opens the skills overlay seeded with the query', async () => {
    const { ctx, submit } = mountSlices({})
    ctx.composer.inputRef.current = '/skills testing'
    await submit.handleSubmit()
    expect(ctx.overlay.panelOverlay).toBe('skills')
    expect(ctx.overlay.panelOverlayQuery).toBe('testing')
    expect(ctx.composer.inputRef.current).toBe('')
  })
})

describe('ChatPanel chat:queued-edit slice', () => {
  it('opens the editor and moves focus into its textarea', async () => {
    const { queuedEdit } = mountSlices({})
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    queuedEdit.queuedEditRef.current = textarea

    queuedEdit.setEditingQueuedId('q1')
    await flush()
    expect(textarea).toBe(document.activeElement)

    queuedEdit.setEditingQueuedText('A rewrite')
    expect(queuedEdit.editingQueuedText).toBe('A rewrite')
    queuedEdit.setEditingQueuedText((previous) => `${previous} and more`)
    expect(queuedEdit.editingQueuedText).toBe('A rewrite and more')

    queuedEdit.setEditingQueuedId(null)
    expect(queuedEdit.editingQueuedId).toBeNull()
  })
})

describe('ChatPanel chat:auto-send slice', () => {
  it('auto-sends the initial message once and reports it sent', async () => {
    const onInitialMessageSent = vi.fn()
    const { sends, setProps } = mountSlices({
      autoSend: true,
      props: { initialMessage: 'Build the header', onInitialMessageSent },
    })
    await flush()
    expect(sends.map((send) => send.message)).toEqual(['Build the header'])
    expect(onInitialMessageSent).toHaveBeenCalledTimes(1)

    // A later props change never re-sends it.
    setProps({ gitStatusTick: 1 })
    await flush()
    expect(sends).toHaveLength(1)
    expect(onInitialMessageSent).toHaveBeenCalledTimes(1)
  })

  it('never auto-sends the initial message for a viewer', async () => {
    const onInitialMessageSent = vi.fn()
    const { sends } = mountSlices({
      autoSend: true,
      props: { initialMessage: 'Build the header', onInitialMessageSent, canEdit: false },
    })
    await flush()
    expect(sends).toEqual([])
    expect(onInitialMessageSent).not.toHaveBeenCalled()
  })

  it('sends a pending message as automatic when its key changes', async () => {
    const { sends, setProps } = mountSlices({ autoSend: true, props: { pendingMessageKey: 0 } })
    await flush()
    expect(sends).toEqual([])

    setProps({
      pendingMessageKey: 1,
      pendingMessage: 'Investigate the broken preview',
      pendingMessageSuppressUser: false,
      pendingMessageUserInitiated: true,
    })
    await flush()
    expect(sends).toHaveLength(1)
    expect(sends[0]?.message).toBe('Investigate the broken preview')
    expect(sends[0]?.config).toMatchObject({ automatic: true, userInitiated: true })
  })

  it('defers a pending message while a turn streams, then sends it when the turn ends', async () => {
    const chat = chatRecorder(true)
    const { ctx, setProps } = mountSlices({
      autoSend: true,
      chat,
      props: { pendingMessageKey: 0 },
    })
    await flush()

    // Open a turn: its reply is held open, so the session is loading.
    void ctx.chat.sendMessage('Start the build')
    await flush()
    await flush()
    expect(chat.sends).toHaveLength(1)
    expect(ctx.chat.isLoading).toBe(true)

    setProps({
      pendingMessageKey: 1,
      pendingMessage: 'The preview crashed on load',
      pendingMessageSuppressUser: true,
    })
    await flush()
    // Deferred: no second send while the turn streams.
    expect(chat.sends).toHaveLength(1)
    expect(ctx.autoFix.deferredPendingRef.current).toBe('The preview crashed on load')

    chat.finishStream()
    await flush()
    await flush()
    expect(chat.sends).toHaveLength(2)
    expect(chat.sends[1]?.message).toBe('The preview crashed on load')
    expect(chat.sends[1]?.config).toMatchObject({ automatic: true, suppressUserMessage: true })
    expect(ctx.autoFix.deferredPendingRef.current).toBeNull()
  })

  it('never sends a pending message for a viewer and consumes its key', async () => {
    const { sends, setProps } = mountSlices({
      autoSend: true,
      props: { pendingMessageKey: 0, canEdit: false },
    })
    await flush()
    setProps({ pendingMessageKey: 1, pendingMessage: 'Build the header' })
    await flush()
    expect(sends).toEqual([])
  })

  it('drops a queued auto-fix message when the user edits a relevant file', async () => {
    const chat = chatRecorder(true)
    const { ctx, setProps } = mountSlices({ autoSend: true, chat, props: { userEditedFileKey: 0 } })
    await flush()

    // A turn is running, so a new send queues durably with the provider.
    void ctx.chat.sendMessage('Start the build')
    await flush()
    await flush()
    void ctx.chat.sendMessage('Fix these issues:\n\nsrc/app.ts(1,1): error')
    await flush()
    await flush()
    expect(chat.queues).toHaveLength(1)
    const queuedId = chat.queues[0]?.messageId
    expect(queuedId).toBeTruthy()
    expect(chat.deleted).toEqual([])

    setProps({ userEditedFileKey: 1, userEditedFile: 'src/app.ts' })
    await flush()
    await flush()
    expect(chat.deleted).toEqual([queuedId])

    // The same key again does nothing more.
    setProps({ userEditedFileKey: 1, userEditedFile: 'src/app.ts' })
    await flush()
    expect(chat.deleted).toEqual([queuedId])
  })
})
