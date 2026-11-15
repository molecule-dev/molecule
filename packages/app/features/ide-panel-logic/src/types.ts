/**
 * Framework-neutral types for the IDE panels (chat, preview, file explorer,
 * tests) — shared by every framework's IDE package. Interfaces whose members
 * are framework render nodes stay in each framework's IDE package.
 *
 * @module
 */

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { EditorTab, FixWithAIRequest } from '@molecule/app-code-editor'
import type { DeviceFrame } from '@molecule/app-live-preview'

/**
 * Properties for chat panel.
 */
/**
 * A non-mutating UI action the AI agent asks the IDE to perform — reload or
 * navigate the live preview, open a file in the editor, or drive the preview's
 * interaction bridge (`preview_ui`). Delivered via the `client_action`
 * chat-stream event (and, for `preview_ui`, also via the host's collab socket
 * so a mid-build tab reload can't orphan it).
 */
export interface IdeClientAction {
  action: 'reload_preview' | 'navigate_preview' | 'open_file' | 'preview_ui'
  /** navigate_preview: a URL path (e.g. "/dashboard"). open_file: a file path. */
  path?: string
  /** preview_ui: correlates the command with its ui-result round-trip. */
  requestId?: string
  /** preview_ui: the interaction the preview bridge should perform. */
  command?: 'snapshot' | 'click' | 'fill' | 'select' | 'waitFor'
  /** preview_ui: the `data-mol-id` of the target element (preferred). */
  molId?: string
  /** preview_ui: CSS-selector fallback when no molId is available. */
  selector?: string
  /** preview_ui: visible-label match for apps whose elements carry no molId. */
  text?: string
  /** preview_ui: value to set for fill/select. */
  value?: string
}

/**
 * Identity of the user whose avatar or name was clicked in the chat timeline,
 * passed to {@link ChatPanelProps.onProfileClick} so the host can open that
 * user's profile.
 *
 * The identity is always the clicked MESSAGE AUTHOR's — a teammate's click
 * carries their persisted `author` fields, never the viewer's. An author-less
 * message (the local optimistic echo, legacy solo rows) is the signed-in user's
 * own, so it carries {@link ChatPanelProps.currentUserId} + the viewer's avatar.
 * The host compares `id` against the signed-in user to pick the surface: own →
 * editable profile, someone else → view-only. A missing `id` means "the
 * signed-in user" (author-less rows in a host that passes no `currentUserId`).
 */
export interface ChatUserIdentity {
  /** The clicked user's stable id (a persisted `author.id`), when known. */
  id?: string
  /** The clicked user's display name (a persisted `author.name`), when known. */
  name?: string
  /** The clicked user's avatar value (data-URI / URL), if any. */
  avatar?: string | null
}

/**
 * Which project directory a test file belongs to: the directory that OWNS the
 * file (the nearest ancestor holding the runner's config or a `package.json`),
 * as a path relative to the workspace root — `app`, `api`, `my-app/app`,
 * `packages/web` — or `.` for the workspace root itself. Nothing guarantees
 * `app/` or `api/` at the root: the executor names its project directory, so
 * the value is a path, not an enum.
 */
export type TestWorkspace = 'app' | 'api' | '.' | (string & {})

/**
 * What a test file is: an end-to-end spec driven against the LIVE PREVIEW (the
 * `@molecule/app-e2e-preview` bond every scaffolded app carries), or a plain
 * unit test run by the project's own runner.
 */
export type TestKind = 'e2e' | 'unit'

/** One test file the host discovered in the project. */
export interface TestItem {
  /** Stable id, unique across workspaces — used as the row key and to select by. */
  id: string
  /** Path relative to its workspace, e.g. `e2e/home.spec.ts`. */
  file: string
  kind: TestKind
  workspace: TestWorkspace
  /**
   * The group's project name, ready to render: the same path as `workspace`,
   * or `null` for the workspace root, which has no name of its own. Hosts that
   * omit it get the path itself (and the translated "Project" for the root).
   */
  workspaceLabel?: string | null
  /** Human label for the row; the bar falls back to the file path without one. */
  title?: string
}

/** Which runner drives each kind in one workspace (`null` = none installed). */
export interface TestRunners {
  e2e: string | null
  unit: string | null
}

/** What {@link ChatPanelProps.listTests} resolves with. */
export interface TestList {
  tests: TestItem[]
  /**
   * Per project directory (keyed like {@link TestItem.workspace}), the runners
   * the host found. Only directories that hold a listed test appear.
   */
  runners: Record<string, TestRunners>
}

/** What the bar asks the host to run. */
export interface TestSelection {
  /** Specific {@link TestItem.id}s. Takes precedence over `kind`. */
  ids?: string[]
  /** Everything of this kind when no `ids` are given. */
  kind?: TestKind | 'all'
}

