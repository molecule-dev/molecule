// @vitest-environment jsdom
/**
 * The `chat:commands` and `chat:scripts` slices: the merged slash-command
 * registry, the one command dispatcher every command surface calls, and the
 * `/run <name>` action.
 *
 * Every case drives the slice directly, so it asserts React's exact state
 * changes, requests and cards without depending on the units that still stub
 * the keyboard dispatch and the submit path.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { APP_VERSION } from '@molecule/app-ide-panel-logic'
import { resetChatStoresForTests } from '@molecule/app-svelte'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { createChatActivity } from '../components/chat-panel/chat-activity.svelte.js'
import { createChatAttachments } from '../components/chat-panel/chat-attachments.svelte.js'
import { createChatAutoCommit } from '../components/chat-panel/chat-auto-commit.svelte.js'
import { createChatAutoFix } from '../components/chat-panel/chat-auto-fix.svelte.js'
import { createChatAutoSend } from '../components/chat-panel/chat-auto-send.svelte.js'
import { createChatChat } from '../components/chat-panel/chat-chat.svelte.js'
import {
  type ChatCommandsSlice,
  createChatCommands,
} from '../components/chat-panel/chat-commands.svelte.js'
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
import { createChatQueuedEdit } from '../components/chat-panel/chat-queued-edit.svelte.js'
import {
  type ChatScriptsSlice,
  createChatScripts,
} from '../components/chat-panel/chat-scripts.svelte.js'
import { createChatScroll } from '../components/chat-panel/chat-scroll.svelte.js'
import { createChatSkills } from '../components/chat-panel/chat-skills.svelte.js'
import { createChatSounds } from '../components/chat-panel/chat-sounds.svelte.js'
import { createChatStream } from '../components/chat-panel/chat-stream.svelte.js'
import { createChatSystemCards } from '../components/chat-panel/chat-system-cards.svelte.js'
import { createChatTests } from '../components/chat-panel/chat-tests.svelte.js'
import { createChatTestsBar } from '../components/chat-panel/chat-tests-bar.svelte.js'
import { createChatTips } from '../components/chat-panel/chat-tips.svelte.js'
import { createChatUndo } from '../components/chat-panel/chat-undo.svelte.js'
import { createChatVoice } from '../components/chat-panel/chat-voice.svelte.js'
import type { ChatContext, ChatInnerProps } from '../components/chat-panel/context.svelte.js'
import {
  buildChatProvider,
  buildRejectingHttpClient,
  makeStorage,
  responseOf,
} from './chat-panel-harness.js'
import SliceHarness from './ChatSliceHarness.svelte'
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

/** One scripted answer. */
interface Reply {
  /** The response body. */
  data: unknown
  /** The HTTP status (`>= 400` rejects the request). */
  status?: number
}

/** What a test keeps from the mounted slices. */
interface Mounted {
  /** The shared context. */
  ctx: ChatContext
  /** The commands slice under test. */
  commands: ChatCommandsSlice
  /** The scripts slice under test. */
  scripts: ChatScriptsSlice
  /** Every request made, in order. */
  requests: RecordedRequest[]
  /** Tears the mount down. */
  unmount: () => void
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

/** The mounts alive right now. */
const mounts: Mounted[] = []

/**
 * Mounts the commands and scripts slices over the shared context, with every
 * slice they read created by its own factory.
 *
 * @param options - The scripted replies and the props that differ from the defaults.
 * @returns The mounted slices.
 */
function mountSlices(options: {
  replies?: Record<string, Reply>
  props?: Partial<ChatInnerProps>
}): Mounted {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const requests: RecordedRequest[] = []
  const props: ChatInnerProps = {
    projectId: PROJECT_ID,
    endpoint: `/projects/${PROJECT_ID}/chat`,
    ...options.props,
  }
  let ctx!: ChatContext
  const instance = mount(SliceHarness, {
    target: container,
    props: {
      http: scriptedHttp(requests, options.replies ?? {}),
      chat: buildChatProvider([]),
      theme: buildThemeProvider(),
      props,
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
        context.autoSend = createChatAutoSend(context)
        context.testsBar = createChatTestsBar(context)
        context.mention = createChatMention(context)
        context.attachments = createChatAttachments(context)
        context.scripts = createChatScripts(context)
        context.input = createChatInput(context)
        context.modelActions = createChatModelActions(context)
        context.commands = createChatCommands(context)
        ctx = context
      },
    },
  })
  flushSync()
  const mounted: Mounted = {
    ctx,
    commands: ctx.commands,
    scripts: ctx.scripts,
    requests,
    unmount: () => {
      void unmount(instance)
      document.body.innerHTML = ''
    },
  }
  mounts.push(mounted)
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
  for (const mounted of mounts.splice(0)) mounted.unmount()
  setProvider(createSimpleI18nProvider())
})

