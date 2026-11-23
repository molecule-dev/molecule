// @vitest-environment jsdom
/**
 * The chat-panel sections render React's elements with no host or capture
 * element of their own.
 *
 * React renders each of these sections either as its own root element (the
 * `div[mol-chat-*]` host carrying React's classes and style) or as a fragment
 * (its children in the host's place). The Angular ports used to leave a
 * `data-parity-unwrap` / `display: contents` wrapper in the page for those
 * cases, which the conformance kit hid — so the real DOM had an extra element
 * that `> *`, `:first-child` and child counts could see. This mounts each one
 * between two consumer siblings, asserts the consumer's element children are
 * exactly React's, and toggles the component's presence once.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  type Provider,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideHttp, provideI18n, provideTheme } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ChatAttachmentChips } from '../components/chat-panel/chat-attachment-chips.component.js'
import { ChatAutoFixBanner } from '../components/chat-panel/chat-auto-fix-banner.component.js'
import { ChatCommandMenu } from '../components/chat-panel/chat-command-menu.component.js'
import { ChatDragOverlay } from '../components/chat-panel/chat-drag-overlay.component.js'
import { ChatEffortPicker } from '../components/chat-panel/chat-effort-picker.component.js'
import { ChatFilePicker } from '../components/chat-panel/chat-file-picker.component.js'
import { type ChatEnvValues, ChatInnerState } from '../components/chat-panel/chat-inner-state.js'
import { ChatMicPicker } from '../components/chat-panel/chat-mic-picker.component.js'
import { ChatModelPickerByo } from '../components/chat-panel/chat-model-picker-byo.component.js'
import { ChatQueuedMessagesSection } from '../components/chat-panel/chat-queued-messages-section.component.js'
import { ChatRetryBanner } from '../components/chat-panel/chat-retry-banner.component.js'
import { ChatSoundsPicker } from '../components/chat-panel/chat-sounds-picker.component.js'
import { ChatTimelineItems } from '../components/chat-panel/chat-timeline-items.component.js'
import { buildRejectingHttpClient } from './chat-panel-harness.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** One mounted section between two siblings, with its live teardown. */
interface Mounted {
  /** The app's injector, for reading the shared state. */
  state: ChatInnerState
  /** The element the consumer host rendered into. */
  container: HTMLElement
  /** Runs one change-detection pass. */
  tick: () => void
  /** Tears the app down. */
  unmount: () => void
}

/** Reads the consumer host's element children (React's DOM, comments excluded). */
function elementChildren(element: Element): Element[] {
  return Array.from(element.childNodes).filter((node): node is Element => node.nodeType === 1)
}

/**
 * The env object `ChatInner` assigns before its sections render.
 * @param i18n - The translation provider.
 * @returns The resolved env values.
 */
function buildEnv(i18n: ReturnType<typeof createSimpleI18nProvider>): ChatEnvValues {
  return {
    t: i18n.t,
    locale: signal('en'),
    cm: getClassMap(),
    http: buildRejectingHttpClient(),
    themeMode: signal<'light' | 'dark'>('light'),
    isLight: signal(true),
    isNarrow: signal(false),
    isCoarse: signal(false),
    popupMaxHeight: signal('70vh'),
    hasConversation: signal(false),
    conversationId: signal(null),
    conversationIdRef: { current: null },
    transcriptOnly: signal(false),
    shareAllowed: signal(true),
  }
}

/**
 * Mounts `component` as a `<div attr>` child of a consumer between two `<i>`
 * siblings.
 *
 * @param component - The section to mount.
 * @param attr - The attribute selector on the consumer element (e.g. `mol-chat-drag-overlay`).
 * @param providers - The slice stubs the section reads.
 * @param tag - The consumer element's tag (the section's own selector tag).
 * @returns The mount.
 */
