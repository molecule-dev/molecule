/**
 * The ChatPanel port's shared state: React's `ChatInnerProps`, the resolved
 * `chat:env` values every slice reads, the outer shell's context, and one field
 * per slice so a slice can read another at call time instead of capturing it at
 * construction.
 *
 * React's `ChatInner` is one function whose concerns form cycles (the composer
 * feeds voice, mention, commands and submit; the stream drives auto-fix,
 * auto-commit, sounds and activity; the timeline reads system cards, tips,
 * activity, commits and timestamps). A slice therefore reads another through
 * this context at CALL time. `ChatInner` assigns each field in ledger order
 * before anything downstream reads it, so a later slice sees the same object
 * React's closure held.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { ChatSessionControls, ChatStreamEvent } from '@molecule/app-ai-chat'
import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME } from '@molecule/app-ai-chat'
import type { I18nProvider } from '@molecule/app-i18n'
import type {
  Activity,
  ChatEventCardAction,
  CommandDef,
  IdeClientAction,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
} from '@molecule/app-ide-panel-logic'
import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'
import type { useHttpClient } from '@molecule/app-svelte'
import type { UIClassMap } from '@molecule/app-ui'

import type { ChatPanelProps, ChatUserIdentity } from '../../props.js'
import type { ChatActivitySlice } from './chat-activity.svelte.js'
import type { ChatAttachmentsSlice } from './chat-attachments.svelte.js'
import type { ChatAutoCommitSlice } from './chat-auto-commit.svelte.js'
import type { ChatAutoFixSlice } from './chat-auto-fix.svelte.js'
import type { ChatAutoSendSlice } from './chat-auto-send.svelte.js'
import type { ChatChatSlice } from './chat-chat.svelte.js'
import type { ChatCommandsSlice } from './chat-commands.svelte.js'
import type { ChatComposerSlice } from './chat-composer.svelte.js'
import type { ChatContextUsageSlice } from './chat-context-usage.svelte.js'
import type { ChatEnvSlice } from './chat-env.svelte.js'
import type { ChatGitSlice } from './chat-git.svelte.js'
import type { ChatInputSlice } from './chat-input.svelte.js'
import type { ChatKeyboardSlice } from './chat-keyboard.svelte.js'
import type { ChatMentionSlice } from './chat-mention.svelte.js'
import type { ChatModelActionsSlice } from './chat-model-actions.svelte.js'
import type { ChatModelsSlice } from './chat-models.svelte.js'
import type { ChatOverlaySlice } from './chat-overlay.svelte.js'
import type { ChatPickersSlice } from './chat-pickers.svelte.js'
import type { ChatPopupsSlice } from './chat-popups.svelte.js'
import type { ChatPrefsSlice } from './chat-prefs.svelte.js'
import type { ChatQueuedEditSlice } from './chat-queued-edit.svelte.js'
import type { ChatRenderHandlersSlice } from './chat-render-handlers.svelte.js'
import type { ChatScriptsSlice } from './chat-scripts.svelte.js'
import type { ChatScrollSlice } from './chat-scroll.svelte.js'
import type { ChatSignalsSlice } from './chat-signals.svelte.js'
import type { ChatSkillsSlice } from './chat-skills.svelte.js'
import type { ChatSoundsSlice } from './chat-sounds.svelte.js'
import type { ChatStreamSlice } from './chat-stream.svelte.js'
import type { ChatSubmitSlice } from './chat-submit.svelte.js'
import type { ChatSystemCardsSlice } from './chat-system-cards.svelte.js'
import type { ChatTestsSlice } from './chat-tests.svelte.js'
import type { ChatTestsBarSlice } from './chat-tests-bar.svelte.js'
import type { ChatTimelineSlice } from './chat-timeline.svelte.js'
import type { ChatTipsSlice } from './chat-tips.svelte.js'
import type { ChatUndoSlice } from './chat-undo.svelte.js'
import type { ChatVoiceSlice } from './chat-voice.svelte.js'

/**
 * What React's `ErrorInfo` carries at the one place the panel reads it: the
 * error boundary's component stack, forwarded to `onRenderError`.
 */
export interface ChatRenderErrorInfo {
  /** React's component stack for the item that threw (null when unknown). */
  componentStack: string | null
}