describe('ChatPanel chat:commands slice', () => {
  it('lists the shared registry plus the host commands, host winning by id', () => {
    const { commands } = mountSlices({
      props: {
        extraCommands: [
          { id: 'deploy', label: '/deploy', description: 'Ship it', category: 'collaborate' },
          { id: 'clear', label: '/clear-all', description: 'Wipe', category: 'context' },
        ],
      },
    })
    const ids = commands.allCommands.map((command) => command.id)
    expect(ids.filter((id) => id === 'clear')).toHaveLength(1)
    const clear = commands.allCommands.find((command) => command.id === 'clear')
    expect(clear?.label).toBe('/clear-all')
    expect(ids).toContain('deploy')
    // The shared row the host overrides is dropped, so the host row sits last.
    expect(ids.at(-1)).toBe('clear')
  })

  it('hides side-channel commands when team messaging is off', () => {
    const teamCommand = {
      id: 'teamsay',
      label: '/teamsay',
      description: 'Post a team note',
      category: 'collaborate' as const,
      sideChannel: true,
    }
    const shown = mountSlices({ props: { extraCommands: [teamCommand] } })
    expect(shown.commands.allCommands.map((command) => command.id)).toContain('teamsay')

    const hidden = mountSlices({
      props: { extraCommands: [teamCommand], canSendTeamMessages: false },
    })
    expect(hidden.commands.allCommands.map((command) => command.id)).not.toContain('teamsay')
  })

  it('closes every sibling popup before running a command', async () => {
    const { ctx, commands } = mountSlices({})
    ctx.composer.setCommandMenu({ selectedIdx: -1, text: '/' })
    ctx.composer.setModelPicker({ selectedIdx: -1, text: '/model', mode: 'execute' })
    ctx.composer.setEffortPicker({ selectedIdx: -1, text: '/effort', mode: 'execute' })
    ctx.sounds.setSoundsPicker({ selectedIdx: 0 })
    ctx.voice.setMicPicker({ autoStart: true })
    ctx.overlay.setPanelOverlay('skills')

    await commands.executeCommand('version')

    expect(ctx.composer.commandMenu).toBeNull()
    expect(ctx.composer.modelPicker).toBeNull()
    expect(ctx.composer.effortPicker).toBeNull()
    expect(ctx.sounds.soundsPicker).toBeNull()
    expect(ctx.voice.micPicker).toBeNull()
    expect(ctx.overlay.panelOverlay).toBeNull()
  })

  it('prefills a host command for the host’s own handler', async () => {
    const { ctx, commands } = mountSlices({
      props: {
        extraCommands: [
          { id: 'deploy', label: '/deploy', description: 'Ship it', category: 'collaborate' },
        ],
      },
    })
    await commands.executeCommand('deploy')
    expect(ctx.composer.inputRef.current).toBe('/deploy ')
    expect(cardTexts(ctx)).toEqual([])
  })

  it('refuses a write command for a viewer with the read-only note', async () => {
    const { ctx, commands, requests } = mountSlices({ props: { canEdit: false } })
    await commands.executeCommand('autofix')
    expect(cardTexts(ctx)).toEqual([
      'You have view-only access, so this command is unavailable. Ask an editor to make changes.',
    ])
    expect(requests).toEqual([])
  })

  it('lets a viewer run a viewer-safe command', async () => {
    const { ctx, commands } = mountSlices({ props: { canEdit: false } })
    await commands.executeCommand('help')
    const cards = ctx.popups.systemCards
    expect(cards).toHaveLength(1)
    expect(cards[0].variant).toBe('help')
  })

  it('toggles auto-fix and persists it', async () => {
    const { ctx, commands, requests } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: { settings: {} } } },
    })
    expect(ctx.models.autoFixEnabled).toBe(true)
    await commands.executeCommand('autofix')
    expect(requests).toEqual([
      { method: 'PATCH', url: '/projects/p1', body: { settings: { autoFix: false } } },
    ])
    expect(ctx.models.autoFixEnabled).toBe(false)
    expect(cardTexts(ctx)).toEqual(['Auto-fix disabled.'])
  })

  it('turns auto-fix back on when the project had it off', async () => {
    const { ctx, commands, requests } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: { settings: {} } } },
    })
    ctx.models.setAutoFixEnabled(false)
    await commands.executeCommand('autofix')
    expect(requests[0]).toEqual({
      method: 'PATCH',
      url: '/projects/p1',
      body: { settings: { autoFix: true } },
    })
    expect(cardTexts(ctx)).toEqual(['Auto-fix enabled.'])
  })

  it('reports a refused auto-fix toggle and leaves the setting on', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: {}, status: 500 } },
    })
    await commands.executeCommand('autofix')
    expect(ctx.models.autoFixEnabled).toBe(true)
    expect(cardTexts(ctx)).toEqual(['Failed to update auto-fix setting.'])
  })

  it('toggles auto-approve and persists it', async () => {
    const { ctx, commands, requests } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: { settings: {} } } },
    })
    await commands.executeCommand('autoapprove')
    expect(requests[0]).toEqual({
      method: 'PATCH',
      url: '/projects/p1',
      body: { settings: { autoApproveCommands: true } },
    })
    expect(ctx.models.autoApproveCommandsEnabled).toBe(true)
    expect(cardTexts(ctx)[0]).toContain('Auto-approve on')
  })

  it('reports a refused auto-approve toggle and leaves it off', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'PATCH /projects/p1': { data: {}, status: 500 } },
    })
    await commands.executeCommand('autoapprove')
    expect(ctx.models.autoApproveCommandsEnabled).toBe(false)
    expect(cardTexts(ctx)).toEqual(['Failed to update auto-approve setting.'])
  })

  it('prefills the argument-taking commands', async () => {
    const { ctx, commands } = mountSlices({})
    for (const [id, text] of [
      ['maxloops', '/maxloops '],
      ['explain', '/explain '],
      ['autocommit', '/autocommit '],
      ['run', '/run '],
    ] as const) {
      ctx.composer.setInputValue('stale')
      await commands.executeCommand(id)
      expect(ctx.composer.inputRef.current).toBe(text)
    }
  })

  it('opens the model picker on the live mode and prefills it', async () => {
    const { ctx, commands } = mountSlices({})
    await commands.executeCommand('model')
    expect(ctx.composer.inputRef.current).toBe('/model ')
    expect(ctx.composer.modelPicker).toEqual({
      selectedIdx: -1,
      mode: ctx.chat.liveModelMode,
      text: '/model ',
    })
  })

  it('opens the effort picker scoped to the live mode', async () => {
    const { ctx, commands } = mountSlices({})
    ctx.composer.setInputValue('stale')
    await commands.executeCommand('effort')
    expect(ctx.composer.inputRef.current).toBe('')
    expect(ctx.composer.effortPicker).toEqual({
      selectedIdx: -1,
      mode: ctx.chat.liveModelMode,
      text: '',
    })
  })

  it('clears the log, the ring and the composer for /clear', async () => {
    const { ctx, commands } = mountSlices({})
    ctx.composer.setInputValue('draft')
    ctx.git.setCommitCards([
      {
        id: 'c1',
        message: 'm',
        files: [],
        timestamp: 1,
        status: 'done',
        hash: 'abc',
      },
    ])
    ctx.popups.setSystemCards([{ id: 'a', text: 'old', timestamp: 1 }])
    ctx.contextUsage.setContextUsage({
      inputTokens: 5,
      contextWindow: 100,
      requestId: 'r1',
      at: '2023-11-14T22:13:21.000Z',
    })
    ctx.scroll.setMaxVisibleItems(10)

    await commands.executeCommand('clear')

    expect(ctx.composer.inputRef.current).toBe('')
    expect(ctx.git.commitCards).toEqual([])
    expect(ctx.popups.systemCards).toEqual([])
    expect(ctx.contextUsage.contextUsage).toBeNull()
    expect(ctx.scroll.maxVisibleItems).toBe(60)
  })

  it('opens the guide card for /help', async () => {
    const { ctx, commands } = mountSlices({})
    await commands.executeCommand('help')
    const [card] = ctx.popups.systemCards
    expect(card.variant).toBe('help')
    expect(card.text.length).toBeGreaterThan(0)
  })

  it('prints the host version for /version, falling back on an empty one', async () => {
    const withVersion = mountSlices({ props: { version: '2.7.9' } })
    await withVersion.commands.executeCommand('version')
    expect(cardTexts(withVersion.ctx)).toEqual(['the IDE v2.7.9'])

    const emptyVersion = mountSlices({ props: { version: '' } })
    await emptyVersion.commands.executeCommand('version')
    expect(cardTexts(emptyVersion.ctx)).toEqual([`the IDE v${APP_VERSION}`])
  })

  it('opens the settings, skills and scripts overlays', async () => {
    const { ctx, commands } = mountSlices({})
    await commands.executeCommand('settings')
    expect(ctx.overlay.panelOverlay).toBe('settings')
    await commands.executeCommand('skills')
    expect(ctx.overlay.panelOverlay).toBe('skills')
    await commands.executeCommand('scripts')
    expect(ctx.overlay.panelOverlay).toBe('scripts')
  })

  it('opens the bug-report modal through /report and its alias', async () => {
    const { ctx, commands } = mountSlices({})
    await commands.executeCommand('report')
    expect(ctx.popups.reportModal).toEqual({ title: '' })
    ctx.popups.setReportModal(null)
    await commands.executeCommand('bug')
    expect(ctx.popups.reportModal).toEqual({ title: '' })
  })

  it('opens the share modal only while the host allows sharing', async () => {
    const allowed = mountSlices({})
    await allowed.commands.executeCommand('share')
    expect(allowed.ctx.popups.shareModal).toEqual({ role: 'viewer' })

    const gated = mountSlices({ props: { canShare: false } })
    await gated.commands.executeCommand('share')
    expect(gated.ctx.popups.shareModal).toBeNull()
  })

  it('toggles the timestamps preference and announces it', async () => {
    const { ctx, commands } = mountSlices({})
    await commands.executeCommand('timestamps')
    expect(cardTexts(ctx)).toEqual(['Timestamps shown.'])
    expect(localStorage.getItem('mol_chat_show_timestamps')).toBe('true')
  })

  it('switches to plan mode and persists it', async () => {
    const { ctx, commands, requests } = mountSlices({
      replies: { 'PATCH /projects/p1/chat-mode': { data: {} } },
    })
    expect(ctx.chat.mode).toBe('execute')
    await commands.executeCommand('plan')
    expect(requests[0]).toEqual({
      method: 'PATCH',
      url: '/projects/p1/chat-mode',
      body: { mode: 'plan', conversationId: null },
    })
    expect(ctx.chat.mode).toBe('plan')
    expect(cardTexts(ctx)).toEqual(['Switched to plan mode'])
  })

  it('reverts the mode when persisting it is refused', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'PATCH /projects/p1/chat-mode': { data: {}, status: 500 } },
    })
    await commands.executeCommand('plan')
    await new Promise((resolve) => setTimeout(resolve, 0))
    flushSync()
    expect(ctx.chat.mode).toBe('execute')
  })

  it('summarizes the live usage for /cost', async () => {
    const { ctx, commands, requests } = mountSlices({
      replies: {
        'GET /projects/p1/chat-usage': {
          data: {
            model: 'deepseek-v4',
            inputTokens: 1500,
            outputTokens: 1200,
            cacheReadInputTokens: 0,
          },
        },
      },
    })
    await commands.executeCommand('cost')
    expect(requests).toEqual([{ method: 'GET', url: '/projects/p1/chat-usage', body: undefined }])
    expect(cardTexts(ctx)).toEqual(['Model: deepseek-v4\nInput: 1.5K tokens\nOutput: 1.2K tokens'])
  })

  it('reports a failed usage read for /cost', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'GET /projects/p1/chat-usage': { data: {}, status: 500 } },
    })
    await commands.executeCommand('cost')
    expect(cardTexts(ctx)).toEqual(['Unable to fetch usage data.'])
  })

  it('compacts the conversation and reports the count', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'POST /projects/p1/compact': { data: { compactedCount: 3 } } },
    })
    await commands.executeCommand('compact')
    expect(cardTexts(ctx)).toEqual(['Compacting conversation...', 'Compacted 3 messages.'])
  })

  it('says no compaction was needed at zero', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'POST /projects/p1/compact': { data: { compactedCount: 0 } } },
    })
    await commands.executeCommand('compact')
    expect(cardTexts(ctx)).toEqual([
      'Compacting conversation...',
      'Context usage is low — no compaction needed.',
    ])
  })

  it('reports a failed compaction', async () => {
    const { ctx, commands } = mountSlices({
      replies: { 'POST /projects/p1/compact': { data: {}, status: 500 } },
    })
    await commands.executeCommand('compact')
    expect(cardTexts(ctx)).toEqual([
      'Compacting conversation...',
      'Failed to compact conversation.',
    ])
  })

  it('says there is nothing to undo when no change is pending', async () => {
    const { ctx, commands } = mountSlices({})
    await commands.executeCommand('undo')
    expect(cardTexts(ctx)).toEqual(['No file changes to undo.'])
  })
})

