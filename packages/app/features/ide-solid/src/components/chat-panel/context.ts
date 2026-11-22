/**
 * The shared state (`ctx`) of the Solid `ChatPanel` port: its types only.
 *
 * `ChatPanel` (the outer shell) owns its props and the shell services it
 * renders with; `ChatInner` owns one ctx — its props plus one namespace per
 * slice (`ctx.composer`, `ctx.popups`, …). Every slice file declares its own
 * `Chat<Slice>Slice` interface (the identifiers other code reads from it) and
 * a `createChat<Slice>(ctx)` factory; this module joins them into
 * {@link ChatInnerCtx} and declares the React prop contracts the port keeps.
 *
 * The ctx is filled in React's declaration order by `ChatInner` and is never
 * rebuilt: a slice looks other slices up through it at call time, so the
 * mutually-referencing slices (submit ↔ commands, stream ↔ auto-fix, …) never
 * capture a stale neighbour.
 *
 * @module
 */

import type { Accessor, JSX } from 'solid-js'

import type {
  ChatAttachment,
  ChatSendOptions,
  ChatSessionControls,
  ChatSessionState,
  ChatStreamEvent,
} from '@molecule/app-ai-chat'
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
import type { Logger } from '@molecule/app-logger'
import type { useHttpClient, useTranslation } from '@molecule/app-solid'
import type { getClassMap } from '@molecule/app-ui'

import type { ChatItemErrorInfo } from '../../parts/ChatItemBoundary.jsx'
import type { ChatActivitySlice } from './create-chat-activity.js'
import type { ChatAttachmentsSlice } from './create-chat-attachments.js'
import type { ChatAutoCommitSlice } from './create-chat-auto-commit.js'
import type { ChatAutoFixSlice } from './create-chat-auto-fix.js'
import type { ChatAutoSendSlice } from './create-chat-auto-send.js'
import type { ChatChatSlice } from './create-chat-chat.js'
import type { ChatCommandsSlice } from './create-chat-commands.js'
import type { ChatComposerSlice } from './create-chat-composer.js'
import type { ChatContextUsageSlice } from './create-chat-context-usage.js'
import type { ChatEnvSlice } from './create-chat-env.js'
import type { ChatGitSlice } from './create-chat-git.js'
import type { ChatInputSlice } from './create-chat-input.js'
import type { ChatKeyboardSlice } from './create-chat-keyboard.js'
import type { ChatMentionSlice } from './create-chat-mention.js'
import type { ChatModelActionsSlice } from './create-chat-model-actions.js'
import type { ChatModelsSlice } from './create-chat-models.js'
import type { ChatOverlaySlice } from './create-chat-overlay.js'
import type { ChatPickersSlice } from './create-chat-pickers.js'
import type { ChatPopupsSlice } from './create-chat-popups.js'
import type { ChatPrefsSlice } from './create-chat-prefs.js'
import type { ChatQueuedEditSlice } from './create-chat-queued-edit.js'
import type { ChatRenderHandlersSlice } from './create-chat-render-handlers.js'
import type { ChatScriptsSlice } from './create-chat-scripts.js'
import type { ChatScrollSlice } from './create-chat-scroll.js'
import type { ChatSignalsSlice } from './create-chat-signals.js'
import type { ChatSkillsSlice } from './create-chat-skills.js'
import type { ChatSoundsSlice } from './create-chat-sounds.js'
import type { ChatStreamSlice } from './create-chat-stream.js'
import type { ChatSubmitSlice } from './create-chat-submit.js'
import type { ChatSystemCardsSlice } from './create-chat-system-cards.js'
import type { ChatTestsSlice } from './create-chat-tests.js'
import type { ChatTestsBarSlice } from './create-chat-tests-bar.js'
import type { ChatTimelineSlice } from './create-chat-timeline.js'
import type { ChatTipsSlice } from './create-chat-tips.js'
import type { ChatUndoSlice } from './create-chat-undo.js'
import type { ChatVoiceSlice } from './create-chat-voice.js'

/** A model's processing region id (`'us'`, `'cn'`, …), as React's local alias. */
export type ModelRegion = string

/** The translation function `useTranslation()` returns. */
export type TranslateFunction = ReturnType<typeof useTranslation>['t']

/** The HTTP client `useHttpClient()` returns. */
export type HttpClient = ReturnType<typeof useHttpClient>

/** The class map `getClassMap()` returns. */
export type ClassMap = ReturnType<typeof getClassMap>

/**
 * A plain mutable holder, React's `useRef` shape: the port reads and writes
 * `.current` outside the reactive system (a ref never re-renders anything).
 */
export interface MutableRef<T> {
  /** The held value. */
  current: T
}

/** Each effect a slice registers, keyed by its `#effect chat:<slice>:<n>` position. */
export type SliceEffects = Readonly<Record<number, () => void>>

