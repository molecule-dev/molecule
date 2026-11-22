/**
 * The ChatPanel port's shared state: the props every slice reads, the env the
 * `chat:env` slice resolves once per mount, and the slice lookup that keeps
 * slices from capturing each other at construction.
 *
 * Pieces cycle in React's `ChatInner` (the composer feeds voice, mention,
 * commands and submit; `handleStreamEvent` drives auto-fix, auto-commit, sounds
 * and activity; the timeline reads system cards, tips, activity, commits and
 * timestamps). A slice therefore looks another up through {@link
 * ChatInnerState.slice} at CALL time — see React's own consequence note — never
 * in its constructor. {@link ChatInnerState.env} is assigned by `ChatInner`
 * after both exist, so a later slice reads the same env object React's function
 * closed over.
 *
 * @module
 */

import type { Signal, TemplateRef, Type } from '@angular/core'
import { effect, inject, Injectable, Injector, runInInjectionContext, signal } from '@angular/core'

import type { ChatStreamEvent } from '@molecule/app-ai-chat'
import type { useHttpClient } from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import type {
  Activity,
  ChatEventCardAction,
  ChatUserIdentity,
  CommandDef,
  IdeClientAction,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
} from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'

/**
 * The HTTP client the panel makes its requests with — the type
 * `useHttpClient()` returns, so this file needs no separate `app-http` import.
 */
export type ChatHttpClient = ReturnType<typeof useHttpClient>

/**
 * React's narrower `sendMessage` (the panel's own committed sender): the same
 * call as the session's, with the panel's own option flags. Auto-fix and the
 * submit path hold it in a ref, so they share this one declaration.
 */
export type ChatSendMessage = (
  message: string,
  attachments?: undefined,
  options?: { suppressUserMessage?: boolean; automatic?: boolean; askUserAnswer?: boolean },
) => void

/**
 * What React's `ErrorInfo` carries at the one place the panel reads it: the
 * error boundary's component stack, forwarded to `onRenderError`.
 */
export interface ChatRenderErrorInfo {
  /** React's component stack for the item that threw (absent when unknown). */
  componentStack?: string | null
}

/**
 * The host's own durable test history surface (React's `nativeTests` prop, with
 * Angular templates in place of React nodes).
 */
export interface ChatNativeTests {
  /** Whether the status strip renders at all (the host's own visibility). */
  visible: boolean
  /**
   * The host's durable test history, rendered above the browser's list: a
   * template (`{ $nodes }` in the conformance kit) or an Angular component
   * class (what an Angular host passes).
   */
  history: TemplateRef<unknown> | Type<unknown>
  /**
   * The host's own status strip; the panel supplies its browser opener as the
   * template's `a0` / `$implicit` (or a component's `open` input).
   */
  renderStatus: TemplateRef<{ $implicit: () => void; a0: () => void }> | Type<unknown>
}

/**
 * React's `ChatInnerProps`: the inner chat surface's inputs, in React's prop
 * names and order. Nodes are `TemplateRef`s; everything else keeps React's
 * shape.
 */
