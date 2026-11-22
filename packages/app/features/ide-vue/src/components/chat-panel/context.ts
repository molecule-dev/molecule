/**
 * The shared context of the Vue ChatPanel port.
 *
 * `ChatInner` builds ONE `ctx` in the order React declares its regions, and
 * every slice, section and effect reads it from there. Slices find each other
 * through the context AT CALL TIME — never capturing a sibling at creation —
 * because React's own regions are mutually recursive (`handleSubmit` re-enters
 * `executeCommand`; the stream drives auto-fix, auto-commit, sounds and
 * activity; the timeline reads the cards, tips and commits).
 *
 * This module is types only. The prop types are React's own contract (the same
 * names, the same defaults); the slice interfaces are defined by each slice
 * module, so a unit extending its slice's surface updates the context type
 * without touching this file.
 *
 * @module
 */

import type { ComputedRef, Ref, VNodeChild } from 'vue'

import type { ChatStreamEvent, ContextUsage } from '@molecule/app-ai-chat'
import type {
  Activity,
  ChatEventCardAction,
  ChatUserIdentity,
  IdeClientAction,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
} from '@molecule/app-ide-panel-logic'
import type { CommandDef } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import type { useHttpClient, UseTranslationResult } from '@molecule/app-vue'

import type { ChatItemErrorInfo } from '../../parts/ChatItemBoundary.js'
import type { ChatActivitySlice } from './use-chat-activity.js'
import type { ChatAttachmentsSlice } from './use-chat-attachments.js'
import type { ChatAutoCommitSlice } from './use-chat-auto-commit.js'
import type { ChatAutoFixSlice } from './use-chat-auto-fix.js'
import type { ChatAutoSendSlice } from './use-chat-auto-send.js'
import type { ChatChatSlice } from './use-chat-chat.js'
import type { ChatCommandsSlice } from './use-chat-commands.js'
import type { ChatComposerSlice } from './use-chat-composer.js'
import type { ChatContextUsageSlice } from './use-chat-context-usage.js'
import type { ChatEnvSlice } from './use-chat-env.js'
import type { ChatGitSlice } from './use-chat-git.js'
import type { ChatHeaderSlice } from './use-chat-header.js'
import type { ChatInputSlice } from './use-chat-input.js'
import type { ChatKeyboardSlice } from './use-chat-keyboard.js'
import type { ChatMentionSlice } from './use-chat-mention.js'
import type { ChatModelActionsSlice } from './use-chat-model-actions.js'
import type { ChatModelsSlice } from './use-chat-models.js'
import type { ChatOverlaySlice } from './use-chat-overlay.js'
import type { ChatPickersSlice } from './use-chat-pickers.js'
import type { ChatPopupsSlice } from './use-chat-popups.js'
import type { ChatPrefsSlice } from './use-chat-prefs.js'
import type { ChatQueuedEditSlice } from './use-chat-queued-edit.js'
import type { ChatRenderHandlersSlice } from './use-chat-render-handlers.js'
import type { ChatScriptsSlice } from './use-chat-scripts.js'
import type { ChatScrollSlice } from './use-chat-scroll.js'
import type { ChatSignalsSlice } from './use-chat-signals.js'
import type { ChatSkillsSlice } from './use-chat-skills.js'
import type { ChatSoundsSlice } from './use-chat-sounds.js'
import type { ChatStreamSlice } from './use-chat-stream.js'
import type { ChatSubmitSlice } from './use-chat-submit.js'
import type { ChatSystemCardsSlice } from './use-chat-system-cards.js'
import type { ChatTestsSlice } from './use-chat-tests.js'
import type { ChatTestsBarSlice } from './use-chat-tests-bar.js'
import type { ChatTimelineSlice } from './use-chat-timeline.js'
import type { ChatTipsSlice } from './use-chat-tips.js'
import type { ChatUndoSlice } from './use-chat-undo.js'
import type { ChatVoiceSlice } from './use-chat-voice.js'

