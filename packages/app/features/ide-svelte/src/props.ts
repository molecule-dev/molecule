/**
 * The props types `@molecule/app-ide-react` exports at its root, under the same names; the package root re-exports
 * this module. The rest of the package's types are in `./types.js`, which re-exports these too.
 *
 * @module
 */

import type { Snippet } from 'svelte'

import type { ChatStreamEvent } from '@molecule/app-ai-chat'
import type { IconName } from '@molecule/app-icons'
import type {
  Activity,
  ChatEventCardAction,
  ChatUserIdentity,
  CommandDef,
  IdeClientAction,
  PreviewRenderState,
  PreviewStuckReport,
  PreviewUiCommand,
  PreviewUiResult,
  TestFailure,
  TestItem,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
  TestsRunState,
} from '@molecule/app-ide-panel-logic'
import type { PreviewErrorReport } from '@molecule/app-ide-panel-logic/panels'

import type { ChatItemErrorInfo, UpgradeCtaContext } from './types.js'

/** Props for `ActivityCard` — the React prop names, React's own contract. */
export interface ActivityCardProps {
  /** The captured activity to render. */
  activity: Activity
  /**
   * Called when the card is clicked — should open the Activity panel
   * filtered to this activity. Omitted by a host that renders the card
   * read-only: then no click or hover handler is attached, the cursor says
   * `default`, and a coarse pointer gets no touch target.
   */
  onActivityClick?: (activity: Activity) => void
}

/**
 * A message author's identity, as a profile click hands it to the host —
 * panel-logic's `ChatUserIdentity`, re-exported so the package's props and
 * types modules carry it under the same name.
 */
export type { ChatUserIdentity } from '@molecule/app-ide-panel-logic'

/** Discovery status for the tests list — mirrors the React card's. */
export type TestsStatus = 'loading' | 'ready' | 'error' | 'unavailable'

/** Props for `TestsCard` — the React prop names, React's own contract. */
export interface TestsCardProps {
  /** Every discovered test (unfiltered). */
  tests: TestItem[]
  /** How the listing went. */
  status: TestsStatus
  /** The run this card is showing — owned by the panel, so it survives a close. */
  run: TestsRunState
  /** Seeds the search box from `/test <query>`. */
  initialQuery: string
  /** Whether this viewer may run tests at all (a viewer may not). */
  canRun: boolean
  /** Runs a selection. */
  onRun: (selection: TestSelection) => void
  /** Stops the run in flight — the whole run, every remaining file. */
  onCancel: () => void
  /**
   * Skips the command the run is on right now, WITHOUT ending it: that file
   * comes back `Skipped` and the run moves to the next one. Omitted by a host
   * that does not serve skipping — then no Skip control is rendered.
   */
  onSkipCurrent?: () => void
  /**
   * Hands the failing tests to the agent as ONE chat message — a real turn it
   * answers, exactly like the editor’s “Fix with AI”.
   */
  onFix: (failures: TestFailure[]) => void
  /**
   * Why fixing is unavailable (a viewer, a turn already streaming), already
   * translated by the host — `null` when it is available. The card states the
   * reason on the disabled button rather than letting a click do nothing.
   */
  fixDisabledReason: string | null
  /** Light theme (drives the same row border + field inset the sibling cards use). */
  isLight: boolean
  /** Chrome-less inside the command overlay; full card chrome in the timeline. */
  embedded?: boolean
  /** The agent's display name, for a run the agent started. */
  agentName?: string
}

/** Props for `UserAvatar` — the React prop names, React's own contract. */
export interface UserAvatarProps {
  /**
   * The signed-in user's avatar — an inline `data:image/*` URI or an
   * `http(s)` URL from their profile metadata. Unsafe / unset / oversized
   * values are ignored (see `resolveUserAvatar`) and the generic icon is
   * shown.
   */
  userAvatar?: string | null
  /**
   * The message author's display name, for a TEAMMATE's message. When set
   * and there is no renderable avatar, the fallback tile shows the name's
   * initial instead of the generic `user` glyph. Also used as the
   * accessible label / image alt in place of the solo "You".
   */
  name?: string
  /** Diameter of the avatar in pixels. Defaults to 24. */
  size?: number
  /**
   * Optional click handler. When supplied, the avatar becomes an interactive
   * button that opens the user's profile; when omitted (the default) it
   * renders as a static, non-interactive image/icon.
   */
  onClick?: () => void
}

/**
 * Props for `ChatPanel` — React's `ChatPanelProps` under the same names, with
 * Svelte `Snippet`s where React takes nodes. `projectId` selects the project;
 * every other input is optional, and the panel owns the conversation chrome
 * unless the host drives it through the controlled props.
 */