/** The chat session's state, as Solid accessors (the `useChat` binding's form). */
export type ChatSessionAccessors = {
  readonly [K in keyof ChatSessionState]: Accessor<ChatSessionState[K]>
}

/** The chat session's controls (`useChat`'s methods, unchanged). */
export type ChatSessionControlsApi = ChatSessionControls

/** A send through the shared chat session (`useChat`'s `sendMessage`). */
export type SendChatMessage = (
  message: string,
  attachments?: ChatAttachment[],
  options?: ChatSendOptions,
) => Promise<void>

/**
 * The outer panel's shared state: its React props and the shell services its
 * header renders with. The conversation list, selection and remount key are the
 * outer-panel unit's own state, added to this type when that unit lands.
 */
export interface ChatPanelCtx {
  /** The panel's React props, verbatim. */
  readonly props: ChatPanelProps
  /** The active translation function (re-translates on a locale switch). */
  readonly t: TranslateFunction
  /** The resolved class map. */
  readonly cm: ClassMap
  /** The HTTP client. */
  readonly http: HttpClient
  /** The panel's logger. */
  readonly logger: Logger
  /** The active theme mode. */
  readonly themeMode: Accessor<'light' | 'dark'>
  /** Whether the viewport is phone-width (< 768px). */
  readonly isNarrow: Accessor<boolean>
  /** Whether the primary pointer is coarse (touch). */
  readonly isCoarse: Accessor<boolean>
  /** Whether the viewer may manage public share links. */
  readonly shareAllowed: Accessor<boolean>
}

/**
 * Props for the outer `ChatPanel` — React's prop names and contracts,
 * unchanged (the conformance kit renders both from the same case props).
 */
export interface ChatPanelProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint; defaults to `/projects/:id/chat`. */
  endpoint?: string
  /** If provided, auto-send this message once on mount. */
  initialMessage?: string
  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void
  /** Called to open a file as a preview tab. */
  onFileOpen?: (path: string, opts?: { focus?: boolean }) => void
  /** Called when a filename in a tool call is double-clicked — should pin the tab. */
  onFileDoubleClick?: (path: string) => void
  /** Called when a file in the uncommitted list is clicked for diff view. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Called to undo/redo a file change — writes the given content to the file path. */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Called when the AI creates or modifies a file. */
  onFileChange?: (path: string, content: string) => void
  /** Called when a file is removed from disk. */
  onFileDeleted?: (path: string) => void
  /** Called after a commit or no-op. */
  onCommit?: () => void
  /** Called when an inline activity card is clicked. */
  onActivityClick?: (activity: Activity) => void
  /** Reports a chat timeline item that threw during render. */
  onRenderError?: (error: Error, info: ChatItemErrorInfo) => void
  /** Called when a user avatar or author name in the chat timeline is clicked. */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id (a message's persisted `author.id`). */
  currentUserId?: string
  /** Called when the server signals that discovery is complete. */
  onReadyToBuild?: () => void
  /** True while the plan has finished streaming but the sandbox is still booting. */
  awaitingSandboxBoot?: boolean
  /** Called when the agent requests a UI action via the `client_action` event. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream `done`. */
  onTurnComplete?: () => void
  /** Called whenever the chat's loading state changes. */
  onLoadingChange?: (loading: boolean) => void
  /** Navigates the live preview to a route path. */
  onNavigatePreview?: (path: string) => void
  /** Called on mount with a handler for broadcast chat events (null on unmount). */
  onRegisterPushHandler?: (
    handler: ((conversationId: string, event: ChatStreamEvent) => void) | null,
  ) => void
  /** Called on mount with a history reconcile function (null on unmount). */
  onRegisterHistoryReconcile?: (reconcile: (() => Promise<void>) | null) => void
  /** Changing this value submits the current input draft. */
  autoSubmitSignal?: number
  /** Seeds the input with this text on mount. */
  initialInputValue?: string
  /** Hide the conversation-selector header. */
  hideConversationMenu?: boolean
  /** Whether to render the built-in conversation header (defaults to true). */
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
  /** Shows an "add or manage your own models" row in the `/model` picker. */
  onManageCustomModels?: (context?: { mode?: 'plan' | 'execute' }) => void
  /** Bump to make the panel re-read its persisted model/settings state. */
  modelSelectionSignal?: number
  /** Whether the current user may write shared project state from the chat. */
  canEdit?: boolean
  /** Whether this viewer may send team-only side-channel messages. */
  canSendTeamMessages?: boolean
  /** Whether the current user may manage public share links. */
  canShare?: boolean
  /** Whether the share dialog shows its public-link section. */
  shareLinksAllowed?: boolean
  /** Changing this re-fetches the share dialog's link list. */
  shareLinksRefreshSignal?: number
  /** Host sections rendered inside the share dialog, below the links. */
  shareModalContent?: JSX.Element
  /** Spinner/busy indicator node for in-chat loading states. */
  spinner?: JSX.Element
  /** Path of the currently focused file in the editor. */
  activeFile?: string | null
  /** Paths of all open editor tabs. */
  openTabs?: string[]
  /** Incremented to trigger a git status refresh. */
  gitStatusTick?: number
  /** Message to auto-send when `pendingMessageKey` changes. */
  pendingMessage?: string
  /** Incremented to trigger sending `pendingMessage`. */
  pendingMessageKey?: number
  /** Send the pending message on the user's behalf, without a user bubble. */
  pendingMessageSuppressUser?: boolean
  /** The pending message was directly requested by the user. */
  pendingMessageUserInitiated?: boolean
  /** File path the user just edited in the editor. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number
  /** Whether the current user is anonymous. */
  isAnonymous?: boolean
  /** Whether the current user has a paid plan. */
  isPro?: boolean
  /**
   * Retained for call-site compatibility; it drives no built-in behaviour.
   * @deprecated Guest reminders moved to the host-emitted `custom` event.
   */
  suppressGuestReminder?: boolean
  /** Builds the upgrade/sign-in call-to-action button(s). */
  buildUpgradeCta?: (context: {
    requiresSignup?: boolean
    limitType?: string
    billingAction?: string
    upgradeTier?: string | null
  }) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /** Optional app-specific section appended to the `/help` output. */
  buildHelpUpgradeSection?: () =>
    { lines: string[]; action?: ChatEventCardAction | ChatEventCardAction[] } | null | undefined
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
  /** URL the command-menu "Report a problem" link points at. */
  feedbackUrl?: string
  /** Lists the project's tests for the `/test` browser. */
  listTests?: () => Promise<TestList>
  /** Runs the selected tests, streaming events. */
  runTests?: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /** Subscribes to every test run in the project. */
  watchTestRuns?: (onEvent: (event: TestRunFeedEvent) => void) => () => void
  /** Host-owned durable native runs in the tests browser and composer strip. */
  nativeTests?: {
    /** Whether the native status strip is shown. */
    visible: boolean
    /** The durable history rendered inside the tests browser. */
    history: JSX.Element
    /** Renders the host's own status strip; the argument opens the browser. */
    renderStatus: (openTests: () => void) => JSX.Element
  }
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean
  /** Skips the executor's tool call that is running right now. */
  skipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
  /** Extra classes on the panel's root element. */
  className?: string
}

