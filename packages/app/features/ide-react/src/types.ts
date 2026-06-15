/**
 * Types for IDE React components.
 *
 * @module
 */

import type { ReactNode } from 'react'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { EditorTab, FixWithAIRequest } from '@molecule/app-code-editor'
import type { DeviceFrame } from '@molecule/app-live-preview'

import type { Activity as ActivityFromCard } from './components/activity-utilities.js'
import type { ChatEventCardAction } from './customEventCards.js'

/**
 * Properties for workspace layout.
 */
export interface WorkspaceLayoutProps {
  children: ReactNode
  className?: string
}

/**
 * Properties for chat panel.
 */
/**
 * A non-mutating UI action the AI agent asks the IDE to perform — reload or
 * navigate the live preview, or open a file in the editor. Delivered via the
 * `client_action` chat-stream event.
 */
export interface IdeClientAction {
  action: 'reload_preview' | 'navigate_preview' | 'open_file'
  /** navigate_preview: a URL path (e.g. "/dashboard"). open_file: a file path. */
  path?: string
}

/**
 * Identity of the user whose avatar was clicked in the chat timeline, passed to
 * {@link ChatPanelProps.onProfileClick} so the host can open that user's profile.
 *
 * Today the chat is solo — the only avatar shown is the signed-in user's own —
 * so the only known field is the avatar value. The interface is intentionally
 * forward-compatible: collaborator fields (id, name) can be added here when
 * multi-user chat lands, without changing the callback signature.
 */
export interface ChatUserIdentity {
  /** The clicked user's avatar value (data-URI / URL), if any. */
  avatar?: string | null
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
  /** Called after a successful commit — should refresh file explorer git status. */
  onCommit?: () => void
  /** Called when an inline activity card is clicked — should open the Activity panel filtered to this activity. */
  onActivityClick?: (activity: ActivityFromCard) => void
  /**
   * Called when a user avatar in the chat timeline is clicked — the host opens
   * that user's profile (e.g. molecule.dev's profile modal). Receives the clicked
   * user's {@link ChatUserIdentity}. Omit it (the default) to render the avatars
   * non-interactive (static image/icon, exactly as before). Only real user
   * avatars are clickable — the molecule glyph on auto-sent messages is not.
   */
  onProfileClick?: (user: ChatUserIdentity) => void
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
  /** File path the user just edited in the editor — triggers auto-deletion of queued autofix messages. */
  userEditedFile?: string
  /** Incremented to trigger the user-edit check (same path may be edited multiple times). */
  userEditedFileKey?: number
  /**
   * Whether the current user is anonymous. The shared IDE no longer renders any
   * built-in sign-up/guest card itself — guest reminders now arrive as a `custom`
   * stream event the host registers via {@link registerCustomEventCard}, and upgrade
   * call-to-actions come from {@link ChatPanelProps.buildUpgradeCta}. Retained so the
   * host can still pass it; the host's own `buildUpgradeCta` closure decides whether
   * an anonymous user should sign up vs. upgrade.
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
   */
  buildUpgradeCta?: (context: {
    requiresSignup?: boolean
  }) => ChatEventCardAction | ChatEventCardAction[] | null | undefined
  /**
   * Optional app-specific section appended to the `/help` output — e.g. a plan /
   * upgrade blurb. The shared IDE has no pricing or plan copy, so the host supplies
   * the (already-localized) lines plus any call-to-action. Return `null` (the default)
   * to append nothing.
   */
  buildHelpUpgradeSection?: () =>
    | { lines: string[]; action?: ChatEventCardAction | ChatEventCardAction[] }
    | null
    | undefined
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
   * URL the command-menu "Report a problem" link points at (the host's own issue
   * tracker / feedback page). The shared IDE owns no product URLs, so when this
   * is omitted (the default) the link is not rendered. The in-chat `/report`
   * modal — which POSTs to the project's own backend — is unaffected.
   */
  feedbackUrl?: string
  className?: string
}