/** How one test file ended. */
export type TestStatus = 'passed' | 'failed' | 'skipped'

/**
 * How one TEST inside a file is doing: the three verdicts a file can end with,
 * plus `running` — the state a file never reports, because a file is only ever
 * seen finished.
 */
export type TestCaseStatus = TestStatus | 'running'

/**
 * How a whole run ended. `skipped-by-user` is a run that otherwise finished but
 * had at least one command skipped from the card — deliberately its OWN outcome
 * rather than `completed` plus a count, so nothing can read a run with skipped
 * work in it as a clean pass. A real failure still wins: `error`, `timeout` and
 * `cancelled` take precedence over it.
 */
export type TestRunOutcome = 'completed' | 'cancelled' | 'timeout' | 'error' | 'skipped-by-user'

/**
 * One event from a run in progress. The host streams these to the bar (over SSE
 * in molecule.dev) in the order the run produces them: one `start`, then
 * interleaved `output`/`case`/`result`, then exactly one `done`.
 */
export type TestRunEvent = (
  | {
      type: 'start'
      runId: string
      ids: string[]
      startedAt?: string
      /** Who started the run — what the test view says about a run it did not start. */
      source?: TestRunSource
      /**
       * The command a run the test view did not start is running (masked by the
       * host). An agent's own command names no test ids up front, so this is
       * what the view can show while its results arrive.
       */
      command?: string
    }
  | { type: 'output'; id?: string; stream?: 'stdout' | 'stderr'; chunk: string }
  /**
   * One TEST within a file — the runner's own title and group, so the person
   * watching a five-minute spec run sees WHICH test is on screen instead of a
   * spinner. `id` is the same file id `result` uses.
   */
  | {
      type: 'case'
      id: string
      title: string
      describe?: string
      status: TestCaseStatus
      durationMs?: number
    }
  | {
      type: 'result'
      id: string
      status: TestStatus
      durationMs?: number
      passed?: number
      failed?: number
      skipped?: number
      /** The runner's output for a FAILURE, which the bar keeps visible. */
      output?: string
    }
  | {
      type: 'done'
      runId?: string
      outcome: TestRunOutcome
      passed?: number
      failed?: number
      skipped?: number
      durationMs?: number
      error?: string
    }
) & {
  /** Server order on the direct stream too; optional only for older/custom hosts. */
  eventId?: string
}

/**
 * Who started a test run: the person (the Run buttons, in this tab or another),
 * the agent (its test tool or its own shell commands), or the platform (its
 * checks of a deploy).
 */
export type TestRunSource = 'person' | 'agent' | 'platform'

/**
 * One event of the project's test-run feed: any {@link TestRunEvent}, stamped
 * with the run it belongs to, since the feed interleaves every run in the
 * project.
 */
export type TestRunFeedEvent = TestRunEvent & { runId: string }

/** Handle to a run in flight, so the bar can stop it. */
export interface TestRunHandle {
  /** Stop the run — the host aborts its stream, which cancels the work. */
  cancel(): void
  /**
   * Skip the command the run is on right now WITHOUT ending the run: the files
   * that command owned come back as `result`s with `status: 'skipped'`, and the
   * run moves to the next command.
   *
   * Optional, because a host may not serve it. Resolving `false` means there
   * was nothing to skip (the run had already moved on) — a benign race the card
   * answers by dropping the control, never by showing an error.
   */
  skipCurrent?(): void | Promise<boolean | void>
}

/**
 * Properties for the editor panel component.
 */