describe('ChatPanel chat:scripts slice', () => {
  /** One saved script with no options. */
  const SCRIPT = {
    name: 'test',
    description: 'Run the suite',
    createdAt: '2023-11-14T22:13:21.000Z',
  }

  it('resolves the script, runs it and reports the output with the exit status', async () => {
    const { ctx, scripts, requests } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': { data: { scripts: [SCRIPT] } },
        'POST /projects/p1/scripts/test/run': {
          data: { stdout: 'ok\n', stderr: '', exitCode: 0 },
        },
      },
    })
    await scripts.runSavedScript('test')
    expect(requests).toEqual([
      { method: 'GET', url: '/projects/p1/scripts', body: undefined },
      { method: 'POST', url: '/projects/p1/scripts/test/run', body: undefined },
    ])
    expect(cardTexts(ctx)).toEqual(['test exited 0\nok'])
  })

  it('reports a failing exit code with the script name', async () => {
    const { ctx, scripts } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': { data: { scripts: [SCRIPT] } },
        'POST /projects/p1/scripts/test/run': {
          data: { stdout: '', stderr: 'boom', exitCode: 2 },
        },
      },
    })
    await scripts.runSavedScript('test')
    expect(cardTexts(ctx)).toEqual(['test exited with code 2\nboom'])
  })

  it('reports just the exit status when the run printed nothing', async () => {
    const { ctx, scripts } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': { data: { scripts: [SCRIPT] } },
        'POST /projects/p1/scripts/test/run': {
          data: { stdout: '', stderr: '', exitCode: 0 },
        },
      },
    })
    await scripts.runSavedScript('test')
    expect(cardTexts(ctx)).toEqual(['test exited 0'])
  })

  it('passes the typed flags as run options', async () => {
    const { scripts, requests } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': { data: { scripts: [SCRIPT] } },
        'POST /projects/p1/scripts/test/run': {
          data: { stdout: '', stderr: '', exitCode: 0 },
        },
      },
    })
    await scripts.runSavedScript('test', { target: 'unit' })
    expect(requests[1]).toEqual({
      method: 'POST',
      url: '/projects/p1/scripts/test/run',
      body: { params: { target: 'unit' } },
    })
  })

  it('matches a partial name and a name with other casing or a .sh suffix', async () => {
    for (const typed of ['tes', 'TEST.sh']) {
      const { scripts, requests } = mountSlices({
        replies: {
          'GET /projects/p1/scripts': { data: { scripts: [SCRIPT] } },
          'POST /projects/p1/scripts/test/run': {
            data: { stdout: '', stderr: '', exitCode: 0 },
          },
        },
      })
      await scripts.runSavedScript(typed)
      expect(requests[1]?.url).toBe('/projects/p1/scripts/test/run')
    }
  })

  it('reports an unknown name with the scripts that exist', async () => {
    const { ctx, scripts } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': {
          data: {
            scripts: [SCRIPT, { ...SCRIPT, name: 'lint', description: 'Lint' }],
          },
        },
      },
    })
    await scripts.runSavedScript('nope')
    expect(cardTexts(ctx)).toEqual(['No script named “nope”. Available: test, lint'])
  })

  it('points at /scripts when nothing is saved yet', async () => {
    const { ctx, scripts } = mountSlices({
      replies: { 'GET /projects/p1/scripts': { data: { scripts: [] } } },
    })
    await scripts.runSavedScript('nope')
    expect(cardTexts(ctx)).toEqual(['No saved scripts yet. Open /scripts to create one.'])
  })

  it('reads a listing without a scripts array as no scripts', async () => {
    const { ctx, scripts } = mountSlices({
      replies: { 'GET /projects/p1/scripts': { data: {} } },
    })
    await scripts.runSavedScript('nope')
    expect(cardTexts(ctx)).toEqual(['No saved scripts yet. Open /scripts to create one.'])
  })

  it('resolves a name several scripts share to nothing', async () => {
    const { ctx, scripts, requests } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': {
          data: {
            scripts: [
              { ...SCRIPT, name: 'test-unit' },
              { ...SCRIPT, name: 'test-e2e' },
            ],
          },
        },
      },
    })
    await scripts.runSavedScript('test')
    expect(cardTexts(ctx)).toEqual(['No script named “test”. Available: test-unit, test-e2e'])
    expect(requests).toHaveLength(1)
  })

  it('opens /scripts to collect a required option instead of failing the run', async () => {
    const { ctx, scripts, requests } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': {
          data: {
            scripts: [
              {
                ...SCRIPT,
                params: [{ name: 'target', required: true, description: 'What to test' }],
              },
            ],
          },
        },
      },
    })
    await scripts.runSavedScript('test')
    expect(ctx.overlay.panelOverlay).toBe('scripts')
    expect(ctx.overlay.panelOverlayQuery).toBe('test')
    expect(cardTexts(ctx)).toEqual([
      '“test” needs options — opened /scripts so you can set them and Run.',
    ])
    expect(requests).toHaveLength(1)
  })

  it('reports a failed listing as a failed run', async () => {
    const { ctx, scripts } = mountSlices({
      replies: { 'GET /projects/p1/scripts': { data: {}, status: 500 } },
    })
    await scripts.runSavedScript('test')
    expect(cardTexts(ctx)).toEqual(['Failed to run the script.'])
  })

  it('reports a failed run request', async () => {
    const { ctx, scripts } = mountSlices({
      replies: {
        'GET /projects/p1/scripts': { data: { scripts: [SCRIPT] } },
        'POST /projects/p1/scripts/test/run': { data: {}, status: 500 },
      },
    })
    await scripts.runSavedScript('test')
    expect(cardTexts(ctx)).toEqual(['Failed to run the script.'])
  })
})