/** The HTTP client `useHttpClient()` returns, named once for the slices. */
export type ChatHttpClient = ReturnType<typeof useHttpClient>

/**
 * React's `Dispatch<SetStateAction<T>>`, as a Vue slice exposes it: the state
 * itself is a `Ref`, and the setter accepts a value or an updater, exactly as
 * React's `setX` does, so a ported body keeps its `setX((prev) => …)` shape.
 */
export type SetState<T> = (value: T | ((previous: T) => T)) => void

/** React's `MutableRefObject<T>`, as a plain (non-reactive) object. */
export interface MutableRef<T> {
  /** The current value — written and read outside Vue's reactivity, as React's ref is. */
  current: T
}

/** One entry of a slice's effect ledger: registers its mount work / watchers. */
export type ChatEffect = () => void

/**
 * One send of a chat message — the panel's own wrapper around the session's
 * `sendMessage`, including the deferred and automatic paths.
 */
export type SendMessage = (
  message: string,
  attachments?: undefined,
  options?: { suppressUserMessage?: boolean; automatic?: boolean; askUserAnswer?: boolean },
) => void

/**
 * The loosely typed stream event React's `handleStreamEvent` receives: a `type`
 * plus whatever the server sent (usage, compaction, custom payloads).
 */
export interface ChatStreamEventLike {
  /** The event kind. */
  type: string
  /** Provider-reported context usage on `context_usage` / `done`. */
  usage?: Partial<ContextUsage>
  /** Every other field the server sent, read by kind. */
  [key: string]: unknown
}

/** Builds the host's upgrade / sign-in buttons for an upgrade nudge. */
export type UpgradeCtaBuilder = (context: {
  /** The backend's flag that the viewer must sign up rather than upgrade. */
  requiresSignup?: boolean
  /** The RULE the backend enforced. */
  limitType?: string
  /** The REMEDY the backend resolved. */
  billingAction?: string
  /** The plan an upgrade would move to (`null` when there is none). */
  upgradeTier?: string | null
}) => ChatEventCardAction | ChatEventCardAction[] | null | undefined

/** Builds the host's extra `/help` section (a plan / upgrade blurb). */
export type HelpUpgradeSectionBuilder = () =>
  { lines: string[]; action?: ChatEventCardAction | ChatEventCardAction[] } | null | undefined

/** Registers (and with `null` unregisters) the host's broadcast-chat handler. */
export type PushHandlerRegistrar = (
  handler: ((conversationId: string, event: ChatStreamEvent) => void) | null,
) => void

/** Registers (and with `null` unregisters) the host's history reconcile. */
export type HistoryReconcileRegistrar = (reconcile: (() => Promise<void>) | null) => void

/** Opens the host's custom-provider management surface from the `/model` picker. */
export type CustomModelsHandler = (context?: { mode?: 'plan' | 'execute' }) => void

/** Host-owned durable native test runs (render slots, as Vue nodes). */
export interface NativeTestsSlot {
  /** Whether the native status strip is shown. */
  visible: boolean
  /** The durable history rendered inside the tests browser. */
  history: VNodeChild
  /** Renders the host's own status strip; the argument opens the browser. */
  renderStatus: (openTests: () => void) => VNodeChild
}

/** Lists the project's tests for the `/test` browser. */
export type ListTestsHandler = () => Promise<TestList>

/** Runs a selection, streaming events back. */
export type RunTestsHandler = (
  selection: TestSelection,
  onEvent: (event: TestRunEvent) => void,
) => TestRunHandle

/** Subscribes to every test run in the project; returns the unsubscribe. */
export type WatchTestRunsHandler = (onEvent: (event: TestRunFeedEvent) => void) => () => void

/** Skips the executor's in-flight tool call (the host owns the request). */
export type SkipToolCallHandler = (toolCallId: string) => void | Promise<boolean | void>

/** Reports a timeline item that threw during render. */
export type RenderErrorHandler = (error: Error, info: ChatItemErrorInfo) => void