export interface EditorPanelProps {
  className?: string
  /**
   * Render the editor read-only (Monaco `readOnly`) — for read-only project
   * VIEWERS, whose file writes the server rejects anyway. Typing is blocked at
   * the editor, so a viewer never composes an edit that cannot be saved.
   */
  readOnly?: boolean
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
 * Why the preview could not show the running app — the failure CLASS the host hands
 * to its AI agent so a fix can be targeted (and so the agent isn't told "it's broken"
 * with no hint of how). Distinct from a JS error (`onPreviewError`): these are states
 * the iframe itself can't report once it's in them.
 */
export type PreviewStuckReason =
  // Heartbeats stopped after a render — the app's main thread is locked (an infinite
  // loop / runaway render). The iframe can post nothing else once frozen, so only the
  // host's heartbeat-silence watchdog can detect it.
  | 'frozen'
  // Repeated reload/remount cycles never produced a confirmed render — the document
  // loads but the app never mounts (e.g. a route that throws on every attempt).
  | 'load-failed'
  // The absolute readiness ceiling elapsed with no confirmed render and no active
  // build — a catch-all backstop so the preview can never spin forever.
  | 'load-timeout'

/**
 * Structured report passed to {@link PreviewPanelProps.onPreviewStuck} when the preview
 * gives up. Carries the failure class + the route it happened on so the host can compose
 * an actionable, agent-fixable message instead of a bare "preview is stuck".
 */
export interface PreviewStuckReport {
  /** The failure class — what left the preview unable to show the running app. */
  reason: PreviewStuckReason
  /** The preview's current location (route) when the failure was detected, if known. */
  url?: string
}

/**
 * The preview's live render verdict, derived from the iframe bridges — the one preview
 * fact the server can't observe itself (it has no browser). The host forwards it to the
 * server so the post-loop verification won't pass a build while the app isn't actually
 * rendering ("compiles + serves" ≠ "renders").
 *
 * - `rendered` — the app drew content (`molecule:ready`).
 * - `blank` — loaded but showed nothing (gave up / `#root` empty after settling).
 * - `frozen` — rendered then locked up (heartbeats stopped).
 * - `loading` — still loading / not yet determined.
 */
export type PreviewRenderState = 'rendered' | 'blank' | 'frozen' | 'loading'

/**
 * Properties for preview panel.
 */
/**
 * A live-preview interaction the host asks the panel to perform inside the iframe, so an AI
 * agent can verify a feature end-to-end by DRIVING the app the user is watching (no headless
 * browser). The panel just relays it to the iframe's interaction bridge — generic, so it
 * carries no host/API specifics.
 */
export interface PreviewUiCommand {
  /** Correlates this command with its result; the host round-trips on it. */
  id: string
  /** `snapshot` the interactive UI, or act on an element. */
  action: 'snapshot' | 'click' | 'fill' | 'select' | 'waitFor'
  /** `data-mol-id` of the target element (preferred over selector). */
  molId?: string
  /** CSS-selector fallback when no molId is available. */
  selector?: string
  /** Visible-label match — targets apps whose elements carry no `data-mol-id`. */
  text?: string
  /** Value to set for `fill` / `select`. */
  value?: string
  /**
   * `snapshot` only — the moment the host pointed the preview at a new URL (`Date.now()`).
   * Only a document that loaded at or after it may answer, so a navigation snapshot can never
   * come from the OUTGOING page still sitting in the iframe. Set it ONLY when a new document
   * is genuinely loading (the URL actually changed) — otherwise nothing can satisfy it and the
   * command goes unanswered. Omit for a plain read.
   */
  minLoadedAt?: number
}

/** The preview interaction bridge's reply to a {@link PreviewUiCommand}. */
export interface PreviewUiResult {
  ok: boolean
  /** Interactive-element list + url/title from the preview (present on a snapshot / success). */
  snapshot?: unknown
  found?: boolean
  error?: string
  /**
   * Failed network requests from the last ~10s (method, url, status, bounded response body),
   * captured in-page — so a click that 4xx'd explains itself in the same result.
   */
  recentNetworkErrors?: string[]
  /**
   * Present when the bridge gave up on a settle budget instead of observing the page settle —
   * it names what was still pending (document parsing, an empty root, an unreached route,
   * in-flight requests). The snapshot may be incomplete, so a race stays distinguishable from
   * a genuinely broken page.
   */
  stillSettling?: string
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
  /**
   * Read-only mode (a project viewer): the context menu omits every mutating
   * entry. Pair with omitting the mutation handlers (onRename/onDelete/…) so
   * keyboard shortcuts and drag-moves no-op too.
   */
  readOnly?: boolean
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
  /** Storage key for persisting expand/collapse state across reloads (through `@molecule/app-storage`). */
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
  /**
   * Skip this tool call while it is RUNNING, without ending the turn: the call
   * comes back as skipped, the model is told it did not run, and the turn
   * carries on. Omitted by a host that does not serve it — then no control is
   * rendered at all. Resolving `false` means nothing was in flight (the call
   * had already finished), which returns the button to its resting state rather
   * than reporting an error.
   */
  onSkip?: (id: string) => void | Promise<boolean | void>
  /**
   * Why skipping is unavailable to THIS viewer, already translated by the host
   * — `null` when it is available. The control stays visible and disabled with
   * the reason on it, rather than vanishing without explanation.
   */
  skipDisabledReason?: string | null
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
  /**
   * The project's excluded directory names (VS Code `search.exclude`
   * semantics). Displayed and editable in the panel; the backend applies the
   * SAME set server-side to every search surface (panel + AI tools), so this
   * prop is display/edit state — searches don't send it per query. When
   * omitted, the panel shows {@link DEFAULT_SEARCH_EXCLUDED_DIRS}.
   */
  excludedDirs?: string[]
  /** Persist an edited excluded-dir set (the host owns storage). */
  onExcludedDirsChange?: (dirs: string[]) => void
  /**
   * Read-only mode (a project viewer): search stays fully usable, but the
   * Replace toggle/inputs/buttons are hidden (bulk writes are editor work).
   * Pair with omitting onExcludedDirsChange so exclude edits never persist.
   */
  readOnly?: boolean
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