/**
 * Properties for the editor panel component.
 */
export interface EditorPanelProps {
  className?: string
  /** Called whenever the active file changes (tab switch, file open, file close). */
  onActiveFileChange?: (path: string | null) => void
  /** Called once after the editor is fully mounted and ready to accept files. */
  onEditorReady?: () => void
  /** Called whenever the open tab list changes (file opened or closed). */
  onTabsChange?: (paths: string[]) => void
  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: Record<string, string>
  /** Path of the file currently being formatted, for visual indicator. */
  formattingFile?: string | null
  /** Path of the file with an active save debounce countdown. */
  countdownFile?: string | null
  /** Incremented each keystroke to restart the countdown animation. */
  countdownKey?: number
  /** Estimated format duration in ms (rolling average, default 2000). */
  formatEstimate?: number
  /** Called when the user triggers "Fix with AI" from the editor's lightbulb or context menu. */
  onFixWithAI?: (request: FixWithAIRequest) => void
  /** Override double-click on a tab. Return `true` to skip the default pin behavior. */
  onTabDoubleClick?: (path: string) => boolean
}

/**
 * Properties for preview panel.
 */
export interface PreviewPanelProps {
  /** Custom loading indicator shown while the dev server is starting. */
  loadingIndicator?: ReactNode
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
  /** Called when the preview fails to load after multiple recovery attempts. */
  onPreviewStuck?: () => void
  className?: string
}

/**
 * Properties for tab bar.
 */
export interface TabBarProps {
  tabs: EditorTab[]
  activeFile: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onDoubleClick?: (path: string) => void
  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: Record<string, string>
  className?: string
}

/**
 * Properties for file explorer.
 */
export interface FileExplorerProps {
  files: FileNode[]
  onFileSelect: (path: string) => void
  onFileDoubleClick?: (path: string) => void
  onDirExpand?: (path: string) => void
  /** Called when the user chooses "Rename" from the context menu. */
  onRename?: (path: string) => void
  /** Called when the user chooses "Delete" from the context menu. */
  onDelete?: (path: string) => void
  /** Called when the user deletes multiple selected files/folders via context menu or keyboard. */
  onDeleteMultiple?: (paths: string[]) => void
  /** Called when the user moves files via drag-and-drop or cut+paste. */
  onMoveFiles?: (moves: Array<{ oldPath: string; newPath: string }>) => void
  /** Called when the user chooses "New File" from the context menu. */
  onNewFile?: (dirPath: string) => void
  /** Called when the user chooses "New Folder" from the context menu. */
  onNewFolder?: (dirPath: string) => void
  /** Called when the user chooses "Collapse All" from the context menu. */
  onCollapseAll?: () => void
  className?: string
  /** localStorage key for persisting expand/collapse state across reloads. */
  persistKey?: string
  /** Path of the currently active file — highlighted in the tree. */
  activeFile?: string | null
  /** Maps file path to git status — used to color directory names by highest-priority child status. */
  fileStatuses?: Record<string, string>
}

/**
 * File Node interface.
 */
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  isDimmed?: boolean
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked'
  /** If this entry is a symlink, the target it points to. */
  symlinkTarget?: string
}

/**
 * Properties for resize handle.
 */
export interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
  className?: string
}

/**
 * Properties for device frame selector.
 */
export interface DeviceFrameSelectorProps {
  current: DeviceFrame
  onChange: (device: DeviceFrame) => void
  className?: string
}

/**
 * Properties for tool call card.
 */