export interface ChatPanelProps {
  /** The project the conversation belongs to. */
  projectId: string
  /** The chat endpoint; defaults to `/projects/:id/chat`. */
  endpoint?: string
  /** Auto-sends this message once on mount (a prompt handed over from the landing page). */
  initialMessage?: string
  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void
  /** Opens a file as a preview tab; `opts.focus === false` opens it quietly. */
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
  /** Called when an inline activity card is clicked. */
  onActivityClick?: (activity: Activity) => void
  /** Reports a timeline item that threw during render, caught by its boundary. */
  onRenderError?: (error: Error, info: ChatItemErrorInfo) => void
  /** Called when a user avatar or author name in the timeline is clicked. */
  onProfileClick?: (user: ChatUserIdentity) => void
  /** The signed-in user's id. */
  currentUserId?: string
  /** Called on the `ready_to_build` stream event. */
  onReadyToBuild?: () => void
  /** True after the plan streams but while the sandbox is still booting. */
  awaitingSandboxBoot?: boolean
  /** Called on the `client_action` stream event. */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream done or error. */
  onTurnComplete?: () => void
  /** Called whenever the chat's loading state changes. */
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
  /** Seeds the input with this text on mount. */
  initialInputValue?: string
  /** Hides the conversation-selector header (e.g. during discovery). */
  hideConversationMenu?: boolean
  /**
   * Whether to render the built-in conversation header. `false` operates
   * headless: the host renders that chrome and drives the controlled props.
   */
  renderConversationHeader?: boolean
  /** Host-controlled active conversation id (headless mode). */
  conversationId?: string | null
  /** Host-controlled inner-chat remount key (headless mode). */
  chatKey?: string
  /** Called whenever the active conversation id changes. */
  onConversationId?: (id: string | null) => void
  /** Changing this opens the in-chat `/share` modal (host-driven). */
  openShareSignal?: number
  /** Changing this opens the in-chat `/report` modal (host-driven). */
  openReportSignal?: number
  /** Changing this opens the in-chat `/settings` view (host-driven). */
  openSettingsSignal?: number
  /** Shows a "manage your own models" row in the `/model` picker. */
  onManageCustomModels?: (context?: { mode?: 'plan' | 'execute' }) => void
  /** Bump to make the panel re-read its persisted model and settings state. */
  modelSelectionSignal?: number
  /** Whether the current user may write shared project state. */
  canEdit?: boolean
  /** Whether this viewer may send team-only side-channel messages. */
  canSendTeamMessages?: boolean
  /** Whether the current user may manage public share links. */
  canShare?: boolean
  /** Whether the share dialog shows its public-link section. */
  shareLinksAllowed?: boolean
  /** Changing this re-fetches the share dialog's link list. */
  shareLinksRefreshSignal?: number
  /** Host sections rendered inside the share dialog. */
  shareModalContent?: Snippet
  /** Spinner node for in-chat loading states. */
  spinner?: Snippet
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
  /** Sends the pending message on the user's behalf without a user bubble. */
  pendingMessageSuppressUser?: boolean
  /** Marks the pending message as directly user-requested. */
  pendingMessageUserInitiated?: boolean
  /** File path the user just edited in the editor. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number
  /** Whether the current user is anonymous. */
  isAnonymous?: boolean
  /** Whether the current user has a paid plan. */
  isPro?: boolean
  /** Retained for call-site compatibility; drives no built-in behaviour. */
  suppressGuestReminder?: boolean
  /** Builds the host's upgrade or sign-in call-to-action buttons. */
  buildUpgradeCta?: (
    context: UpgradeCtaContext,
  ) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /** Optional app-specific section appended to the `/help` output. */
  buildHelpUpgradeSection?: () =>
    { lines: string[]; action?: ChatEventCardAction | ChatEventCardAction[] } | null | undefined
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
  /** Lists the project's tests for the `/test` browser. */
  listTests?: () => Promise<TestList>
  /** Runs the selected tests, streaming events as they happen. */
  runTests?: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /** Subscribes to every test run in the project. */
  watchTestRuns?: (onEvent: (event: TestRunFeedEvent) => void) => () => void
  /** Host-owned durable native runs in the Tests browser and composer strip. */
  nativeTests?: {
    /** Whether the host's native status strip is shown. */
    visible: boolean
    /** The durable history rendered inside the tests browser. */
    history: Snippet
    /** Renders the host's own status strip; the argument opens the browser. */
    renderStatus: Snippet<[() => void]>
  }
  /** Whether this viewer may run tests. */
  canRunTests?: boolean
  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean
  /** Skips the executor's running tool call without ending the turn. */
  skipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
  /** Extra classes merged onto the panel's root element. */
  className?: string
}

/**
 * Props for `PreviewPanel` — the React prop names, React's own contract (see
 * `@molecule/app-ide-react`'s `PreviewPanelProps`). The two indicator props are
 * Svelte snippets where React takes `ReactNode`.
 */