/** The host's own durable test history surface (React's `nativeTests` prop). */
export interface ChatNativeTests {
  /** Whether the status strip renders at all. */
  visible: boolean
  /** The host's durable test history, rendered above the browser's list. */
  history: Snippet
  /** The host's own status strip; the panel supplies its browser opener. */
  renderStatus: Snippet<[() => void]>
}

/**
 * React's `ChatInnerProps`: the inner chat surface's inputs, in React's prop
 * names and order. Nodes are Svelte `Snippet`s; everything else keeps React's
 * shape.
 */
export interface ChatInnerProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint (it carries `?conversationId=` when a conversation is open). */
  endpoint: string
  /** Auto-send this message once on mount. */
  initialMessage?: string
  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void
  /** Whether the user has a paid plan. */
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
  shareModalContent?: Snippet
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
  /** Called after a commit or a no-op. */
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
  /** Called on each stream done or error. */
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
  /** Bump to re-read persisted model and settings. */
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
  /** Display name of the host product or IDE. */
  productName?: string
  /** The host's current app or build version. */
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

/** The HTTP client `useHttpClient()` returns, named once for the slices. */
export type ChatHttpClient = ReturnType<typeof useHttpClient>

/**
 * A plain mutable holder, React's `useRef` shape: the port reads and writes
 * `.current` outside the reactive system (a ref never re-renders anything).
 */
export interface MutableRef<T> {
  /** The held value. */
  current: T
}

/** A model's processing region id (`'us'`, `'cn'`, …), as React's local alias. */
export type ModelRegion = string

/** A send through the shared chat session (`useChat`'s `sendMessage`). */
export type ChatSendMessage = ChatSessionControls['sendMessage']

/**
 * A slice's effect entry points, keyed by React's `#effect chat:<slice>:<n>`
 * number. A slice with scattered regions exposes these and `ChatInner` calls
 * them where React declares them, which is how the ordered effect ledger
 * survives the split into files.
 */
export type ChatSliceEffects = Partial<Readonly<Record<number, () => void>>>

/**
 * The ChatPanel port's shared inner state, created once by `ChatInner` and
 * handed to every slice it creates and every section it renders.
 */
export class ChatContext {
  /** Reads the component's props at call time, so a prop change stays reactive. */
  private readonly propsSource: () => ChatInnerProps

  /** The component's props, read reactively. */
  get props(): ChatInnerProps {
    return this.propsSource()
  }

  /** The resolved env, assigned by `ChatInner` before any other slice reads it. */
  env!: ChatEnvSlice

  /** React's `chat:stream` slice. */
  stream!: ChatStreamSlice

  /** React's `chat:context-usage` slice. */
  contextUsage!: ChatContextUsageSlice

  /** React's `chat:auto-fix` slice. */
  autoFix!: ChatAutoFixSlice

  /** React's `chat:auto-commit` slice. */
  autoCommit!: ChatAutoCommitSlice

  /** React's `chat:chat` slice. */
  chat!: ChatChatSlice

  /** React's `chat:git` slice. */
  git!: ChatGitSlice

  /** React's `chat:scroll` slice. */
  scroll!: ChatScrollSlice

  /** React's `chat:undo` slice. */
  undo!: ChatUndoSlice

  /** React's `chat:composer` slice. */
  composer!: ChatComposerSlice

  /** React's `chat:popups` slice. */
  popups!: ChatPopupsSlice

  /** React's `chat:sounds` slice. */
  sounds!: ChatSoundsSlice

  /** React's `chat:overlay` slice. */
  overlay!: ChatOverlaySlice

  /** React's `chat:voice` slice. */
  voice!: ChatVoiceSlice

  /** React's `chat:system-cards` slice. */
  systemCards!: ChatSystemCardsSlice

  /** React's `chat:activity` slice. */
  activity!: ChatActivitySlice

  /** React's `chat:tips` slice. */
  tips!: ChatTipsSlice

  /** React's `chat:prefs` slice. */
  prefs!: ChatPrefsSlice

  /** React's `chat:tests` slice. */
  tests!: ChatTestsSlice

  /** React's `chat:skills` slice. */
  skills!: ChatSkillsSlice

  /** React's `chat:models` slice. */
  models!: ChatModelsSlice