/** Props for the inner chat surface — React's `ChatInnerProps`, same names. */
export interface ChatInnerProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint (already carries `?conversationId=` when there is one). */
  endpoint: string
  /** A message to send once on mount (the landing page's prompt). */
  initialMessage?: string
  /** Called after the initial message was dispatched. */
  onInitialMessageSent?: () => void
  /** Whether the viewer is on a paid plan. */
  isPro?: boolean
  /** Whether the viewer is anonymous. */
  isAnonymous?: boolean
  /** Whether the viewer may write shared project state. */
  canEdit?: boolean
  /** Whether team-only side-channel messages are allowed. */
  canSendTeamMessages?: boolean
  /** Whether the viewer may manage public share links. */
  canShare?: boolean
  /** Whether the share dialog shows its links. */
  shareLinksAllowed?: boolean
  /** Bumped when another client changed the links; re-fetches them. */
  shareLinksRefreshSignal?: number
  /** Host sections rendered inside the share dialog. */
  shareModalContent?: VNodeChild
  /** Host-supplied upgrade / sign-in CTA builder. */
  buildUpgradeCta?: UpgradeCtaBuilder
  /** Host-supplied `/help` upgrade section builder. */
  buildHelpUpgradeSection?: HelpUpgradeSectionBuilder
  /** The focused editor file (shown first in the `@` picker). */
  activeFile?: string | null
  /** The open editor tabs (after the active file in the `@` picker). */
  openTabs?: string[]
  /** Opens a file as a preview tab. */
  onFileOpen?: (path: string, options?: { focus?: boolean }) => void
  /** Pins a file's tab. */
  onFileDoubleClick?: (path: string) => void
  /** Opens a changed file's diff. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Writes a file back (undo / redo). */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Reports that the agent created or modified a file. */
  onFileChange?: (path: string, content: string) => void
  /** Reports that a file was removed from disk. */
  onFileDeleted?: (path: string) => void
  /** Called after a commit attempt completes. */
  onCommit?: () => void
  /** Reports the active conversation id to the host. */
  onConversationId?: (id: string | null) => void
  /** Called when an inline activity card is clicked. */
  onActivityClick?: (activity: Activity) => void
  /** Reports a timeline item that threw during render. */
  onRenderError?: RenderErrorHandler
  /** Called when a timeline avatar or author name is clicked. */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id. */
  currentUserId?: string
  /** Called on `ready_to_build` — discovery is done; boot the sandbox. */
  onReadyToBuild?: () => void
  /** True after the plan streams but while the sandbox is still booting. */
  awaitingSandboxBoot?: boolean
  /** Called on `client_action` — the agent wants a preview reload/navigate or a file opened. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream done/error. */
  onTurnComplete?: () => void
  /** Reports the chat's loading state to the host. */
  onLoadingChange?: (loading: boolean) => void
  /** Navigates the preview to a route on a chat link click. */
  onNavigatePreview?: (path: string) => void
  /** Registers the host's broadcast-chat handler. */
  onRegisterPushHandler?: PushHandlerRegistrar
  /** Registers the host's history reconcile. */
  onRegisterHistoryReconcile?: HistoryReconcileRegistrar
  /** Changing this submits the current input draft. */
  autoSubmitSignal?: number
  /** Changing this opens the `/settings` view. */
  openSettingsSignal?: number
  /** Shows a "manage your own models" row in the `/model` picker. */
  onManageCustomModels?: CustomModelsHandler
  /** Bump to re-read persisted model / settings state. */
  modelSelectionSignal?: number
  /** Changing this opens the `/report` modal. */
  openReportSignal?: number
  /** Changing this opens the `/share` modal. */
  openShareSignal?: number
  /** Seeds the input with this text on mount. */
  initialInputValue?: string
  /** A message to send when `pendingMessageKey` changes. */
  pendingMessage?: string
  /** Incremented to send `pendingMessage`. */
  pendingMessageKey?: number
  /** Suppresses the user bubble for the pending message. */
  pendingMessageSuppressUser?: boolean
  /** Marks the pending message as user-initiated (it bypasses a prior Stop). */
  pendingMessageUserInitiated?: boolean
  /** The file the user just edited in the editor. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number
  /** Incremented by the host to refresh git status. */
  gitStatusTick?: number
  /** True during the initial discovery phase. */
  discovery?: boolean
  /** The signed-in user's avatar. */
  userAvatar?: string | null
  /** The agent's display name. */
  agentName?: string
  /** The host product's display name. */
  productName?: string
  /** The host's build version. */
  version?: string
  /** Host-specific slash commands merged into the menu. */
  extraCommands?: readonly CommandDef[]
  /** The command-menu "Report a problem" URL. */
  feedbackUrl?: string
  /** Lists the project's tests. */
  listTests?: ListTestsHandler
  /** Runs the selected tests. */
  runTests?: RunTestsHandler
  /** Subscribes to every test run. */
  watchTestRuns?: WatchTestRunsHandler
  /** Host-owned durable native runs. */
  nativeTests?: NativeTestsSlot
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean
  /** Skips the executor's in-flight tool call. */
  skipToolCall?: SkipToolCallHandler
}

