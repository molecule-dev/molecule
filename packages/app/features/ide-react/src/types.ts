/**
 * Types for IDE React components.
 *
 * @module
 */

import type { ErrorInfo, ReactNode } from 'react'

import type { ChatStreamEvent } from '@molecule/app-ai-chat'
import type {
  Activity as ActivityFromCard,
  ChatEventCardAction,
  ChatUserIdentity,
  CommandDef,
  IdeClientAction,
  PreviewRenderState,
  PreviewStuckReport,
  PreviewUiCommand,
  PreviewUiResult,
  TestList,
  TestRunEvent,
  TestRunFeedEvent,
  TestRunHandle,
  TestSelection,
} from '@molecule/app-ide-panel-logic'

/**
 * Properties for workspace layout.
 */
export interface WorkspaceLayoutProps {
  children: ReactNode
  className?: string
}

/**
 * Props for the {@link ChatPanel} component — the IDE chat surface plus the
 * callbacks the host app uses to react to AI activity (file changes, boot, client
 * actions, etc.).
 */
export interface ChatPanelProps {
  projectId: string
  endpoint?: string
  /** If provided, auto-send this message once on mount (e.g., prompt from landing page). */
  initialMessage?: string
  /** Called after the initial message has been sent — used to clear router state. */
  onInitialMessageSent?: () => void
  /** Called to open a file as a preview tab. `opts.focus === false` opens it quietly (no pane switch) — e.g. a saved plan or a system-initiated open while the user is busy. */
  onFileOpen?: (path: string, opts?: { focus?: boolean }) => void
  /** Called when a filename in a tool call is double-clicked — should pin the tab. */
  onFileDoubleClick?: (path: string) => void
  /** Called when a file in the uncommitted list is clicked for diff view. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Called to undo/redo a file change — writes the given content to the file path. */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Called when the AI creates or modifies a file — should refresh the editor if the file is open. */
  onFileChange?: (path: string, content: string) => void
  /** Called when a file is removed from disk (e.g. reverting an untracked file). */
  onFileDeleted?: (path: string) => void
  /** Called after a commit or no-op — should refresh file explorer git status. */
  onCommit?: () => void
  /** Called when an inline activity card is clicked — should open the Activity panel filtered to this activity. */
  onActivityClick?: (activity: ActivityFromCard) => void
  /**
   * Reports a chat timeline item that threw during render, caught by that item's
   * error boundary. The item degrades to an inline notice either way; this is how the
   * host gets the crash into its telemetry instead of it being visible only to the
   * one user who hit it.
   */
  onRenderError?: (error: Error, info: ErrorInfo) => void
  /**
   * Called when a user avatar or author name in the chat timeline is clicked —
   * the host opens THAT user's profile (e.g. molecule.dev's profile modal).
   * Receives the clicked author's {@link ChatUserIdentity}: a teammate's click
   * carries their persisted author fields, the signed-in user's own click
   * carries their own — the host compares `id` against the signed-in user to
   * decide editable-own vs view-only-teammate. Omit it (the default) to render
   * the avatars/names non-interactive (static, exactly as before). Only human
   * authors are clickable — the molecule glyph on auto-sent messages is not.
   */
  onProfileClick?: (user: ChatUserIdentity) => void
  /**
   * The signed-in user's id (a message's persisted `author.id`). Used to stamp
   * the identity handed to {@link onProfileClick} for AUTHOR-LESS messages (the
   * local optimistic echo, legacy solo rows), which are always the signed-in
   * user's own. Omit in a solo host — those clicks then carry no `id`, which
   * hosts treat as "the signed-in user".
   */
  currentUserId?: string
  /** Called when the server signals (via the `ready_to_build` stream event) that discovery is complete and the sandbox should boot. */
  onReadyToBuild?: () => void
  /**
   * True while the plan has finished streaming but the sandbox is still booting
   * (after `ready_to_build`, before the post-boot build kickoff). When set and no
   * message is actively streaming, the chat shows a "waiting for the development
   * environment" indicator so the conversation doesn't appear to silently stall.
   */
  awaitingSandboxBoot?: boolean
  /** Called when the agent requests a UI action via the `client_action` stream event (reload/navigate the preview, open a file). */
  onClientAction?: (action: IdeClientAction) => void
  /** Called on each stream `done` — host uses it to keep the boot view up until the parallel during-boot plan stream finishes. */
  onTurnComplete?: () => void
  /**
   * Called whenever the chat's loading state changes — true when a turn (plan or build) is in
   * progress, false when idle. The host uses this as the authoritative "the agent is actively
   * building" signal to drive the preview's "Building your app…" overlay, so a half-built /
   * blank preview during a long build always shows progress instead of a bare white screen.
   */
  onLoadingChange?: (loading: boolean) => void
  /**
   * Navigates the live preview to a route path. Wired so a `[label](/route)` markdown link in
   * an assistant message (e.g. the agent's "your app is ready" handoff) jumps the preview to
   * that page on click. User-initiated, so the host should navigate unconditionally (it is not
   * the rate-limited agent `navigate_preview` action).
   */
  onNavigatePreview?: (path: string) => void
  /**
   * Called on mount with a handler the parent invokes to deliver a broadcast chat event
   * from another project member (the push channel); called with null on unmount.
   */
  onRegisterPushHandler?: (
    handler: ((conversationId: string, event: ChatStreamEvent) => void) | null,
  ) => void
  /**
   * Called on mount with a function that reloads chat history and converges the
   * panel on the persisted transcript; called with null on unmount. The host
   * should invoke it whenever its chat push channel (re)connects: a broadcast
   * sent while that socket was down (a teammate's team note against a
   * backgrounded tab or a slept laptop) is otherwise lost until a page
   * lifecycle event happens to fire. Cheap when nothing changed — an identical
   * transcript is never re-applied.
   */
  onRegisterHistoryReconcile?: (reconcile: (() => Promise<void>) | null) => void
  /** Changing this value submits the current input draft — used to send a prefilled prompt after the prompt→chat morph docks. */
  autoSubmitSignal?: number
  /** Seeds the input with this text on mount (prompt→chat morph), so the chat input shows the prompt before it is sent. */
  initialInputValue?: string
  /** Hide the conversation-selector header (e.g. during discovery, before any history is worth showing). */
  hideConversationMenu?: boolean
  /**
   * Whether to render the built-in conversation header (the picker + searchable
   * history dropdown, the share / bug-report / settings buttons, and the
   * new-chat "+"). Defaults to `true` (the package owns that chrome). Pass
   * `false` to operate **headless** — the host renders those controls itself
   * (e.g. molecule.dev's Workspace top bar) and drives the chat through the
   * controlled props below: {@link ChatPanelProps.conversationId} /
   * {@link ChatPanelProps.chatKey} / {@link ChatPanelProps.onConversationId} for
   * the conversation, and {@link ChatPanelProps.openShareSignal} /
   * {@link ChatPanelProps.openReportSignal} to open the in-chat modals.
   */
  renderConversationHeader?: boolean
  /**
   * Host-controlled active conversation id (headless mode). Drives the chat
   * endpoint's `?conversationId=`. When `undefined` (the default) the panel owns
   * the active conversation internally (localStorage-backed). `null` is a valid
   * controlled value meaning "no conversation yet".
   */
  conversationId?: string | null
  /**
   * Host-controlled remount key for the inner chat (headless mode). Changing it
   * remounts the conversation timeline (a new chat or a switch); the backend
   * assigning an id mid-stream must NOT change it (that would drop in-flight
   * messages). Falls back to the internal key when omitted.
   */
  chatKey?: string
  /**
   * Called whenever the active conversation id changes — the backend assigns one
   * mid-stream and the host needs it to keep its own picker in sync WITHOUT
   * remounting (do not change {@link ChatPanelProps.chatKey} in response).
   */
  onConversationId?: (id: string | null) => void
  /** Changing this opens the in-chat `/share` modal (host-driven, e.g. a top-bar share button). Overrides the built-in header's share button signal. */
  openShareSignal?: number
  /** Changing this opens the in-chat `/report` modal (host-driven). Overrides the built-in header's bug-report button signal. */
  openReportSignal?: number
  /** Changing this opens the in-chat `/settings` view (host-driven). Overrides the built-in header's settings button signal. */
  openSettingsSignal?: number
  /**
   * When provided, the `/model` picker shows an "Add or manage your own
   * models…" row at the bottom of the list; choosing it closes the picker and
   * invokes this callback (the host opens its own custom-provider management
   * surface). Omit to hide the row — the shared package stays host-agnostic.
   */
  onManageCustomModels?: (context?: {
    /**
     * The mode a "Use this model" action should target — the `/model` picker's
     * scoped mode when it has one, else the LIVE conversation mode (discovery
     * runs in plan mode, so it maps to `'plan'`).
     */
    mode?: 'plan' | 'execute'
  }) => void
  /**
   * Bump to make the panel re-read its persisted model/settings state — e.g.
   * after the host's custom-provider surface sets the chat model via "Use".
   * The panel loads that state once on mount otherwise.
   */
  modelSelectionSignal?: number
  /**
   * Whether the current user may write SHARED project state from the chat
   * surface — send/run Synthase, change the model, toggle autofix/mode, run a
   * write-command, etc. A read-only project VIEWER passes `false`: the server
   * 403s every such write, so the UI disables the composer + those controls and
   * default-denies non-`viewerSafe` slash commands, showing a read-only note
   * instead of a dead control. Defaults to `true` (a single-user/owner IDE and
   * every non-collaborator host is unaffected). Read-only reads, view-only
   * surfaces (`/settings`, `/help`, `/cost`) and per-user preferences stay
   * available.
   */
  canEdit?: boolean
  /**
   * Whether this viewer may send team-only side-channel messages. Defaults to
   * `true` for existing member viewers. Pass `false` with `canEdit={false}`
   * for a public transcript: hides the composer and team-message guidance.
   * Side-channel commands are unavailable when false; assistant access still
   * follows `canEdit`.
   */
  canSendTeamMessages?: boolean
  /**
   * Whether the current user may MANAGE public share links — the `/share`
   * command, the header share button, and the ShareModal's create/revoke
   * controls. Distinct from {@link canEdit} because hosts commonly gate share
   * minting ABOVE editor (molecule.dev mints/lists/revokes at admin+): an
   * editor with `canEdit` true but `canShare` false gets no `/share` surface
   * instead of a modal whose every request 403s. Defaults to `canEdit !==
   * false` (back-compat: hosts that gate the modal themselves see no change).
   */
  canShare?: boolean
  /**
   * Whether the share dialog shows the public-link section. Defaults to
   * {@link canShare}. Set it below `canShare` when a host lets more roles open
   * the dialog (for {@link shareModalContent}) than may list links — the links
   * section is then hidden instead of 403ing.
   */
  shareLinksAllowed?: boolean
  /** Changing this value re-fetches the share dialog's link list (another client changed the links). */
  shareLinksRefreshSignal?: number
  /** Host sections rendered inside the share dialog, below the links. */
  shareModalContent?: ReactNode
  /** Spinner/busy indicator node to show for in-chat loading states (e.g. the "designing" indicator). Falls back to a built-in dots animation. */
  spinner?: ReactNode
  /** Path of the currently focused file in the editor (shown first in @ picker). */
  activeFile?: string | null
  /** Paths of all open editor tabs (shown after active file in @ picker). */
  openTabs?: string[]
  /** Incremented to trigger a git status refresh (e.g. after file create/rename/delete). */
  gitStatusTick?: number
  /** Message to auto-send (e.g. from "Fix with AI"). Sent when pendingMessageKey changes. */
  pendingMessage?: string
  /** Incremented to trigger sending pendingMessage. */
  pendingMessageKey?: number
  /** When true, the pending message is sent on the user's behalf (e.g. the post-boot build kickoff) and is NOT shown as a user bubble — phase markers convey what's happening instead. */
  pendingMessageSuppressUser?: boolean
  /**
   * When true, the pending message was directly requested by the user (e.g. the
   * editor's or broken-preview overlay's "Fix with AI" button) rather than
   * dispatched autonomously (preview-health / preview-error auto-fix). A user
   * Stop suppresses autonomous automatic sends until the user re-engages; a
   * user-initiated pending message IS that re-engagement, so it always sends.
   */
  pendingMessageUserInitiated?: boolean
  /** File path the user just edited in the editor — triggers auto-deletion of queued autofix messages. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check (same path may be edited multiple times). */
  userEditedFileKey?: number
  /**
   * Whether the current user is anonymous. The shared IDE no longer renders any
   * built-in sign-up/guest card itself — guest reminders now arrive as a `custom`
   * stream event the host registers via {@link registerCustomEventCard}, and upgrade
   * call-to-actions come from {@link ChatPanelProps.buildUpgradeCta}, and the host's own
   * `buildUpgradeCta` closure decides whether an anonymous user should sign up vs. upgrade.
   *
   * It IS read for one thing: a limit error the backend raised for an anonymous caller
   * (`requiresSignup`) is dropped once this is explicitly `false` — the viewer signed in
   * mid-session (the in-IDE auth modal never navigates, so the panel keeps running), and a
   * "create a free account for more" banner with dead-end Sign up / Log in buttons is stale
   * the moment they have an account. Leave it `undefined` and nothing is suppressed.
   */
  isAnonymous?: boolean
  /** When true, user has a paid plan and can use all models (drives locked-model display). */
  isPro?: boolean
  /**
   * Retained for call-site compatibility. The periodic "sign up to keep your work"
   * reminder is no longer generated client-side — the host's backend decides when to
   * emit it as a `guest_reminder` `custom` stream event (so it can be suppressed during
   * discovery server-side). This prop no longer drives any built-in behavior.
   * @deprecated Guest reminders moved to the host-emitted `custom` event + registry.
   */
  suppressGuestReminder?: boolean
  /**
   * Builds the call-to-action button(s) shown when the chat surfaces an upgrade /
   * sign-in nudge — a locked model the user can't select, or a usage/resource limit
   * the backend reported. The shared IDE owns NO pricing or auth routes, so the host
   * supplies the button(s) here (e.g. its own `/pricing` or `/signup`). Return
   * `null`/`undefined` (the default) to render the nudge text with no button.
   * `requiresSignup`, when set, is the backend's flag that the user must sign up
   * rather than upgrade an existing plan; when unset the host's own auth state decides.
   *
   * The rest of the context is the backend's own description of the limit that
   * fired, forwarded verbatim so the host never has to guess the right button:
   *
   * - `limitType` — the RULE the backend enforced (e.g. `usage_balance`,
   *   `spend_cap`, `ai_cost`, `max_tool_loops`).
   * - `billingAction` — the REMEDY the backend resolved (e.g. `sign_up`,
   *   `upgrade`, `add_payment_method`, `add_funds`, `raise_spend_cap`,
   *   `enable_extra_usage`, `contact_support`, `owner_only`, `none`). Prefer this
   *   over `limitType` when both are present: one limit can need different
   *   buttons per account (an empty balance is "Add funds" with a card on file
   *   and "Add a payment method" without one), and `none` means there is nothing
   *   the user can do — render no button.
   * - `upgradeTier` — the plan an upgrade would move to, explicitly `null` when
   *   there is no higher tier, so a top-tier user is never sent to a plans page
   *   with nothing to sell them.
   *
   * Both vocabularies belong to the host's API, so they are plain strings here —
   * the shared IDE never interprets them. Every field is optional and may be
   * absent (a backend that sends none of them keeps the old behavior), so the
   * host must have a fallback.
   */
  buildUpgradeCta?: (context: {
    requiresSignup?: boolean
    limitType?: string
    billingAction?: string
    upgradeTier?: string | null
  }) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /**
   * Optional app-specific section appended to the `/help` output — e.g. a plan /
   * upgrade blurb. The shared IDE has no pricing or plan copy, so the host supplies
   * the (already-localized) lines plus any call-to-action. Return `null` (the default)
   * to append nothing.
   */
  buildHelpUpgradeSection?: () =>
    { lines: string[]; action?: ChatEventCardAction | ChatEventCardAction[] } | null | undefined
  /**
   * The signed-in user's profile avatar (SOC1) — an inline `data:image/*` URI or
   * an `http(s)` URL — rendered beside their own messages in the chat timeline.
   * The host passes whatever value its user metadata holds; the shared IDE gates
   * it (`resolveUserAvatar`) so only a safe, renderable source reaches the DOM and
   * falls back to a generic icon otherwise. Omit it (the default) to always show
   * the icon.
   */
  userAvatar?: string | null
  /**
   * Display name of the AI coding agent, interpolated into all shared chat copy
   * that refers to it (the stalled-stream notice, sound-event descriptions, the
   * `/help` body, tips, `/settings` and command descriptions, the `/scripts`
   * empty state). The shared IDE owns NO product branding, so the host passes its
   * own agent brand name. Defaults to the neutral `'the assistant'`
   * (`DEFAULT_AGENT_NAME` from `@molecule/app-react`) so the package alone never
   * names a specific product.
   */
  agentName?: string
  /**
   * Display name of the host product / IDE, interpolated into shared chat copy
   * that refers to the product (the `/help` intro, the report-confirmation and
   * report-modal subheading, the command-menu version line). The host passes its
   * own product brand name; defaults to the neutral `'the IDE'`
   * (`DEFAULT_PRODUCT_NAME` from `@molecule/app-react`).
   */
  productName?: string
  /**
   * The host's current app/build version (e.g. `'0.1.0'`), shown in the `/version`
   * command's menu description and its output. The shared IDE has no build version
   * of its own, so when omitted it falls back to the package default constant.
   */
  version?: string
  /**
   * Host-specific slash commands to MERGE into the command menu, `/help`, and the
   * keyboard dispatcher, on top of the shared {@link COMMANDS} registry. For
   * commands the host handles itself (server-side intercepts or the agent), so
   * they show up in the menu instead of being invisible. Selecting one fills the
   * input with `/<id> ` (so the user can add arguments) and sending it routes to
   * the host's own handler — the shared package never dispatches these.
   *
   * The host owns keeping this list in sync with its handlers; molecule.dev, for
   * example, fetches it from `GET /ai/commands`. Ids must not collide with a
   * shared command id. Optional — omit for the plain shared command set.
   */
  extraCommands?: readonly CommandDef[]
  /**
   * URL the command-menu "Report a problem" link points at (the host's own issue
   * tracker / feedback page). The shared IDE owns no product URLs, so when this
   * is omitted (the default) the link is not rendered. The in-chat `/report`
   * modal — which POSTs to the project's own backend — is unaffected.
   */
  feedbackUrl?: string
  /**
   * Lists the project's tests for the `/test` browser. Omit it (the default)
   * and `/test` has nothing to show — the shared IDE owns no test-discovery
   * route of its own.
   *
   * molecule.dev implements it over `GET /projects/:id/tests`. It is called
   * on every `/test` invocation and once more when a run finishes, so a spec
   * the agent just wrote shows up the next time the browser is opened.
   */
  listTests?: () => Promise<TestList>
  /**
   * Runs the selected tests, streaming {@link TestRunEvent}s back as they
   * happen. Required alongside {@link ChatPanelProps.listTests} for the
   * browser's run controls to work.
   *
   * The returned handle's `cancel()` must stop the run (molecule.dev aborts the
   * SSE request, and the server kills the process tree on disconnect). The host
   * is responsible for running the e2e specs through the preview bond chain —
   * in a sandbox that means `npx playwright test` with
   * `@molecule/app-e2e-preview` as the browser, so the spec drives the live
   * preview rather than a browser binary that is not installed there.
   *
   * The run is owned by `ChatPanel`, not by the card, so it keeps streaming
   * while the browser is closed and is still there when it is re-opened.
   */
  runTests?: (selection: TestSelection, onEvent: (event: TestRunEvent) => void) => TestRunHandle
  /**
   * Subscribes to EVERY test run in the project, however it was started: the
   * Run buttons in any tab, the agent's test tool and its own shell test
   * commands, and the platform's checks. The host first replays the runs it
   * still holds, then streams new events; `ChatPanel` shows them in the same
   * tests bar and browser as its own runs, labelled by who started them, and
   * keeps Run disabled while one is live. Returns the unsubscribe function.
   *
   * The panel's own runs come back through the feed too; it recognises them by
   * `runId` and ignores the copy. molecule.dev implements it over
   * `GET /projects/:id/tests/runs` (server-sent events).
   */
  watchTestRuns?: (onEvent: (event: TestRunFeedEvent) => void) => () => void
  /** Host-owned durable native runs in the existing Tests browser and composer strip. */
  nativeTests?: {
    visible: boolean
    history: ReactNode
    renderStatus: (openTests: () => void) => ReactNode
  }
  /**
   * Whether this viewer may RUN tests. `false` still lets them open `/test`
   * and read what the project tests (the platform serves the listing to
   * viewers) but disables every run control and shows why. Defaults to
   * `canEdit !== false`.
   */
  canRunTests?: boolean
  /**
   * Whether the environment the tests run in is up — a running sandbox.
   * `false` makes `/test` say to start the project instead of listing an empty
   * browser or letting a Run click fail. Defaults to `true`.
   */
  testsAvailable?: boolean
  /**
   * Skip the executor's tool call that is running right now, without ending the
   * turn — the call comes back marked as skipped and the turn carries on. The
   * host owns the request; omitting this renders no Skip control on tool calls.
   * Resolving `false` means nothing was in flight, which is a benign race.
   */
  skipToolCall?: (toolCallId: string) => void | Promise<boolean | void>
  className?: string
}