export interface ChatInnerProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint (it carries `?conversationId=` when a conversation is open). */
  endpoint: string
  /** Auto-send this message once on mount (e.g. a prompt from the landing page). */
  initialMessage?: string
  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void
  /** Whether the user has a paid plan (drives locked-model display). */
  isPro?: boolean
  /** Whether the viewer is anonymous (drops a stale signup limit). */
  isAnonymous?: boolean
  /** Whether the user may write shared project state. */
  canEdit?: boolean
  /** Whether team messages are allowed. */
  canSendTeamMessages?: boolean
  /** Whether the user may manage public share links. */
  canShare?: boolean
  /** Whether the share dialog shows its links. */
  shareLinksAllowed?: boolean
  /** Re-fetches the share dialog's links. */
  shareLinksRefreshSignal?: number
  /** Host sections inside the share dialog. */
  shareModalContent?: TemplateRef<unknown>
  /** Host-supplied upgrade/sign-in CTA builder. */
  buildUpgradeCta?: (context: {
    requiresSignup?: boolean
    limitType?: string
    billingAction?: string
    upgradeTier?: string | null
  }) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /** Host-supplied `/help` upgrade section builder. */
  buildHelpUpgradeSection?: () =>
    { lines: string[]; action?: ChatEventCardAction | ChatEventCardAction[] } | null | undefined
  /** Path of the currently focused file in the editor. */
  activeFile?: string | null
  /** Paths of all open editor tabs. */
  openTabs?: string[]
  /** Opens a file as a preview tab. */
  onFileOpen?: (path: string, opts?: { focus?: boolean }) => void
  /** Pins a tab when a filename in a tool call is double-clicked. */
  onFileDoubleClick?: (path: string) => void
  /** Opens a changed file's diff view. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Undoes or redoes a file change by writing the given content. */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Called when the AI creates or modifies a file. */
  onFileChange?: (path: string, content: string) => void
  /** Called when a file is removed from disk. */
  onFileDeleted?: (path: string) => void
  /** Called after a commit or no-op. */
  onCommit?: () => void
  /** Called whenever the active conversation id changes. */
  onConversationId?: (id: string) => void
  /** Called when an inline activity card is clicked. */
  onActivityClick?: (activity: Activity) => void
  /** Reports a timeline item that threw during render. */
  onRenderError?: (error: Error, info: ChatRenderErrorInfo) => void
  /** Called when a user avatar or author name in the timeline is clicked. */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id. */
  currentUserId?: string
  /** Called on the `ready_to_build` stream event. */
  onReadyToBuild?: () => void
  /** True after the plan streams while the sandbox is still booting. */
  awaitingSandboxBoot?: boolean
  /** Called on the `client_action` stream event. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream done/error. */
  onTurnComplete?: () => void
  /** Called when the chat's loading state changes. */
  onLoadingChange?: (loading: boolean) => void
  /** Navigates the preview to a route path on a chat link click. */
  onNavigatePreview?: (path: string) => void
  /** Registers the broadcast-chat-event handler with the host. */
  onRegisterPushHandler?: (
    handler: ((conversationId: string, event: ChatStreamEvent) => void) | null,
  ) => void
  /** Registers the history reconcile with the host. */
  onRegisterHistoryReconcile?: (reconcile: (() => Promise<void>) | null) => void
  /** Changing this value submits the current input draft. */
  autoSubmitSignal?: number
  /** Changing this value opens the `/settings` view. */
  openSettingsSignal?: number
  /** Shows a "manage your own models" row in the `/model` picker. */
  onManageCustomModels?: (context?: { mode?: 'plan' | 'execute' }) => void
  /** Bump to re-read persisted model/settings. */
  modelSelectionSignal?: number
  /** Changing this value opens the `/report` bug-report modal. */
  openReportSignal?: number
  /** Changing this value opens the `/share` link modal. */
  openShareSignal?: number
  /** Seeds the input with this text on mount. */
  initialInputValue?: string
  /** Message to auto-send when `pendingMessageKey` changes. */
  pendingMessage?: string
  /** Incremented to trigger sending `pendingMessage`. */
  pendingMessageKey?: number
  /** Sends the pending message on the user's behalf without a user bubble. */
  pendingMessageSuppressUser?: boolean
  /** Marks the pending message as directly user-requested. */
  pendingMessageUserInitiated?: boolean
  /** File path the user just edited in the editor. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number
  /** Incremented to trigger a git status refresh. */
  gitStatusTick?: number
  /** True during the initial discovery phase. */
  discovery?: boolean
  /** The signed-in user's profile avatar. */
  userAvatar?: string | null
  /** Display name of the AI coding agent. */
  agentName?: string
  /** Display name of the host product / IDE. */
  productName?: string
  /** The host's current app/build version. */
  version?: string
  /** Host-specific slash commands merged into the menu. */
  extraCommands?: readonly CommandDef[]
  /** Command-menu "Report a problem" URL. */
  feedbackUrl?: string
  /** Lists the project's tests for the Tests bar. */
  listTests?: () => Promise<TestList>
  /** Runs the selected tests, streaming events. */
  runTests?: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /** Subscribes to every test run in the project. */
  watchTestRuns?: (onEvent: (event: TestRunFeedEvent) => void) => () => void
  /** Host-owned durable native runs in the Tests browser and composer strip. */
  nativeTests?: ChatNativeTests
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean
  /** Skips the executor's running tool call without ending the turn. */
  skipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
}