/**
 * Props for the inner chat surface (timeline + composer), remounted per
 * conversation — React's prop names and contracts, unchanged.
 */
export interface ChatInnerProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint, conversation id included when there is one. */
  endpoint: string
  /** Auto-sends this opener once on mount when no conversation exists. */
  initialMessage?: string
  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void
  /** Whether the viewer is on a paid plan. */
  isPro?: boolean
  /** Whether the viewer is anonymous. */
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
  shareModalContent?: JSX.Element
  /** Host-supplied upgrade/sign-in CTA builder. */
  buildUpgradeCta?: ChatPanelProps['buildUpgradeCta']
  /** Host-supplied `/help` upgrade section builder. */
  buildHelpUpgradeSection?: ChatPanelProps['buildHelpUpgradeSection']
  /** The file focused in the editor. */
  activeFile?: string | null
  /** The open editor tabs. */
  openTabs?: string[]
  /** Opens a file as a preview tab. */
  onFileOpen?: (path: string, opts?: { focus?: boolean }) => void
  /** Pins a tab when a filename is double-clicked. */
  onFileDoubleClick?: (path: string) => void
  /** Opens a changed file's diff. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Writes content back to a file (undo/redo). */
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
  onRenderError?: ChatPanelProps['onRenderError']
  /** Called when a timeline avatar or author name is clicked. */
  onProfileClick?: ChatPanelProps['onProfileClick']
  /** The signed-in user's id. */
  currentUserId?: string
  /** Called on the `ready_to_build` stream event. */
  onReadyToBuild?: () => void
  /** True while the sandbox is still booting. */
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
  onRegisterPushHandler?: ChatPanelProps['onRegisterPushHandler']
  /** Registers the history reconcile with the host. */
  onRegisterHistoryReconcile?: ChatPanelProps['onRegisterHistoryReconcile']
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
  /** Send the pending message on the user's behalf, without a user bubble. */
  pendingMessageSuppressUser?: boolean
  /** The pending message was directly requested by the user. */
  pendingMessageUserInitiated?: boolean
  /** File path edited by the user in the editor. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number
  /** Incremented by the host to refresh git status. */
  gitStatusTick?: number
  /** True during the initial discovery phase. */
  discovery?: boolean
  /** The signed-in user's avatar. */
  userAvatar?: string | null
  /** Display name of the AI coding agent. */
  agentName?: string
  /** Display name of the host product / IDE. */
  productName?: string
  /** Host app/build version for `/version`. */
  version?: string
  /** Host-specific slash commands merged into the menu. */
  extraCommands?: readonly CommandDef[]
  /** Command-menu "Report a problem" URL. */
  feedbackUrl?: string
  /** Lists the project's tests for the Tests bar. */
  listTests?: ChatPanelProps['listTests']
  /** Runs the selected tests, streaming events. */
  runTests?: ChatPanelProps['runTests']
  /** Every test run in the project, streamed. */
  watchTestRuns?: ChatPanelProps['watchTestRuns']
  /** Host-owned durable native runs. */
  nativeTests?: ChatPanelProps['nativeTests']
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** Whether the environment that runs them is up. */
  testsAvailable?: boolean
  /** Skips the executor's running tool call. */
  skipToolCall?: ChatPanelProps['skipToolCall']
}