export interface ToolCallCardProps {
  id: string
  name: string
  input?: unknown
  output?: unknown
  status: 'pending' | 'running' | 'done' | 'error'
  /** Snapshot of original/modified file content captured at tool-call time. */
  fileDiff?: { original: string; modified: string }
  /** Externally controlled undo state — when true, the card displays as undone. */
  isUndone?: boolean
  /** Called when the undo/redo button is toggled on this tool call. */
  onUndoToggle?: (id: string, undone: boolean) => void
  /** Called when a filename in the card is clicked — should open the file as a preview tab. */
  onFileOpen?: (path: string) => void
  /** Called when a filename in the card is double-clicked — should pin the tab. */
  onFileDoubleClick?: (path: string) => void
  /** Called when a file-changing card is clicked — should open the file diff in the editor. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Called to undo/redo a file change — writes the given content to the file path. */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Called when the user responds to an `ask_user` tool call (clicks an option or submits free text). */
  onAskUserResponse?: (response: string) => void
  className?: string
}

/**
 * Properties for the chat message item component.
 */
export interface ChatMessageItemProps {
  message: ChatMessage
  className?: string
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

/**
 * A keyboard shortcut definition.
 */
export interface KeyboardShortcut {
  /** Key combo string, e.g. `"mod+p"`, `"mod+shift+f"`. `mod` = Cmd (Mac) / Ctrl (others). */
  keys: string
  /** Handler invoked when the shortcut fires. */
  handler: () => void
  /** If true, fires even when an `<input>` / `<textarea>` is focused. */
  allowInInput?: boolean
  /** If true, fires even when the Monaco editor is focused. */
  allowInEditor?: boolean
  /** Human-readable label for display in the command palette. */
  label?: string
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
// Search panel
// ---------------------------------------------------------------------------

/**
 * Properties for the search-in-files panel.
 */
export interface SearchPanelProps {
  /** Project ID used for API calls. */
  projectId: string
  /** Called when the user clicks a search result. */
  onResultClick?: (path: string, line: number) => void
  className?: string
}

/**
 * A single file's search results.
 */
export interface SearchResult {
  /** Relative file path. */
  file: string
  /** Matching lines within the file. */
  matches: Array<{ line: number; content: string }>
}

/**
 * Response from the search API endpoint.
 */
export interface SearchResponse {
  /** The search pattern used. */
  pattern: string
  /** Grouped results by file. */
  results: SearchResult[]
  /** Total number of matches across all files. */
  totalCount: number
  /** Whether results were truncated. */
  truncated: boolean
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

// ---------------------------------------------------------------------------
// Quick open (file finder)
// ---------------------------------------------------------------------------

/**
 * Properties for the quick-open file finder.
 */
export interface QuickOpenProps {
  /** Project ID used for API calls. */
  projectId: string
  /** Called when the user selects a file. */
  onFileOpen: (path: string) => void
  /** Called when the picker is dismissed. */
  onDismiss: () => void
}

// ---------------------------------------------------------------------------
// Command palette
// ---------------------------------------------------------------------------

/**
 * A command available in the command palette.
 */
export interface Command {
  /** Unique identifier. */
  id: string
  /** Display label. */
  label: string
  /** Keyboard shortcut hint (e.g. "Cmd+P"). */
  shortcut?: string
  /** Handler invoked when the command is executed. */
  execute: () => void
  /** Category prefix (e.g. "View", "File"). */
  category?: string
}

/**
 * Properties for the command palette.
 */
export interface CommandPaletteProps {
  /** Available commands. */
  commands: Command[]
  /** Called when the palette is dismissed. */
  onDismiss: () => void
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts panel
// ---------------------------------------------------------------------------

/**
 * A shortcut entry for display in the keyboard shortcuts panel.
 */
export interface ShortcutEntry {
  /** Human-readable label describing the action. */
  label: string
  /** Display string for the key combo (e.g. "⌘P", "⌘⇧F"). */
  keys: string
  /** Optional grouping category. */
  category?: string
  /** Handler invoked when the row is clicked. */
  execute?: () => void
}

/**
 * Properties for the keyboard shortcuts reference panel.
 */
export interface KeyboardShortcutsPanelProps {
  /** List of shortcuts to display. */
  shortcuts: ShortcutEntry[]
  /** Called when the panel is dismissed. */
  onDismiss: () => void
}