/**
 * React's `chat:env` values: the services and derivations every slice reads.
 * They are signals where React re-renders, so a locale, theme or viewport
 * change reaches every consumer without re-mounting the panel.
 */
export interface ChatEnvValues {
  /** The translation function (React's `useTranslation().t`). */
  readonly t: I18nProvider['t']
  /** The active locale code. */
  readonly locale: Signal<string>
  /** The bonded ClassMap (styling tokens resolve at render time). */
  readonly cm: UIClassMap
  /** The bond's HTTP client. */
  readonly http: ChatHttpClient
  /** The current theme mode. */
  readonly themeMode: Signal<'light' | 'dark'>
  /** Whether the theme is light (React's `themeMode === 'light'`). */
  readonly isLight: Signal<boolean>
  /** Whether the viewport is phone-width. */
  readonly isNarrow: Signal<boolean>
  /** Whether the primary pointer is coarse. */
  readonly isCoarse: Signal<boolean>
  /** The one cap every popup anchored above the composer uses. */
  readonly popupMaxHeight: Signal<string>
  /** Whether the endpoint already carries a conversation id. */
  readonly hasConversation: Signal<boolean>
  /** The endpoint's conversation id, or null. */
  readonly conversationId: Signal<string | null>
  /** The conversation id the (memoized) pushed-event handler reads. */
  readonly conversationIdRef: { current: string | null }
  /** A public transcript view: neither editing nor team messaging is allowed. */
  readonly transcriptOnly: Signal<boolean>
  /** Whether the share surfaces are available to this viewer. */
  readonly shareAllowed: Signal<boolean>
}

/**
 * A slice's effect entry points, keyed by React's `#effect chat:<slice>:<n>`
 * number. A slice with scattered regions exposes these and `ChatInner` calls
 * them where React declares them, which is how the ordered effect ledger
 * survives the split into files.
 */
export type ChatSliceEffects = Partial<Readonly<Record<number, () => void>>>

/**
 * The ChatPanel port's shared state, provided by `ChatInner` and injected by
 * every slice and section it renders.
 */
@Injectable()
export class ChatInnerState {
  /** The component's current inputs; `ChatInner` refreshes it on every change. */
  readonly props = signal<ChatInnerProps>({ projectId: '', endpoint: '' })

  /**
   * The resolved env. Assigned by `ChatInner` in its constructor, before any
   * slice's `mount()` or effect runs, so every consumer sees the same object.
   */
  env!: ChatEnvValues

  /** Resolves slice tokens from the host component's element injector. */
  private readonly injector = inject(Injector)

  /**
   * Looks a slice up at call time — never capture another slice in a
   * constructor, because React's concerns form cycles (see the module note).
   *
   * @param token - The slice's injectable class.
   * @returns The slice instance provided by `ChatInner`.
   */
  slice<T>(token: Type<T>): T {
    return this.injector.get(token)
  }
}

/** How many registered chat effects are currently on the stack. */
let chatEffectDepth = 0

/**
 * Whether the caller is running inside one of the panel's registered effects —
 * React's passive-effect flush. A store notification received there is a state
 * update React applies in the NEXT render (after every effect of this flush has
 * run), so the session binding defers it to a microtask to keep that order.
 *
 * @returns True while a `registerChatEffect` body is executing.
 */
export function isInsideChatEffect(): boolean {
  return chatEffectDepth > 0
}

/**
 * Registers one of React's effects at the position its `#effect` marker gives
 * it. The first run is skipped, the way the skeleton defers mount I/O to
 * `ChatInner`'s `ngAfterViewInit` (which Angular runs child-before-parent);
 * `run` receives `true` on that first run so it can read the signals it
 * depends on (which keeps them tracked) before returning without the update.
 *
 * A slice calls this from its `effects.<n>()`, which `ChatInner` invokes in
 * ledger order inside the component's injection context.
 *
 * @param injector - The slice's injector (the `ChatInner` element injector).
 * @param run - The update body; its signal reads are tracked even when skipped.
 */
export function registerChatEffect(injector: Injector, run: (skip: boolean) => void): void {
  let first = true
  runInInjectionContext(injector, () => {
    effect(() => {
      const skip = first
      first = false
      chatEffectDepth++
      try {
        run(skip)
      } finally {
        chatEffectDepth--
      }
    })
  })
}