/**
 * The inner panel's shared state: its props and one namespace per slice. The
 * slice fields are filled by `ChatInner` in React's declaration order before
 * any effect or section reads them.
 */
export interface ChatInnerCtx {
  /** The inner panel's React props. */
  readonly props: ChatInnerProps
  /** The environment: translations, class map, HTTP, theme and viewport. */
  env: ChatEnvSlice
  /** The stream-event handler and the refs it feeds. */
  stream: ChatStreamSlice
  /** The context-usage ring's restored history and live samples. */
  contextUsage: ChatContextUsageSlice
  /** The verification auto-fix countdown and its deferred sends. */
  autoFix: ChatAutoFixSlice
  /** The auto-commit reducer and its persistence. */
  autoCommit: ChatAutoCommitSlice
  /** The chat session (`useChat`) and its panel-level callbacks. */
  chat: ChatChatSlice
  /** Git status, the commit bar and the commit cards. */
  git: ChatGitSlice
  /** Scroll anchoring, load-earlier and the visible-window cap. */
  scroll: ChatScrollSlice
  /** Tool-call undo tracking. */
  undo: ChatUndoSlice
  /** The composer: draft, input value and the text-filtering pickers. */
  composer: ChatComposerSlice
  /** Every popup's open state (file picker, attachments, system cards, modals). */
  popups: ChatPopupsSlice
  /** The sound preferences and the sounds picker. */
  sounds: ChatSoundsSlice
  /** The `/skills`, `/scripts`, `/settings` and `/test` panel overlay. */
  overlay: ChatOverlaySlice
  /** Dictation and the microphone picker. */
  voice: ChatVoiceSlice
  /** System cards, pushed events and the disabled-team-message gate. */
  systemCards: ChatSystemCardsSlice
  /** The persisted activity cards of the conversation. */
  activity: ChatActivitySlice
  /** The auto-tip cards. */
  tips: ChatTipsSlice
  /** Timestamp and tests-bar display preferences. */
  prefs: ChatPrefsSlice
  /** The tests browser's controller and its actions. */
  tests: ChatTestsSlice
  /** Skills: discovery, defaults, loading and the relevant-skill suggestion. */
  skills: ChatSkillsSlice
  /** The restored project settings and the model picker derivations. */
  models: ChatModelsSlice
  /** The inline editor for a queued message. */
  queuedEdit: ChatQueuedEditSlice
  /** Initial, pending and deferred automatic sends. */
  autoSend: ChatAutoSendSlice
  /** The tests-bar discovery preference. */
  testsBar: ChatTestsBarSlice
  /** The `@`-mention file picker. */
  mention: ChatMentionSlice
  /** File attachments and the drag-over overlay. */
  attachments: ChatAttachmentsSlice
  /** The project's saved scripts and `/run`. */
  scripts: ChatScriptsSlice
  /** The textarea's input handling. */
  input: ChatInputSlice
  /** Model selection, processing region and effort level. */
  modelActions: ChatModelActionsSlice
  /** The slash-command registry and `executeCommand`. */
  commands: ChatCommandsSlice
  /** `handleSubmit`. */
  submit: ChatSubmitSlice
  /** External signals (auto-submit, model selection, open modals). */
  signals: ChatSignalsSlice
  /** Every picker's derived rows and menus. */
  pickers: ChatPickersSlice
  /** The composer's native keydown handling. */
  keyboard: ChatKeyboardSlice
  /** The render-ready timeline, the plan and the commands the wait cards name. */
  timeline: ChatTimelineSlice
  /** The stable handlers lists capture, plus the modals' close/submitted handlers. */
  renderHandlers: ChatRenderHandlersSlice
}