async function mountBetween(
  component: Type<unknown>,
  attr: string,
  providers: Provider[],
  tag = 'div',
): Promise<Mounted> {
  document.body.innerHTML = ''
  const i18n = createSimpleI18nProvider('en')
  setProvider(i18n)

  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-parity-between-host',
    standalone: true,
    imports: [component],
    template: `<i>a</i><${tag} ${attr}></${tag}><i>b</i>`,
  })(class ParityBetweenHost {})

  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideI18n(i18n),
      provideTheme(buildThemeProvider()),
      provideHttp(buildRejectingHttpClient()),
      ChatInnerState,
      ...providers,
    ],
  })
  const state = appRef.injector.get(ChatInnerState)
  state.env = buildEnv(i18n)
  state.props.set({ projectId: 'p1', endpoint: '/projects/p1/chat' })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const container = ref.location.nativeElement as HTMLElement
  document.body.appendChild(container)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    state,
    container,
    tick: () => ref.changeDetectorRef.detectChanges(),
    unmount: () => {
      appRef.destroy()
      document.body.innerHTML = ''
    },
  }
}

/** The mount alive right now, if any. */
let mounted: Mounted | null = null

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }) as never)
  Element.prototype.scrollIntoView = (): void => {}
})

afterEach(() => {
  mounted?.unmount()
  mounted = null
  document.body.innerHTML = ''
})

/**
 * Asserts the consumer's element children are exactly React's: the two `<i>`
 * markers with only React's root element(s) between them, and no
 * `data-parity-unwrap` wrapper anywhere.
 *
 * @param container - The consumer element.
 * @param between - React's root(s): always 0 (nothing) or more elements.
 */
function expectChildren(container: Element, between: number): void {
  const children = elementChildren(container)
  expect(children).toHaveLength(2 + between)
  expect(children[0]?.tagName).toBe('I')
  expect(children[children.length - 1]?.tagName).toBe('I')
  expect(container.querySelector('[data-parity-unwrap]')).toBeNull()
}