/** Props for the {@link PreviewPanel} — the live app preview (iframe + device frame + URL bar). */
export interface PreviewPanelProps {
  /** Custom loading indicator shown while the dev server is starting. */
  loadingIndicator?: ReactNode
  /**
   * The current UI command the host wants performed in the preview iframe (AI-driven
   * end-to-end verification). The panel posts it to the iframe's interaction bridge when it
   * CHANGES (keyed on `id`, so each new command fires exactly once). The panel only relays it;
   * the host owns what to send and what to do with the result.
   */
  uiCommand?: PreviewUiCommand | null
  /** Called when the iframe replies to a {@link PreviewUiCommand}, keyed by the command `id`. */
  onUiResult?: (id: string, result: PreviewUiResult) => void
  /** Custom loading indicator shown when the dev server restarts mid-session. Falls back to loadingIndicator if not provided. */
  restartingIndicator?: ReactNode
  /** Called when the preview iframe reports runtime JS errors. */
  onPreviewError?: (
    errors: Array<{ message: string; source?: string; line?: number; column?: number }>,
  ) => void
  /** Incremented when AI edits files. Triggers an iframe reload only when the preview is broken. */
  fileChangeTick?: number
  /**
   * Active-build hint (e.g. a basename like `GuestMenu.tsx`) the host sets while the
   * AI is editing files. When non-null the overlay is forced on — covering the
   * blank-white iframe reload a build triggers — and shows "Updating `<hint>`…" so
   * the user sees what's being worked on. Null when no build edit is in flight.
   */
  buildingHint?: string | null
  /**
   * Whether the AI agent is actively building right now (a chat turn is in progress).
   * The host derives this from the chat's loading state. While true, the preview keeps a
   * "Building your app…" status overlay up whenever the app has NOT confirmed it rendered
   * content (no `molecule:ready`) — so a half-built / blank / white iframe during a long
   * build always shows progress instead of a bare white screen. A confirmed render still
   * reveals the live app (HMR updates stay visible), so this never hides a working preview.
   */
  isBuilding?: boolean
  /**
   * Timestamp (ms since epoch) of when the preview's backing server/sandbox was last
   * woken from sleep or restarted, or 0/undefined when it never was. While this is
   * recent, the panel treats the preview like a fresh cold boot: the dev server behind
   * it is restarting and recompiling, so a document that reloads to blank (or a
   * transient error page that never runs the bridge) is EXPECTED for a while and must
   * NOT trip the fast "preview is blank" accusation — the honest starting/loading
   * status stays up, and only the generous never-rendered ceiling can accuse. A real
   * render (`molecule:ready`) clears the patience immediately, so a healthy wake
   * reveals as fast as ever.
   */
  wakeAt?: number
  /**
   * Called when the preview gives up showing the running app — after exhausting reload
   * recovery, at the absolute readiness ceiling, OR when the heartbeat watchdog detects a
   * frozen (locked-thread) app. Receives a {@link PreviewStuckReport} (failure class +
   * route) so the host can drive recovery UI AND hand the agent an actionable, targeted
   * fix request. The argument is optional for backward compatibility with no-arg callers.
   */
  onPreviewStuck?: (report?: PreviewStuckReport) => void
  /**
   * Escalation hook: restart the BACKING dev server. The panel calls this at most
   * once per broken episode (long cooldown, never during a build) when client-side
   * recovery is provably useless: the server answers probes, at least one automatic
   * reload already ran, and the app has still never confirmed a render for minutes.
   * Document reloads cannot heal that class — e.g. a poisoned immutable module cache
   * keyed to the dev server's version hash (observed live 2026-08-31); only a server
   * restart mints new module URLs. Return (or resolve) `false` to DECLINE (wrong
   * role, hidden tab, sandbox not running, a turn active) — the panel then burns no
   * budget and may ask again later; any other result counts as "restart initiated".
   * Omit the prop to disable escalation entirely (the default for generic hosts).
   */
  onRestartBackend?: () => Promise<boolean | void> | boolean | void
  /**
   * Called when the preview's render verdict changes ({@link PreviewRenderState}) — and
   * with the current location so the host can report WHERE. The host forwards this to the
   * server so Synthase's post-loop verification can confirm the app actually rendered (not
   * just that it compiled + served) before calling a build done.
   */
  onRenderState?: (state: PreviewRenderState, url?: string) => void
  className?: string
}

// ---------------------------------------------------------------------------
// Sidebar tabs
// ---------------------------------------------------------------------------

/**
 * Properties for the sidebar tab switcher.
 */
export interface SidebarTabsProps {
  /** Currently active sidebar tab. */
  activeTab: 'files' | 'search'
  /** Called when the user switches tabs. */
  onTabChange: (tab: 'files' | 'search') => void
  /** Tab content rendered below the tab buttons. */
  children: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Quick picker (shared base)
// ---------------------------------------------------------------------------

/**
 * An item in the quick picker list.
 */
export interface QuickPickerItem {
  /** Unique identifier. */
  id: string
  /** Primary label. */
  label: string
  /** Secondary text shown beside the label. */
  detail?: string
  /** Optional icon element. */
  icon?: ReactNode
}

/**
 * Properties for the reusable quick picker overlay.
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