export interface PreviewPanelProps {
  /** Custom loading indicator shown while the dev server is starting. */
  loadingIndicator?: Snippet
  /**
   * The current UI command the host wants performed in the preview iframe
   * (AI-driven end-to-end verification). The panel posts it to the iframe's
   * interaction bridge when it CHANGES (keyed on `id`, so each new command
   * fires exactly once). The panel only relays it; the host owns what to
   * send and what to do with the result.
   */
  uiCommand?: PreviewUiCommand | null
  /** Called when the iframe replies to a {@link PreviewUiCommand}, keyed by the command `id`. */
  onUiResult?: (id: string, result: PreviewUiResult) => void
  /**
   * Custom loading indicator shown when the dev server restarts
   * mid-session. Falls back to loadingIndicator if not provided.
   */
  restartingIndicator?: Snippet
  /** Called when the preview iframe reports runtime JS errors. */
  onPreviewError?: (errors: PreviewErrorReport[]) => void
  /** Incremented when AI edits files. Triggers an iframe reload only when the preview is broken. */
  fileChangeTick?: number
  /**
   * Active-build hint (e.g. a basename like `GuestMenu.tsx`) the host sets
   * while the AI is editing files. When non-null the overlay shows
   * "Updating `<hint>`…" so the user sees what is being worked on. Null
   * when no build edit is in flight.
   */
  buildingHint?: string | null
  /**
   * Whether the AI agent is actively building right now (a chat turn is in
   * progress). While true, the preview keeps a "Building your app…" status
   * overlay up whenever the app has NOT confirmed it rendered content — so
   * a half-built / blank / white iframe during a long build always shows
   * progress instead of a bare white screen. A confirmed render still
   * reveals the live app (HMR updates stay visible).
   */
  isBuilding?: boolean
  /**
   * Timestamp (ms since epoch) of when the preview's backing
   * server/sandbox was last woken from sleep or restarted, or 0/undefined
   * when it never was. While this is recent, the panel treats the preview
   * like a fresh cold boot (wake patience — see the React file's notes).
   */
  wakeAt?: number
  /**
   * Called when the preview gives up showing the running app — after
   * exhausting reload recovery, at the absolute readiness ceiling, OR when
   * the heartbeat watchdog detects a frozen (locked-thread) app. Receives a
   * {@link PreviewStuckReport} (failure class + route).
   */
  onPreviewStuck?: (report?: PreviewStuckReport) => void
  /**
   * Escalation hook: restart the BACKING dev server. Return (or resolve)
   * `false` to DECLINE; any other result counts as "restart initiated".
   * Omit the prop to disable escalation entirely.
   */
  onRestartBackend?: () => Promise<boolean | void> | boolean | void
  /**
   * Called when the preview's render verdict changes
   * ({@link PreviewRenderState}) — with the current location so the host
   * can report WHERE.
   */
  onRenderState?: (state: PreviewRenderState, url?: string) => void
  /** Extra classes for the root. */
  className?: string
}

/** Props for `ChatTimestamp` — the React prop names, React's own contract. */
export interface ChatTimestampProps {
  /** Epoch milliseconds of the message or event. */
  timestamp: number
  /**
   * `inline` sits inside an existing header row (the user message's name
   * line); `line` is its own row above a reply or card, aligned with that
   * item's content.
   */
  variant?: 'inline' | 'line'
  /** Horizontal alignment for the `line` variant (centered notices center their time). */
  align?: 'left' | 'center'
}

/**
 * Props for `Icon`.
 *
 * In React every extra SVG/HTML attribute travels through the `...rest`
 * spread (`data-mol-id`, `aria-*`, `role`, event handlers, `style`, …); in
 * Svelte it is the `$props()` rest, spread onto the root `<svg>` the same
 * way.
 */
export interface IconProps {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
  /** React's `...rest`: any other SVG/HTML attribute or event handler. */
  [key: string]: unknown
}

/** An item in the quick picker list. */
export interface QuickPickerItem {
  /** Unique identifier. */
  id: string
  /** Primary label. */
  label: string
  /** Secondary text shown beside the label. */
  detail?: string
  /** Optional icon (a snippet, or plain text). */
  icon?: Snippet | string | number
}

/**
 * Properties for the reusable quick picker overlay — React's contract, the
 * React prop names.
 */
export interface QuickPickerProps {
  /** Items to display and filter. */
  items: QuickPickerItem[]
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Called when the user selects an item. */
  onSelect: (item: QuickPickerItem) => void
  /** Called when the user dismisses the picker (Escape or backdrop click). */
  onDismiss: () => void
  /** Show a loading indicator. */
  loading?: boolean
  /** Pre-fill the search input. */
  initialQuery?: string
  className?: string
}

/** Properties for the sidebar tab switcher — React's own contract. */
export interface SidebarTabsProps {
  /** Currently active sidebar tab. */
  activeTab: 'files' | 'search'
  /** Called when the user switches tabs. */
  onTabChange: (tab: 'files' | 'search') => void
  /** Tab content rendered below the tab buttons (the `children` snippet). */
  children?: Snippet
  className?: string
}

/** Props for `WorkspaceLayout` — the pane list as data, everything else React's own contract. */
export interface WorkspaceLayoutProps<T = unknown> {
  /** The panes, in row order (React's `children` elements). */
  items?: T[]
  /** Renders one entry of `items` as its pane. */
  children?: Snippet<[item: T, index: number]>
  /** Extra classes from the host, appended to the root's ClassMap classes. */
  className?: string
}