describe("chat-panel sections render React's elements with no host or capture element of their own", () => {
  it("ChatAttachmentChips renders React's elements with no host or capture element of its own", async () => {
    const files = signal([{ filename: 'a.txt', size: 12 }])
    mounted = await mountBetween(ChatAttachmentChips, 'mol-chat-attachment-chips', [
      {
        provide: (await import('../components/chat-panel/chat-popups.slice.js')).ChatPopups,
        useValue: { attachedFiles: files },
      },
      {
        provide: (await import('../components/chat-panel/chat-attachments.slice.js'))
          .ChatAttachments,
        useValue: { removeAttachment: (): void => {} },
      },
    ])
    // React renders the chip row (its root `<div>`) while a file is staged.
    expectChildren(mounted.container, 1)
    const row = elementChildren(mounted.container)[1]
    expect(row?.tagName).toBe('DIV')
    expect(row?.children).toHaveLength(1)
    expect(row?.getAttribute('style')).toContain('display: flex')

    // No files staged: React renders nothing, so there is no host at all.
    files.set([])
    mounted.tick()
    expectChildren(mounted.container, 0)
  })

  it("ChatAutoFixBanner renders React's elements with no host or capture element of its own", async () => {
    const countdown = signal<{ secondsLeft: number; paused: boolean } | null>(null)
    const { ChatAutoFix } = await import('../components/chat-panel/chat-auto-fix.slice.js')
    mounted = await mountBetween(ChatAutoFixBanner, 'mol-chat-auto-fix-banner', [
      {
        provide: ChatAutoFix,
        useValue: { autoFixCountdown: countdown, dispatchAutoFix: (): void => {} },
      },
    ])
    expectChildren(mounted.container, 0)
    countdown.set({ secondsLeft: 3, paused: false })
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatRetryBanner renders React's elements with no host or capture element of its own", async () => {
    const countdown = signal<{ secondsRemaining: number; attempt: number } | null>(null)
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    mounted = await mountBetween(ChatRetryBanner, 'mol-chat-retry-banner', [
      { provide: ChatChat, useValue: { retryCountdown: countdown, cancelRetry: (): void => {} } },
    ])
    expectChildren(mounted.container, 0)
    countdown.set({ secondsRemaining: 4, attempt: 2 })
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatDragOverlay renders React's elements with no host or capture element of its own", async () => {
    const drag = signal(false)
    const { ChatAttachments } = await import('../components/chat-panel/chat-attachments.slice.js')
    mounted = await mountBetween(ChatDragOverlay, 'mol-chat-drag-overlay', [
      { provide: ChatAttachments, useValue: { isDragOver: drag } },
    ])
    expectChildren(mounted.container, 0)
    drag.set(true)
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatEffortPicker renders React's elements with no host or capture element of its own", async () => {
    const picker = signal<{ mode: 'execute'; selectedIdx: number } | null>(null)
    const { ChatComposer } = await import('../components/chat-panel/chat-composer.slice.js')
    const { ChatPickers } = await import('../components/chat-panel/chat-pickers.slice.js')
    const { ChatModelActions } =
      await import('../components/chat-panel/chat-model-actions.slice.js')
    mounted = await mountBetween(ChatEffortPicker, 'mol-chat-effort-picker', [
      {
        provide: ChatComposer,
        useValue: { effortPicker: picker, setEffortPicker: (): void => {} },
      },
      {
        provide: ChatPickers,
        useValue: {
          effortPickerModeOptions: (): unknown[] => [],
          effortPickerOptions: (): unknown[] => [],
          effortPickerVisible: (): unknown[] => [],
          effortPickerCurrent: (): null => null,
          effortPickerModel: (): null => null,
        },
      },
      { provide: ChatModelActions, useValue: { applyEffortLevel: async (): Promise<void> => {} } },
    ])
    expectChildren(mounted.container, 0)
    picker.set({ mode: 'execute', selectedIdx: -1 })
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatFilePicker renders React's elements with no host or capture element of its own", async () => {
    const filePicker = signal<{ selectedIdx: number } | null>(null)
    const entries = signal<{ name: string }[]>([])
    const { ChatPopups } = await import('../components/chat-panel/chat-popups.slice.js')
    const { ChatPickers } = await import('../components/chat-panel/chat-pickers.slice.js')
    const { ChatMention } = await import('../components/chat-panel/chat-mention.slice.js')
    mounted = await mountBetween(ChatFilePicker, 'mol-chat-file-picker', [
      { provide: ChatPopups, useValue: { filePicker } },
      { provide: ChatPickers, useValue: { filteredEntries: entries } },
      { provide: ChatMention, useValue: { selectFileEntry: (): void => {} } },
    ])
    expectChildren(mounted.container, 0)
    filePicker.set({ selectedIdx: 0 })
    entries.set([{ name: 'src/a.ts' }])
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatMicPicker renders React's elements with no host or capture element of its own", async () => {
    const picker = signal<{ autoStart: boolean } | null>(null)
    const engines = signal([
      {
        id: 'e1',
        label: 'Engine',
        kind: 'native',
        accuracy: 3,
        languages: 'all',
        downloadMB: undefined,
      },
    ])
    const { ChatVoice } = await import('../components/chat-panel/chat-voice.slice.js')
    mounted = await mountBetween(ChatMicPicker, 'mol-chat-mic-picker', [
      {
        provide: ChatVoice,
        useValue: {
          micPicker: picker,
          voiceEngines: engines,
          currentVoiceEngineId: (): null => null,
          voiceEngineDisabledReason: (): null => null,
          chooseVoiceEngine: (): void => {},
        },
      },
    ])
    expectChildren(mounted.container, 0)
    picker.set({ autoStart: false })
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatModelPickerByo renders React's elements with no host or capture element of its own", async () => {
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatComposer } = await import('../components/chat-panel/chat-composer.slice.js')
    const { ChatPickers } = await import('../components/chat-panel/chat-pickers.slice.js')
    mounted = await mountBetween(
      ChatModelPickerByo,
      'mol-chat-model-picker-byo',
      [
        { provide: ChatChat, useValue: { liveModelMode: (): 'execute' => 'execute' } },
        {
          provide: ChatComposer,
          useValue: {
            modelPicker: (): null => null,
            setModelPicker: (): void => {},
            setInputValue: (): void => {},
          },
        },
        { provide: ChatPickers, useValue: { visibleModels: (): unknown[] => [] } },
      ],
      'button',
    )
    expectChildren(mounted.container, 0)
    // The host hands the seam over: React renders its one `<button>`.
    mounted.state.props.set({
      projectId: 'p1',
      endpoint: '/projects/p1/chat',
      onManageCustomModels: (): void => {},
    })
    mounted.tick()
    expectChildren(mounted.container, 1)
    expect(elementChildren(mounted.container)[1]?.tagName).toBe('BUTTON')
  })

  it("ChatSoundsPicker renders React's elements with no host or capture element of its own", async () => {
    const picker = signal<{ selectedIdx: number } | null>(null)
    const { ChatSounds } = await import('../components/chat-panel/chat-sounds.slice.js')
    mounted = await mountBetween(ChatSoundsPicker, 'mol-chat-sounds-picker', [
      {
        provide: ChatSounds,
        useValue: {
          soundsPicker: picker,
          soundsConfig: (): Record<string, string> => ({
            complete: 'always',
            error: 'always',
            ask: 'always',
            notification: 'always',
          }),
          setSoundsPicker: (): void => {},
          cycleSoundMode: async (): Promise<void> => {},
        },
      },
    ])
    expectChildren(mounted.container, 0)
    picker.set({ selectedIdx: 0 })
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatCommandMenu renders React's elements with no host or capture element of its own", async () => {
    const menu = signal<{ selectedIdx: number } | null>(null)
    const commands = signal([
      { id: 'custom', label: '/custom', category: 'context', description: 'Custom command' },
    ])
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatComposer } = await import('../components/chat-panel/chat-composer.slice.js')
    const { ChatModels } = await import('../components/chat-panel/chat-models.slice.js')
    const { ChatPickers } = await import('../components/chat-panel/chat-pickers.slice.js')
    const { ChatRenderHandlers } =
      await import('../components/chat-panel/chat-render-handlers.slice.js')
    const { ChatSounds } = await import('../components/chat-panel/chat-sounds.slice.js')
    mounted = await mountBetween(ChatCommandMenu, 'mol-chat-command-menu', [
      { provide: ChatChat, useValue: { mode: (): 'execute' => 'execute' } },
      { provide: ChatComposer, useValue: { commandMenu: menu } },
      { provide: ChatPickers, useValue: { filteredCmds: commands } },
      {
        provide: ChatModels,
        useValue: {
          effectiveModelForMode: (): string => 'm1',
          FREE_TIER_MODEL: (): string => 'm1',
          AVAILABLE_MODELS: (): unknown[] => [],
          currentMaxLoops: (): number => 5,
          autoFixEnabled: (): boolean => true,
        },
      },
      {
        provide: ChatSounds,
        useValue: {
          soundsConfig: (): Record<string, string> => ({
            complete: 'always',
            error: 'always',
            ask: 'always',
            notification: 'always',
          }),
        },
      },
      {
        provide: ChatRenderHandlers,
        useValue: { stableExecuteCommand: async (): Promise<void> => {} },
      },
    ])
    expectChildren(mounted.container, 0)
    menu.set({ selectedIdx: 0 })
    mounted.tick()
    expectChildren(mounted.container, 1)
    expect(elementChildren(mounted.container)[1]?.getAttribute('class')).toBeTruthy()
  })

  it("ChatQueuedMessagesSection renders React's elements with no host or capture element of its own", async () => {
    const queued = signal<{ id: string; content: string }[]>([])
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatComposer } = await import('../components/chat-panel/chat-composer.slice.js')
    const { ChatOverlay } = await import('../components/chat-panel/chat-overlay.slice.js')
    const { ChatQueuedEdit } = await import('../components/chat-panel/chat-queued-edit.slice.js')
    const { ChatTimeline } = await import('../components/chat-panel/chat-timeline.slice.js')
    mounted = await mountBetween(ChatQueuedMessagesSection, 'mol-chat-queued-messages-section', [
      { provide: ChatTimeline, useValue: { queuedMessages: queued } },
      {
        provide: ChatChat,
        useValue: {
          isLoading: (): boolean => false,
          deleteQueuedMessage: (): void => {},
          sendMessage: (): void => {},
        },
      },
      {
        provide: ChatComposer,
        useValue: {
          commandMenu: (): null => null,
          modelPicker: (): null => null,
          effortPicker: (): null => null,
        },
      },
      { provide: ChatOverlay, useValue: { panelOverlay: (): null => null } },
      {
        provide: ChatQueuedEdit,
        useValue: {
          editingQueuedId: (): null => null,
          editingQueuedText: (): string => '',
          queuedEditRef: { current: null },
          setEditingQueuedId: (): void => {},
          setEditingQueuedText: (): void => {},
        },
      },
    ])
    expectChildren(mounted.container, 0)
    queued.set([{ id: 'q1', content: 'hello' }])
    mounted.tick()
    expectChildren(mounted.container, 1)
  })

  it("ChatTimelineItems renders React's elements with no host or capture element of its own", async () => {
    const error = signal<string | null>(null)
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatComposer } = await import('../components/chat-panel/chat-composer.slice.js')
    const { ChatGit } = await import('../components/chat-panel/chat-git.slice.js')
    const { ChatInput } = await import('../components/chat-panel/chat-input.slice.js')
    const { ChatOverlay } = await import('../components/chat-panel/chat-overlay.slice.js')
    const { ChatTests } = await import('../components/chat-panel/chat-tests.slice.js')
    const { ChatTimeline } = await import('../components/chat-panel/chat-timeline.slice.js')
    const { ChatTips } = await import('../components/chat-panel/chat-tips.slice.js')
    const { ChatUndo } = await import('../components/chat-panel/chat-undo.slice.js')
    mounted = await mountBetween(ChatTimelineItems, 'mol-chat-timeline-items', [
      {
        provide: ChatTimeline,
        useValue: {
          renderedTimeline: (): unknown[] => [],
          shownTimestampIds: (): Set<string> => new Set(),
          withTimelineTimestamp: (): null => null,
          staleAnonymousLimit: (): boolean => false,
          isViewerAccessDenied: (): boolean => false,
          viewerDeniedFlash: (): boolean => false,
        },
      },
      {
        provide: ChatChat,
        useValue: {
          error,
          errorMeta: (): null => null,
          isLoading: (): boolean => false,
          streamingStatus: (): null => null,
          liveModelMode: (): 'execute' => 'execute',
          sendMessage: (): void => {},
          handleAskUserResponse: (): void => {},
        },
      },
      { provide: ChatTips, useValue: { dismissTip: (): void => {} } },
      {
        provide: ChatGit,
        useValue: {
          handleRevertCommit: async (): Promise<undefined> => undefined,
          handleFileRevert: async (): Promise<void> => {},
        },
      },
      { provide: ChatOverlay, useValue: { openPanelOverlay: (): void => {} } },
      {
        provide: ChatUndo,
        useValue: { undoneTcIds: (): Set<string> => new Set(), handleUndoToggle: (): void => {} },
      },
      { provide: ChatInput, useValue: { setInputAndCursorEnd: (): void => {} } },
      { provide: ChatComposer, useValue: { setModelPicker: (): void => {} } },
      { provide: ChatTests, useValue: { handleSkipToolCall: async (): Promise<boolean> => true } },
    ])
    // Nothing to show: React renders nothing (the host is a fragment).
    expectChildren(mounted.container, 0)
    // The plain error line is one of React's siblings: it lands in the host's
    // place, with no wrapper element around it.
    error.set('Something went wrong')
    mounted.tick()
    expectChildren(mounted.container, 1)
    expect(elementChildren(mounted.container)[1]?.textContent).toContain('Something went wrong')
  })

  it("ChatReportModal renders React's elements with no host or capture element of its own", async () => {
    const { ChatPopups } = await import('../components/chat-panel/chat-popups.slice.js')
    const { ChatRenderHandlers } =
      await import('../components/chat-panel/chat-render-handlers.slice.js')
    const { ChatSystemCards } = await import('../components/chat-panel/chat-system-cards.slice.js')
    const { ChatReportModal } =
      await import('../components/chat-panel/chat-report-modal.component.js')
    mounted = await mountBetween(ChatReportModal, 'mol-chat-report-modal', [
      ChatPopups,
      ChatRenderHandlers,
      ChatSystemCards,
    ])
    // Closed: the fragment renders nothing and leaves no wrapper element.
    expect(mounted.container.querySelector('[mol-chat-report-modal]')).toBeNull()
    expect(mounted.container.querySelector('[data-parity-unwrap]')).toBeNull()
    expectChildren(mounted.container, 0)

    // Open: React's one modal lands in the host's place; still no wrapper.
    mounted.state.slice(ChatPopups).setReportModal({ title: 'Seeded bug' })
    mounted.tick()
    expect(mounted.container.querySelector('[mol-chat-report-modal]')).toBeNull()
    expect(mounted.container.querySelector('[data-parity-unwrap]')).toBeNull()
    const elements = elementChildren(mounted.container)
    expect(elements[0]?.tagName).toBe('I')
    expect(elements[elements.length - 1]?.tagName).toBe('I')
  })

  it("ChatShareModal renders React's elements with no host or capture element of its own", async () => {
    const { ChatPopups } = await import('../components/chat-panel/chat-popups.slice.js')
    const { ChatRenderHandlers } =
      await import('../components/chat-panel/chat-render-handlers.slice.js')
    const { ChatSystemCards } = await import('../components/chat-panel/chat-system-cards.slice.js')
    const { ChatShareModal } =
      await import('../components/chat-panel/chat-share-modal.component.js')
    mounted = await mountBetween(ChatShareModal, 'mol-chat-share-modal', [
      ChatPopups,
      ChatRenderHandlers,
      ChatSystemCards,
    ])
    expect(mounted.container.querySelector('[mol-chat-share-modal]')).toBeNull()
    expect(mounted.container.querySelector('[data-parity-unwrap]')).toBeNull()
    expectChildren(mounted.container, 0)

    mounted.state.slice(ChatPopups).setShareModal({ role: 'viewer' })
    mounted.tick()
    expect(mounted.container.querySelector('[mol-chat-share-modal]')).toBeNull()
    expect(mounted.container.querySelector('[data-parity-unwrap]')).toBeNull()
    const elements = elementChildren(mounted.container)
    expect(elements[0]?.tagName).toBe('I')
    expect(elements[elements.length - 1]?.tagName).toBe('I')
  })

  it("ChatTestsStrip renders React's elements with no host or capture element of its own", async () => {
    const workVisible = signal(false)
    const { ChatAutoCommit } = await import('../components/chat-panel/chat-auto-commit.slice.js')
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatGit } = await import('../components/chat-panel/chat-git.slice.js')
    const { ChatTests } = await import('../components/chat-panel/chat-tests.slice.js')
    const { ChatTimeline } = await import('../components/chat-panel/chat-timeline.slice.js')
    const { ChatTestsStrip } =
      await import('../components/chat-panel/chat-tests-strip.component.js')
    mounted = await mountBetween(ChatTestsStrip, 'mol-chat-tests-strip', [
      {
        provide: ChatTimeline,
        useValue: {
          workVisible,
          plan: (): unknown[] => [],
          planLive: (): boolean => false,
          planAwaiting: (): boolean => false,
          showTests: (): boolean => false,
          showFiles: (): boolean => false,
        },
      },
      { provide: ChatChat, useValue: { backgroundTasks: (): unknown[] => [] } },
      { provide: ChatGit, useValue: {} },
      { provide: ChatAutoCommit, useValue: {} },
      { provide: ChatTests, useValue: {} },
    ])
    // While React renders nothing, no host or wrapper is in the page.
    expect(mounted.container.querySelector('[mol-chat-tests-strip]')).toBeNull()
    expect(mounted.container.querySelector('[data-parity-unwrap]')).toBeNull()
    expectChildren(mounted.container, 0)

    // The work card renders directly in the host's place: no wrapper host.
    workVisible.set(true)
    mounted.tick()
    expect(mounted.container.querySelector('[mol-chat-tests-strip]')).toBeNull()
    expectChildren(mounted.container, 1)
    expect(elementChildren(mounted.container)[1]?.getAttribute('data-mol-id')).toBe('work-card')
  })

  it("ChatPanelOverlay renders React's elements with no host or capture element of its own", async () => {
    const overlay = signal<string | null>(null)
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatCommands } = await import('../components/chat-panel/chat-commands.slice.js')
    const { ChatInput } = await import('../components/chat-panel/chat-input.slice.js')
    const { ChatOverlay } = await import('../components/chat-panel/chat-overlay.slice.js')
    const { ChatSkills } = await import('../components/chat-panel/chat-skills.slice.js')
    const { ChatTests } = await import('../components/chat-panel/chat-tests.slice.js')
    const { ChatTimeline } = await import('../components/chat-panel/chat-timeline.slice.js')
    const { ChatPanelOverlay } =
      await import('../components/chat-panel/chat-panel-overlay.component.js')
    mounted = await mountBetween(ChatPanelOverlay, 'mol-chat-panel-overlay', [
      {
        provide: ChatOverlay,
        useValue: {
          panelOverlay: overlay,
          panelOverlayQuery: (): string => '',
          setPanelOverlay: (): void => {},
        },
      },
      { provide: ChatTimeline, useValue: { computeSettingsList: (): unknown[] => [] } },
      { provide: ChatSkills, useValue: {} },
      { provide: ChatTests, useValue: {} },
      { provide: ChatCommands, useValue: { executeCommand: async (): Promise<void> => {} } },
      { provide: ChatInput, useValue: { setInputAndCursorEnd: (): void => {} } },
      {
        provide: ChatChat,
        useValue: { isLoading: (): boolean => false, isRemoteStreaming: (): boolean => false },
      },
    ])
    expectChildren(mounted.container, 0)
    overlay.set('settings')
    mounted.tick()
    expectChildren(mounted.container, 1)
    expect(elementChildren(mounted.container)[1]?.getAttribute('role')).toBe('dialog')
  })

  it("ChatModelPicker renders React's elements with no host or capture element of its own", async () => {
    const picker = signal<{ mode: 'execute'; selectedIdx: number } | null>(null)
    const { ChatChat } = await import('../components/chat-panel/chat-chat.slice.js')
    const { ChatComposer } = await import('../components/chat-panel/chat-composer.slice.js')
    const { ChatModels } = await import('../components/chat-panel/chat-models.slice.js')
    const { ChatPickers } = await import('../components/chat-panel/chat-pickers.slice.js')
    const { ChatRenderHandlers } =
      await import('../components/chat-panel/chat-render-handlers.slice.js')
    const { ChatModelPicker } =
      await import('../components/chat-panel/chat-model-picker.component.js')
    mounted = await mountBetween(ChatModelPicker, 'mol-chat-model-picker', [
      {
        provide: ChatComposer,
        useValue: {
          modelPicker: picker,
          setModelPicker: (): void => {},
          setInputValue: (): void => {},
        },
      },
      { provide: ChatModels, useValue: { modelsLoading: (): boolean => true } },
      {
        provide: ChatPickers,
        useValue: {
          visibleModels: (): unknown[] => [],
          deprecatedModels: (): unknown[] => [],
          pickerModeOptions: (): unknown[] => [],
          modelSort: (): { column: string; direction: 'asc' | 'desc' } => ({
            column: 'name',
            direction: 'asc',
          }),
          setModelSort: (): void => {},
        },
      },
      { provide: ChatChat, useValue: { liveModelMode: (): 'execute' => 'execute' } },
      { provide: ChatRenderHandlers, useValue: {} },
    ])
    expectChildren(mounted.container, 0)
    picker.set({ mode: 'execute', selectedIdx: 0 })
    mounted.tick()
    expectChildren(mounted.container, 1)
  })
})