  /** React's `chat:queued-edit` slice. */
  queuedEdit!: ChatQueuedEditSlice

  /** React's `chat:auto-send` slice. */
  autoSend!: ChatAutoSendSlice

  /** React's `chat:tests-bar` slice. */
  testsBar!: ChatTestsBarSlice

  /** React's `chat:mention` slice. */
  mention!: ChatMentionSlice

  /** React's `chat:attachments` slice. */
  attachments!: ChatAttachmentsSlice

  /** React's `chat:scripts` slice. */
  scripts!: ChatScriptsSlice

  /** React's `chat:input` slice. */
  input!: ChatInputSlice

  /** React's `chat:model-actions` slice. */
  modelActions!: ChatModelActionsSlice

  /** React's `chat:commands` slice. */
  commands!: ChatCommandsSlice

  /** React's `chat:submit` slice. */
  submit!: ChatSubmitSlice

  /** React's `chat:signals` slice. */
  signals!: ChatSignalsSlice

  /** React's `chat:pickers` slice. */
  pickers!: ChatPickersSlice

  /** React's `chat:keyboard` slice. */
  keyboard!: ChatKeyboardSlice

  /** React's `chat:timeline` slice. */
  timeline!: ChatTimelineSlice

  /** React's `chat:render-handlers` slice. */
  renderHandlers!: ChatRenderHandlersSlice

  /**
   * Creates the context around the component's props.
   *
   * @param props - Reads the props `ChatInner` was handed.
   */
  constructor(props: () => ChatInnerProps) {
    this.propsSource = props
  }

  /** The agent's display name, with React's default. */
  get agentName(): string {
    return this.props.agentName ?? DEFAULT_AGENT_NAME
  }

  /** The host product's display name, with React's default. */
  get productName(): string {
    return this.props.productName ?? DEFAULT_PRODUCT_NAME
  }

  /** Whether team messages are allowed, with React's default. */
  get canSendTeamMessages(): boolean {
    return this.props.canSendTeamMessages ?? true
  }
}

/**
 * The outer `ChatPanel` shell's context: its props, the conversation state it
 * owns (React's header effects), and the header section's actions.
 */
export interface ChatPanelContext {
  /** The component's props, read reactively. */
  readonly props: ChatPanelProps
  /** The translation function. */
  readonly t: I18nProvider['t']
  /** The bonded ClassMap. */
  readonly cm: UIClassMap
  /** Whether the theme is light. */
  readonly isLight: boolean
  /** Whether the viewport is phone-width. */
  readonly isNarrow: boolean
  /** Whether the primary pointer is coarse. */
  readonly isCoarse: boolean
  /** Whether share management is available to this viewer. */
  readonly shareAllowed: boolean
  /** Whether the header renders at all. */
  readonly renderConversationHeader: boolean
  /** Whether the host hides the conversation menu. */
  readonly hideConversationMenu: boolean
  /** The active conversation id (controlled or owned). */
  readonly activeConversationId: string | null
  /** The known conversations, newest first. */
  readonly conversations: readonly ConversationSummary[]
  /** The conversation search text. */
  readonly convSearch: string
  /** Whether the history dropdown is open. */
  readonly showDropdown: boolean
  /** The conversations matching the search text. */
  readonly filteredConvs: readonly ConversationSummary[]
  /** The active conversation's summary, when it is known. */
  readonly activeConv: ConversationSummary | undefined
  /** The header element React attaches the outside-click listener to. */
  readonly dropdownRef: { current: HTMLDivElement | null }
  /** The dropdown's search input. */
  readonly convSearchRef: { current: HTMLInputElement | null }
  /**
   * Applies the search text.
   *
   * @param value - The new search text.
   */
  setConvSearch(value: string): void
  /** Opens or closes the history dropdown (fetching on open). */
  toggleDropdown(): void
  /** Starts a new conversation. */
  newChat(): void
  /**
   * Opens a conversation and remounts the inner chat.
   *
   * @param id - The conversation's id.
   */
  selectConversation(id: string): void
  /** Opens the in-chat share modal. */
  openShare(): void
  /** Opens the in-chat bug-report modal. */
  openReport(): void
  /** Opens the in-chat settings view. */
  openSettings(): void
}