/** The context every inner slice and section reads. */
export interface ChatCtx {
  /** The panel's props, reactive (Vue resolves React's destructuring defaults). */
  readonly props: ChatInnerProps
  /** `chat:env` — translation, ClassMap, HTTP, theme, viewport, the conversation id. */
  readonly env: ChatEnvSlice
  /** `chat:stream` — the stream event handler and its refs. */
  stream: ChatStreamSlice
  /** `chat:context-usage` — the ring's stored usage and compactions. */
  contextUsage: ChatContextUsageSlice
  /** `chat:auto-fix` — the verification auto-fix countdown and deferred messages. */
  autoFix: ChatAutoFixSlice
  /** `chat:auto-commit` — the auto-commit reducer and its persistence. */
  autoCommit: ChatAutoCommitSlice
  /** `chat:chat` — the `useChat` session controls and their panel-level wrappers. */
  chat: ChatChatSlice
  /** `chat:git` — commit state, the commit cards and the git actions. */
  git: ChatGitSlice
  /** `chat:scroll` — the messages container refs and the visible-item window. */
  scroll: ChatScrollSlice
  /** `chat:undo` — which tool calls are undone. */
  undo: ChatUndoSlice
  /** `chat:composer` — the uncontrolled textarea, the draft and the picker state. */
  composer: ChatComposerSlice
  /** `chat:popups` — every popup's state and the system cards. */
  popups: ChatPopupsSlice
  /** `chat:sounds` — the notification-sound preference. */
  sounds: ChatSoundsSlice
  /** `chat:overlay` — the `/skills`, `/scripts`, `/settings` and `/test` overlays. */
  overlay: ChatOverlaySlice
  /** `chat:voice` — dictation and the microphone picker. */
  voice: ChatVoiceSlice
  /** `chat:system-cards` — the inline system-card publisher. */
  systemCards: ChatSystemCardsSlice
  /** `chat:activity` — the inline activity cards. */
  activity: ChatActivitySlice
  /** `chat:tips` — the onboarding / idle tip cards. */
  tips: ChatTipsSlice
  /** `chat:prefs` — per-device preferences (timestamps, tests bar). */
  prefs: ChatPrefsSlice
  /** `chat:tests` — the tests-run controller and its browser. */
  tests: ChatTestsSlice
  /** `chat:skills` — discovered skills, the default set and the suggestion. */
  skills: ChatSkillsSlice
  /** `chat:models` — the persisted model / settings state. */
  models: ChatModelsSlice
  /** `chat:queued-edit` — the inline editor over a queued message. */
  queuedEdit: ChatQueuedEditSlice
  /** `chat:auto-send` — the initial, pending and deferred messages. */
  autoSend: ChatAutoSendSlice
  /** `chat:tests-bar` — the tests-bar visibility preference. */
  testsBar: ChatTestsBarSlice
  /** `chat:mention` — the `@` file picker. */
  mention: ChatMentionSlice
  /** `chat:attachments` — attachments, drag and drop, paste. */
  attachments: ChatAttachmentsSlice
  /** `chat:scripts` — running a saved script. */
  scripts: ChatScriptsSlice
  /** `chat:input` — the textarea's input handling. */
  input: ChatInputSlice
  /** `chat:model-actions` — selecting a model, its region and its effort. */
  modelActions: ChatModelActionsSlice
  /** `chat:commands` — the merged command list and the dispatcher. */
  commands: ChatCommandsSlice
  /** `chat:submit` — sending the composer's content. */
  submit: ChatSubmitSlice
  /** `chat:signals` — the host's external signals. */
  signals: ChatSignalsSlice
  /** `chat:pickers` — the model / effort / sounds picker derivations. */
  pickers: ChatPickersSlice
  /** `chat:keyboard` — the composer's native keydown handler. */
  keyboard: ChatKeyboardSlice
  /** `chat:timeline` — the timeline derivations. */
  timeline: ChatTimelineSlice
  /** `chat:render-handlers` — the stable handlers the rendered lists attach. */
  renderHandlers: ChatRenderHandlersSlice
}

/**
 * The outer panel's environment: the services the header reads, plus the
 * endpoint and the share capability the header and the modals share.
 */
export interface ChatPanelEnv {
  /** The translation function (re-renders on a locale switch). */
  readonly t: UseTranslationResult['t']
  /** The active ClassMap. */
  readonly cm: UIClassMap
  /** The HTTP client, for the conversation list. */
  readonly http: ChatHttpClient
  /** Whether the viewport is phone-width. */
  readonly isNarrow: Ref<boolean>
  /** Whether the pointer is coarse (touch). */
  readonly isCoarse: Ref<boolean>
  /** Whether the viewer may manage share links. */
  readonly shareAllowed: ComputedRef<boolean>
  /** The endpoint before the conversation id is appended. */
  readonly baseEndpoint: ComputedRef<string>
}

/** The context the outer panel's sections read. */
export interface ChatPanelCtx {
  /** The panel's props, reactive. */
  readonly props: ChatPanelProps
  /** The outer panel's services. */
  readonly env: ChatPanelEnv
  /** The header's own state and actions. */
  header: ChatHeaderSlice
}

/** Props for the outer {@link ChatPanel} export — React's `ChatPanelProps`, same names. */
export interface ChatPanelProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint; defaults to `/projects/:id/chat`. */
  endpoint?: string
  /** A message to auto-send once on mount. */
  initialMessage?: string
  /** Called after the initial message was dispatched. */
  onInitialMessageSent?: () => void
  /** Opens a file as a preview tab (`focus: false` opens it quietly). */
  onFileOpen?: (path: string, options?: { focus?: boolean }) => void
  /** Pins a file's tab. */
  onFileDoubleClick?: (path: string) => void
  /** Opens a changed file's diff. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Writes a file back. */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Reports that the agent created or modified a file. */
  onFileChange?: (path: string, content: string) => void
  /** Reports that a file was removed. */
  onFileDeleted?: (path: string) => void
  /** Called after a commit attempt completes. */
  onCommit?: () => void
  /** Called when an inline activity card is clicked. */
  onActivityClick?: (activity: Activity) => void
  /** Reports a timeline item that threw during render. */
  onRenderError?: RenderErrorHandler
  /** Called when a timeline avatar or author name is clicked. */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id. */
  currentUserId?: string
  /** Called on `ready_to_build`. */
  onReadyToBuild?: () => void
  /** True after the plan streams but while the sandbox is still booting. */
  awaitingSandboxBoot?: boolean
  /** Called on `client_action`. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream done. */
  onTurnComplete?: () => void
  /** Reports the chat's loading state. */
  onLoadingChange?: (loading: boolean) => void
  /** Navigates the preview to a route on a chat link click. */
  onNavigatePreview?: (path: string) => void
  /** Registers the host's broadcast-chat handler. */
  onRegisterPushHandler?: PushHandlerRegistrar
  /** Registers the host's history reconcile. */
  onRegisterHistoryReconcile?: HistoryReconcileRegistrar
  /** Changing this submits the current input draft. */
  autoSubmitSignal?: number
  /** Seeds the input with this text on mount. */
  initialInputValue?: string
  /** Hide the conversation-selector header. */
  hideConversationMenu?: boolean
  /** Whether to render the built-in conversation header (default `true`). */
  renderConversationHeader?: boolean
  /** Host-controlled active conversation id (headless mode). */
  conversationId?: string | null
  /** Host-controlled remount key for the inner chat (headless mode). */
  chatKey?: string
  /** Called whenever the active conversation id changes. */
  onConversationId?: (id: string | null) => void
  /** Changing this opens the in-chat `/share` modal. */
  openShareSignal?: number
  /** Changing this opens the in-chat `/report` modal. */
  openReportSignal?: number
  /** Changing this opens the in-chat `/settings` view. */
  openSettingsSignal?: number
  /** Shows a "manage your own models" row in the `/model` picker. */
  onManageCustomModels?: CustomModelsHandler
  /** Bump to re-read persisted model / settings state. */
  modelSelectionSignal?: number
  /** Whether the viewer may write shared project state (default `true`). */
  canEdit?: boolean
  /** Whether team messages are allowed (default `true`). */
  canSendTeamMessages?: boolean
  /** Whether the viewer may manage share links (defaults to `canEdit !== false`). */
  canShare?: boolean
  /** Whether the share dialog shows its links (defaults to `canShare`). */
  shareLinksAllowed?: boolean
  /** Changing this re-fetches the share dialog's links. */
  shareLinksRefreshSignal?: number
  /** Host sections rendered inside the share dialog. */
  shareModalContent?: VNodeChild
  /** Spinner / busy indicator for in-chat loading states. */
  spinner?: VNodeChild
  /** The focused editor file. */
  activeFile?: string | null
  /** The open editor tabs. */
  openTabs?: string[]
  /** Incremented to trigger a git status refresh. */
  gitStatusTick?: number
  /** A message to auto-send when `pendingMessageKey` changes. */
  pendingMessage?: string
  /** Incremented to send `pendingMessage`. */
  pendingMessageKey?: number
  /** Suppresses the user bubble for the pending message. */
  pendingMessageSuppressUser?: boolean
  /** Marks the pending message as user-initiated. */
  pendingMessageUserInitiated?: boolean
  /** The file the user just edited. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number
  /** Whether the viewer is anonymous. */
  isAnonymous?: boolean
  /** Whether the viewer is on a paid plan. */
  isPro?: boolean
  /** Retained for call-site compatibility; no built-in behavior reads it. */
  suppressGuestReminder?: boolean
  /** Host-supplied upgrade / sign-in CTA builder. */
  buildUpgradeCta?: UpgradeCtaBuilder
  /** Host-supplied `/help` upgrade section builder. */
  buildHelpUpgradeSection?: HelpUpgradeSectionBuilder
  /** The signed-in user's avatar. */
  userAvatar?: string | null
  /** The agent's display name. */
  agentName?: string
  /** The host product's display name. */
  productName?: string
  /** The host's build version. */
  version?: string
  /** Host-specific slash commands merged into the menu. */
  extraCommands?: readonly CommandDef[]
  /** The command-menu "Report a problem" URL. */
  feedbackUrl?: string
  /** Lists the project's tests. */
  listTests?: ListTestsHandler
  /** Runs the selected tests. */
  runTests?: RunTestsHandler
  /** Subscribes to every test run. */
  watchTestRuns?: WatchTestRunsHandler
  /** Host-owned durable native runs. */
  nativeTests?: NativeTestsSlot
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean
  /** Skips the executor's in-flight tool call. */
  skipToolCall?: SkipToolCallHandler
  /** Extra classes appended to the panel's root. */
  className?: string
}
