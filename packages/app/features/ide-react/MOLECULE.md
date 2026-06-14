# @molecule/app-ide-react

`@molecule/app-ide-react` — React IDE components for an AI-powered workspace.

## Quick Start

```tsx
import { ChatPanel, EditorPanel, PreviewPanel, WorkspaceLayout } from '@molecule/app-ide-react'

<WorkspaceLayout>
  <ChatPanel
    projectId="proj_abc123"
    onFileOpen={(path) => openTab(path)}
    onFileChange={(path, content) => refreshEditor(path, content)}
    onReadyToBuild={() => bootSandbox()}
  />
  <EditorPanel
    onActiveFileChange={(path) => setActiveFile(path)}
    onFixWithAI={(req) => sendFixRequest(req)}
  />
  <PreviewPanel onPreviewError={(errs) => console.error(errs)} />
</WorkspaceLayout>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-ide-react
```

## API

### Interfaces

#### `Activity`

A single captured activity. Mirrors the SSE `activity.activity` payload; the
REST list endpoint additionally returns `payload` and `result` for the
expanded detail view.

```typescript
interface Activity {
  id: string
  type: ActivityType
  status: ActivityStatus
  recipient?: string
  summary?: string
  /** ISO 8601 timestamp. */
  timestamp: string
  /** Full captured payload — only present on the REST detail response (dev only). */
  payload?: unknown
  /** Provider result / synthetic success record — only present on the REST detail response. */
  result?: unknown
}
```

#### `ActivityCardProps`

Props for the inline {@link ActivityCard}.

```typescript
interface ActivityCardProps {
  /** The captured activity to render. */
  activity: Activity
  /** Called when the card is clicked — should open the Activity panel filtered to this activity. */
  onActivityClick?: (activity: Activity) => void
}
```

#### `ChatEventCard`

A chat system card: a short message with an optional action (or actions). Mirrors
the system-card shape ChatPanel renders for upgrade prompts, guest reminders, etc.

```typescript
interface ChatEventCard {
  /** The card's text. */
  text: string
  /** An optional action button (or buttons): a link (`href`) and/or a click handler. */
  action?: ChatEventCardAction | ChatEventCardAction[]
  /**
   * Composable inline body for a `tone` (tip) card: an ordered list of segments rendered
   * in sequence — plain strings as text, {@link ChatEventCardAction}s as inline underlined
   * links — so prose and links interleave freely (e.g. text → an inline link → a trailing
   * period). When set, the renderer uses this INSTEAD of `text` + appended `action`s, so a
   * link can sit mid-sentence rather than only at the end. Segments carry their own spacing
   * (no auto-space is inserted between them). Keep `text` populated with a plain-text
   * equivalent for accessibility / non-toned consumers. Only honored when `tone` is set.
   */
  content?: ChatEventCardSegment[]
  /**
   * When true, ChatPanel renders the card in its emphasized (highlighted box) style
   * instead of the muted inline style — e.g. a sign-up / upgrade nudge the app wants
   * to stand out. The app opts in; the shared package never infers emphasis from a
   * card's route or copy.
   */
  emphasized?: boolean
  /**
   * Optional tip-style tone: `'info'` (blue) or `'gold'`. When set, ChatPanel renders
   * the card in the dismissable tip-box style (rounded, tinted, with a lightbulb glyph)
   * in that tone, and renders any `action`(s) as inline underlined links rather than
   * buttons — for low-key, honest notices (e.g. a "what powers this" model note). The
   * app opts in; omit for the default muted / emphasized styles.
   */
  tone?: 'info' | 'gold'
}
```

#### `ChatEventCardAction`

A single call-to-action on a chat card: a labelled link (`href`) and/or click
handler. The app supplies any route/copy — the shared package never hardcodes one.

```typescript
interface ChatEventCardAction {
  /** Button label (already localized by the app). */
  label: string
  /** Link target. App-owned — e.g. the host's own pricing/auth route. */
  href?: string
  /** Click handler (alternative to, or alongside, `href`). */
  onClick?: () => void
}
```

#### `ChatMessageItemProps`

Properties for the chat message item component.

```typescript
interface ChatMessageItemProps {
  message: ChatMessage
  className?: string
}
```

#### `ChatPanelProps`

Props for the {@link ChatPanel} component — the IDE chat surface plus the
callbacks the host app uses to react to AI activity (file changes, boot, client
actions, etc.).

```typescript
interface ChatPanelProps {
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
```

#### `Command`

A command available in the command palette.

```typescript
interface Command {
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
```

#### `CommandCategory`

A command category with its display label.

```typescript
interface CommandCategory {
  /** Stable category key referenced by {@link CommandDef.category}. */
  key: CommandCategoryKey
  /** Human-readable category heading (English default; wrapped in `t()` at render). */
  label: string
}
```

#### `CommandDef`

Metadata describing a single slash command.

```typescript
interface CommandDef {
  /** Command id (the part after the slash, e.g. `'help'`). */
  id: string
  /** Display label including the leading slash (e.g. `'/help'`). */
  label: string
  /**
   * Short description shown in the menu and in `/help` (English default). May
   * contain the `{{agentName}}` interpolation token, filled in by the render
   * sites (command menu, `/help`, `/settings` card) from the host's agent
   * identity (neutral default: "the assistant").
   */
  description: string
  /** Category this command is grouped under. */
  category: CommandCategoryKey
  /**
   * Argument syntax for commands that take options, shown in the `/settings`
   * command reference (English default). `[…]` = optional, `<…>` = required.
   * Omit for commands that take no arguments.
   */
  usage?: string
}
```

#### `CommandGroup`

A category paired with the commands that belong to it.

```typescript
interface CommandGroup {
  /** The category metadata (key + label). */
  category: CommandCategory
  /** Commands in this category, in registry order. */
  commands: CommandDef[]
}
```

#### `CommandPaletteProps`

Properties for the command palette.

```typescript
interface CommandPaletteProps {
  /** Available commands. */
  commands: Command[]
  /** Called when the palette is dismissed. */
  onDismiss: () => void
}
```

#### `DeviceFrameSelectorProps`

Properties for device frame selector.

```typescript
interface DeviceFrameSelectorProps {
  current: DeviceFrame
  onChange: (device: DeviceFrame) => void
  className?: string
}
```

#### `EditorPanelProps`

Properties for the editor panel component.

```typescript
interface EditorPanelProps {
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
```

#### `FileExplorerProps`

Properties for file explorer.

```typescript
interface FileExplorerProps {
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
```

#### `FileNode`

File Node interface.

```typescript
interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  isDimmed?: boolean
  gitStatus?: 'modified' | 'added' | 'deleted' | 'untracked'
  /** If this entry is a symlink, the target it points to. */
  symlinkTarget?: string
}
```

#### `IconProps`

Props for {@link Icon}. Extends `SVGProps` so callers can forward any SVG/HTML
attribute (`data-mol-id`, `aria-*`, `role`, event handlers, `style`) to the
root `<svg>` without the component enumerating them.

```typescript
interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  'width' | 'height' | 'viewBox' | 'fill'
> {
  /** Name of the glyph to look up in the bonded icon set (e.g. `'sync'`). */
  name: string
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}
```

#### `IdeClientAction`

A non-mutating UI action the AI agent asks the IDE to perform — reload or
navigate the live preview, or open a file in the editor. Delivered via the
`client_action` chat-stream event.

```typescript
interface IdeClientAction {
  action: 'reload_preview' | 'navigate_preview' | 'open_file'
  /** navigate_preview: a URL path (e.g. "/dashboard"). open_file: a file path. */
  path?: string
}
```

#### `KeyboardShortcut`

A keyboard shortcut definition.

```typescript
interface KeyboardShortcut {
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
```

#### `KeyboardShortcutsPanelProps`

Properties for the keyboard shortcuts reference panel.

```typescript
interface KeyboardShortcutsPanelProps {
  /** List of shortcuts to display. */
  shortcuts: ShortcutEntry[]
  /** Called when the panel is dismissed. */
  onDismiss: () => void
}
```

#### `PreviewPanelProps`

Properties for preview panel.

```typescript
interface PreviewPanelProps {
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
```

#### `QuickOpenProps`

Properties for the quick-open file finder.

```typescript
interface QuickOpenProps {
  /** Project ID used for API calls. */
  projectId: string
  /** Called when the user selects a file. */
  onFileOpen: (path: string) => void
  /** Called when the picker is dismissed. */
  onDismiss: () => void
}
```

#### `QuickPickerItem`

An item in the quick picker list.

```typescript
interface QuickPickerItem {
  /** Unique identifier. */
  id: string
  /** Primary label. */
  label: string
  /** Secondary text shown beside the label. */
  detail?: string
  /** Optional icon element. */
  icon?: ReactNode
}
```

#### `QuickPickerProps`

Properties for the reusable quick picker overlay.

```typescript
interface QuickPickerProps {
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
```

#### `ResizeHandleProps`

Properties for resize handle.

```typescript
interface ResizeHandleProps {
  onResize: (delta: number) => void
  direction?: 'horizontal' | 'vertical'
  className?: string
}
```

#### `SearchPanelProps`

Properties for the search-in-files panel.

```typescript
interface SearchPanelProps {
  /** Project ID used for API calls. */
  projectId: string
  /** Called when the user clicks a search result. */
  onResultClick?: (path: string, line: number) => void
  className?: string
}
```

#### `SearchResponse`

Response from the search API endpoint.

```typescript
interface SearchResponse {
  /** The search pattern used. */
  pattern: string
  /** Grouped results by file. */
  results: SearchResult[]
  /** Total number of matches across all files. */
  totalCount: number
  /** Whether results were truncated. */
  truncated: boolean
}
```

#### `SearchResult`

A single file's search results.

```typescript
interface SearchResult {
  /** Relative file path. */
  file: string
  /** Matching lines within the file. */
  matches: Array<{ line: number; content: string }>
}
```

#### `ShortcutEntry`

A shortcut entry for display in the keyboard shortcuts panel.

```typescript
interface ShortcutEntry {
  /** Human-readable label describing the action. */
  label: string
  /** Display string for the key combo (e.g. "⌘P", "⌘⇧F"). */
  keys: string
  /** Optional grouping category. */
  category?: string
  /** Handler invoked when the row is clicked. */
  execute?: () => void
}
```

#### `SidebarTabsProps`

Properties for the sidebar tab switcher.

```typescript
interface SidebarTabsProps {
  /** Currently active sidebar tab. */
  activeTab: 'files' | 'search'
  /** Called when the user switches tabs. */
  onTabChange: (tab: 'files' | 'search') => void
  /** Tab content rendered below the tab buttons. */
  children: ReactNode
  className?: string
}
```

#### `TabBarProps`

Properties for tab bar.

```typescript
interface TabBarProps {
  tabs: EditorTab[]
  activeFile: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onDoubleClick?: (path: string) => void
  /** Maps file path to git status for coloring tab filenames. */
  fileStatuses?: Record<string, string>
  className?: string
}
```

#### `ToolCallCardProps`

Properties for tool call card.

```typescript
interface ToolCallCardProps {
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
```

#### `UserAvatarProps`

Props for {@link UserAvatar}.

```typescript
interface UserAvatarProps {
  /**
   * The signed-in user's avatar — an inline `data:image/*` URI or an `http(s)`
   * URL from their profile metadata. Unsafe / unset / oversized values are
   * ignored (see {@link resolveUserAvatar}) and the generic icon is shown.
   */
  userAvatar?: string | null
  /** Diameter of the avatar in pixels. Defaults to 24. */
  size?: number
}
```

#### `WorkspaceLayoutProps`

Properties for workspace layout.

```typescript
interface WorkspaceLayoutProps {
  children: ReactNode
  className?: string
}
```

### Types

#### `ActivityStatus`

Lifecycle status of a captured activity.

```typescript
type ActivityStatus = 'captured' | 'sent' | 'delivered' | 'failed'
```

#### `ActivityType`

Channel categories a captured activity can belong to.

```typescript
type ActivityType = 'email' | 'sms' | 'push' | 'webhook' | 'channel'
```

#### `ChatEventCardFactory`

Turns a custom event's `data` payload into a chat card, or returns null to render
nothing for that event.

```typescript
type ChatEventCardFactory = (
  data: Record<string, unknown> | undefined,
) => ChatEventCard | null
```

#### `ChatEventCardSegment`

One inline segment of a toned tip card's composable body: either literal text, or a
labelled link/action ({@link ChatEventCardAction}). See {@link ChatEventCard.content}.

```typescript
type ChatEventCardSegment = string | ChatEventCardAction
```

#### `CommandCategoryKey`

Category keys used to group commands in the menu and in `/help`.

```typescript
type CommandCategoryKey =
  | 'context'
  | 'code'
  | 'collaborate'
  | 'model'
  | 'settings'
  | 'support'
```

#### `CommandId`

Union of all command ids (loosely `string`, since {@link CommandDef.id} is a string).

```typescript
type CommandId = CommandDef['id']
```

### Functions

#### `ActivityCard(root0, root0, root0)`

Compact, clickable inline card for a single captured activity.

```typescript
function ActivityCard({ activity, onActivityClick }: ActivityCardProps): JSX.Element
```

- `root0` — Component props.
- `root0` — .activity - The captured activity to render.
- `root0` — .onActivityClick - Callback fired when the card is clicked.

**Returns:** The rendered activity card element.

#### `activityFromEvent(raw, raw, raw, raw, raw, raw, raw)`

Maps a raw SSE `activity` event payload into a normalized {@link Activity}.
Tolerates missing optional fields and supplies an id/timestamp if absent.

```typescript
function activityFromEvent(raw: { id?: string; type?: string; status?: string; recipient?: string; summary?: string; timestamp?: string; }): Activity
```

- `raw` — The `activity` field from the SSE event.
- `raw` — .id - Activity id; generated if absent.
- `raw` — .type - Channel type; defaults to `webhook` if absent.
- `raw` — .status - Lifecycle status; defaults to `captured` if absent.
- `raw` — .recipient - Optional recipient.
- `raw` — .summary - Optional short summary.
- `raw` — .timestamp - ISO timestamp; defaults to now if absent.

**Returns:** A normalized Activity object.

#### `activityIconName(type)`

Returns the bonded-icon-set glyph NAME for an activity type — pass it to
`<Icon name={…} />` to render the themed SVG. Unknown/future types (which
{@link activityFromEvent} normalizes to `webhook`) reuse the `link` glyph
rather than risk a `getIcon` throw.

```typescript
function activityIconName(type: ActivityType): string
```

- `type` — The activity channel type.

**Returns:** The icon-set glyph name for the type.

#### `activityStatusColors(status)`

Resolves the status-pill colors for a given status. Uses RGBA literals (not
ClassMap classes) because these semantic status hues are not part of the
surface/text token set — the same approach `VerificationBadge` takes for its
pass/fail coloring.

```typescript
function activityStatusColors(status: ActivityStatus): { fg: string; bg: string; }
```

- `status` — The activity status.

**Returns:** An object with `fg` (text) and `bg` (background) CSS color strings.

#### `activityStatusLabel(status)`

Human-readable, translated label for a status (shown in the status pill).

```typescript
function activityStatusLabel(status: ActivityStatus): string
```

- `status` — The activity status.

**Returns:** The translated status label.

#### `activitySummaryLine(activity)`

Builds the one-line summary shown on the inline card: the activity's own
summary, with the recipient appended after an arrow when present
(e.g. `Welcome email → user@example.com`). Falls back to a translated,
type-specific default when no summary was captured.

```typescript
function activitySummaryLine(activity: Pick<Activity, "type" | "recipient" | "summary">): string
```

- `activity` — The activity to summarize.

**Returns:** The single-line summary string.

#### `activityTypeLabel(type)`

Human-readable, translated label for a channel type (used as filter-tab labels).

```typescript
function activityTypeLabel(type: ActivityType): string
```

- `type` — The activity channel type.

**Returns:** The translated channel label.

#### `ChatPanel(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

AI chat panel with conversation history dropdown and Claude Code-style tool display.

```typescript
function ChatPanel({
  projectId,
  endpoint,
  initialMessage,
  onInitialMessageSent,
  activeFile,
  openTabs,
  onFileOpen,
  onFileDoubleClick,
  onFileDiff,
  onFileRevert,
  onFileChange,
  onFileDeleted,
  onCommit,
  onActivityClick,
  onReadyToBuild,
  awaitingSandboxBoot,
  onClientAction,
  onTurnComplete,
  autoSubmitSignal,
  initialInputValue,
  hideConversationMenu,
  gitStatusTick,
  pendingMessage,
  pendingMessageKey,
  pendingMessageSuppressUser,
  userEditedFile,
  userEditedFileKey,
  isPro,
  buildUpgradeCta,
  buildHelpUpgradeSection,
  userAvatar,
  agentName,
  productName,
  feedbackUrl,
  className,
}: ChatPanelProps): JSX.Element
```

- `root0` — Component props.
- `root0` — .projectId - The project ID for the chat session.
- `root0` — .endpoint - Optional custom chat API endpoint URL.
- `root0` — .initialMessage - Optional initial message to auto-send on mount.
- `root0` — .onInitialMessageSent - Callback fired after the initial message is sent.
- `root0` — .activeFile - Path of the currently focused file in the editor.
- `root0` — .openTabs - Paths of all open editor tabs.
- `root0` — .onFileOpen - Callback to preview a file in the editor.
- `root0` — .onFileDoubleClick - Callback to pin a file tab in the editor.
- `root0` — .onFileDiff - Callback to open a side-by-side diff view.
- `root0` — .onFileRevert - Callback to revert a file to previous content.
- `root0` — .onFileChange - Callback when a file's content changes from AI edits.
- `root0` — .onFileDeleted - Callback fired when a file is deleted.
- `root0` — .onCommit - Callback fired after a successful commit.
- `root0` — .onActivityClick - Callback to open the Activity panel filtered to a clicked activity card.
- `root0` — .onReadyToBuild - Callback fired on the ready_to_build stream event to boot the sandbox.
- `root0` — .onClientAction - Callback fired on the client_action stream event (reload/navigate preview, open file).
- `root0` — .onTurnComplete - Callback fired on each stream done/error; host uses it to keep the boot view up until the during-boot plan stream completes.
- `root0` — .autoSubmitSignal - Changing this submits the current input draft (prompt→chat morph).
- `root0` — .initialInputValue - Seeds the input with this text on mount (prompt→chat morph).
- `root0` — .hideConversationMenu - Hide the conversation-selector header (e.g. during discovery).
- `root0` — .gitStatusTick - Counter that increments when git status changes.
- `root0` — .pendingMessage - An externally triggered message to send.
- `root0` — .pendingMessageKey - Key to distinguish repeated pending messages.
- `root0` — .pendingMessageSuppressUser - When true, send the pending message without rendering a user bubble (auto-sent build kickoff).
- `root0` — .userEditedFile - File path the user just edited — auto-deletes queued autofix messages referencing it.
- `root0` — .userEditedFileKey - Key to distinguish repeated edits to the same file.
- `root0` — .isPro - Whether the current user has a Pro plan.
- `root0` — .buildUpgradeCta - Host-supplied builder for upgrade/sign-in CTA buttons.
- `root0` — .buildHelpUpgradeSection - Host-supplied builder for the `/help` upgrade section.
- `root0` — .className - Optional CSS class name for the container.

**Returns:** The rendered chat panel element.

#### `clampPanelSize(currentSize, deltaPx, containerWidth, min, max)`

Clamp a panel's new size after a pixel drag delta.

```typescript
function clampPanelSize(currentSize: number, deltaPx: number, containerWidth: number, min?: number, max?: number): number
```

- `currentSize` — The panel's current size as a percentage.
- `deltaPx` — The drag delta in pixels (positive = grow the left panel).
- `containerWidth` — The layout container width in pixels.
- `min` — Minimum allowed percentage. Defaults to {@link MIN_PANEL_PERCENT}.
- `max` — Maximum allowed percentage. Defaults to {@link MAX_PANEL_PERCENT}.

**Returns:** The new size as a percentage, clamped to `[min, max]`.

#### `CommandPalette(root0, root0, root0)`

Command Palette overlay.

```typescript
function CommandPalette({ commands, onDismiss }: CommandPaletteProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .commands - Array of available commands.
- `root0` — .onDismiss - Called when the palette is dismissed.

**Returns:** The command palette element.

#### `DeviceFrameSelector(root0, root0, root0, root0)`

A single button that cycles the preview device frame on click.

```typescript
function DeviceFrameSelector({
  current,
  onChange,
  className,
}: DeviceFrameSelectorProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .current - The currently selected device frame.
- `root0` — .onChange - Callback invoked with the next frame when clicked.
- `root0` — .className - Optional CSS class name for the button.

**Returns:** The rendered device-cycle button element.

#### `deviceIconName(device)`

Returns the icon-set glyph name for a device frame.

```typescript
function deviceIconName(device: DeviceFrame): string
```

- `device` — The device frame.

**Returns:** The icon name registered in the bonded icon set.

#### `EditorPanel(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Code editor panel with tab bar and Monaco integration.

```typescript
function EditorPanel({
  className,
  onActiveFileChange,
  onEditorReady,
  onTabsChange,
  fileStatuses,
  formattingFile,
  countdownFile,
  countdownKey,
  formatEstimate = 2000,
  onFixWithAI,
  onTabDoubleClick,
}: EditorPanelProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .className - Optional CSS class name for the container.
- `root0` — .onActiveFileChange - Callback when the active file tab changes.
- `root0` — .onEditorReady - Callback when the Monaco editor finishes mounting.
- `root0` — .onTabsChange - Callback when the list of open tabs changes.
- `root0` — .fileStatuses - Git status map keyed by file path.
- `root0` — .formattingFile - Path of the file currently being formatted.
- `root0` — .countdownFile - Path of the file showing the format countdown bar.
- `root0` — .countdownKey - React key to re-trigger the countdown animation.
- `root0` — .formatEstimate - Estimated formatting duration in milliseconds.
- `root0` — .onFixWithAI - Callback to request AI-assisted diagnostic fix.
- `root0` — .onTabDoubleClick - Override double-click on a tab. Return true to skip default pin behavior.

**Returns:** The rendered editor panel element.

#### `FileExplorer(root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Tree-view file explorer component with multi-select, keyboard navigation, and drag-and-drop.

```typescript
function FileExplorer({
  files,
  onFileSelect,
  onFileDoubleClick,
  onDirExpand,
  onRename,
  onDelete,
  onDeleteMultiple,
  onMoveFiles,
  onNewFile,
  onNewFolder,
  onCollapseAll,
  className,
  persistKey,
  activeFile,
  fileStatuses,
}: FileExplorerProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .files - The root file nodes to display.
- `root0` — .onFileSelect - Callback invoked when a file is selected.
- `root0` — .onFileDoubleClick - Callback invoked when a file is double-clicked (pin tab).
- `root0` — .onDirExpand - Callback invoked when a directory is expanded.
- `root0` — .onRename - Callback invoked for the "Rename" context menu action.
- `root0` — .onDelete - Callback invoked for the "Delete" context menu action.
- `root0` — .onDeleteMultiple - Callback invoked for bulk delete.
- `root0` — .onMoveFiles - Callback invoked when files are moved via drag-and-drop or cut+paste.
- `root0` — .onNewFile - Callback invoked for the "New File" context menu action.
- `root0` — .onNewFolder - Callback invoked for the "New Folder" context menu action.
- `root0` — .onCollapseAll - Callback invoked for the "Collapse All" context menu action.
- `root0` — .className - Optional CSS class name for the container.
- `root0` — .persistKey - localStorage key for persisting expand/collapse state.
- `root0` — .activeFile - The currently active file path for highlighting.
- `root0` — .fileStatuses - Git status map keyed by file path.

**Returns:** The rendered file explorer element.

#### `filterActivitiesByType(activities, type)`

Filters a list of activities by channel type. `null` (the "All" tab) returns
every activity unchanged.

```typescript
function filterActivitiesByType(activities: Activity[], type: ActivityType | null): Activity[]
```

- `activities` — The activities to filter.
- `type` — The channel type to keep, or `null` for all.

**Returns:** The filtered list (a new array unless `type` is null).

#### `getCustomEventCardFactory(name)`

Resolve the registered card factory for a custom event name, if any.

```typescript
function getCustomEventCardFactory(name: string): ChatEventCardFactory | undefined
```

- `name` — The custom event `name`.

**Returns:** The registered factory, or undefined if none is registered.

#### `groupCommandsByCategory(commands, categories)`

Groups commands under their categories, preserving category and command
order and dropping empty categories. Used by the `/settings` command
reference (and any other view that lists commands by section) so the
grouping stays in sync with the registry automatically.

```typescript
function groupCommandsByCategory(commands?: readonly CommandDef[], categories?: readonly CommandCategory[]): CommandGroup[]
```

- `commands` — Command registry to group (defaults to {@link COMMANDS}).
- `categories` — Ordered categories (defaults to {@link COMMAND_CATEGORIES}).

**Returns:** One {@link CommandGroup} per non-empty category, in category order.

#### `hasRenderableAvatar(avatar)`

Whether a stored avatar value is renderable (vs. needing the icon fallback).

```typescript
function hasRenderableAvatar(avatar?: string | null): boolean
```

- `avatar` — The avatar value from user metadata.

**Returns:** `true` when {@link resolveUserAvatar} would return a src.

#### `Icon(props)`

Renders the named glyph from the bonded icon set.

```typescript
function Icon({ name, size = 16, className, ...rest }: IconProps): JSX.Element
```

- `props` — {@link IconProps}.

**Returns:** An `<svg>` element rendering the named glyph.

#### `isInputFocused(e)`

Returns true when the event target is an interactive input element
where shortcuts should be suppressed by default.

```typescript
function isInputFocused(e: KeyboardEvent): boolean
```

- `e` — The keyboard event.

**Returns:** Whether an input-like element is focused.

#### `isMonacoFocused(e)`

Returns true when focus is inside a Monaco editor instance.

```typescript
function isMonacoFocused(e: KeyboardEvent): boolean
```

- `e` — The keyboard event.

**Returns:** Whether the target is inside `.monaco-editor`.

#### `KeyboardShortcutsPanel(root0, root0, root0)`

Keyboard shortcuts reference panel.

```typescript
function KeyboardShortcutsPanel({
  shortcuts,
  onDismiss,
}: KeyboardShortcutsPanelProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .shortcuts - Shortcut entries to display.
- `root0` — .onDismiss - Called on Escape or backdrop click.

**Returns:** The keyboard shortcuts panel element.

#### `livePanelSize(layout, panelConfigs, index)`

The live size (percentage) of the visible panel at `index`, read from
`layout.sizes` keyed by the panel's position group (where `resizePanel`
writes), falling back to the panel's `defaultSize`, then to an equal split.

```typescript
function livePanelSize(layout: WorkspaceLayout, panelConfigs: PanelConfig[], index: number): number
```

- `layout` — The current workspace layout.
- `panelConfigs` — The visible panel configs, in render order.
- `index` — The index of the panel within `panelConfigs`.

**Returns:** The panel size as a percentage.

#### `nextDevice(current)`

Returns the next device frame in the cycle, wrapping at the end. An unknown
frame falls back to the first entry so a click always advances.

```typescript
function nextDevice(current: DeviceFrame): DeviceFrame
```

- `current` — The currently selected device frame.

**Returns:** The next device frame in {@link DEVICE_CYCLE}.

#### `normalizeKeys(keys)`

Normalize a shortcut definition string into the same format produced by
`serializeEvent`. Accepts `mod+shift+f` style strings (case-insensitive).

```typescript
function normalizeKeys(keys: string): string
```

- `keys` — Raw shortcut string.

**Returns:** Normalized lowercase combo string.

#### `PreviewPanel(root0, root0, root0, root0, root0, root0, root0)`

Live preview panel with iframe, device frame selector, and URL bar.

```typescript
function PreviewPanel({
  loadingIndicator,
  restartingIndicator,
  className,
  onPreviewError,
  onPreviewStuck,
  fileChangeTick,
  buildingHint,
}: PreviewPanelProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .loadingIndicator - Custom loading indicator for initial start.
- `root0` — .restartingIndicator - Custom loading indicator for mid-session restarts.
- `root0` — .onPreviewError - Called when the preview iframe reports runtime JS errors.
- `root0` — .onPreviewStuck - Called when the preview fails to load after multiple recovery attempts.
- `root0` — .className - Optional CSS class name for the container.
- `root0` — .fileChangeTick - Incremented when the user edits a file, used to cancel queued autofix messages.

**Returns:** The rendered preview panel element.

#### `QuickOpen(root0, root0, root0, root0)`

Quick Open file finder overlay.

```typescript
function QuickOpen({ projectId, onFileOpen, onDismiss }: QuickOpenProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .projectId - The project to list files for.
- `root0` — .onFileOpen - Called when a file is selected.
- `root0` — .onDismiss - Called when the picker is dismissed.

**Returns:** The quick open element.

#### `QuickPicker(root0, root0, root0, root0, root0, root0, root0, root0)`

Quick picker overlay with keyboard navigation.

```typescript
function QuickPicker({
  items,
  placeholder,
  onSelect,
  onDismiss,
  loading,
  initialQuery,
  className,
}: QuickPickerProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .items - Items to display.
- `root0` — .placeholder - Input placeholder.
- `root0` — .onSelect - Called when an item is selected.
- `root0` — .onDismiss - Called on Escape or backdrop click.
- `root0` — .loading - Show loading indicator.
- `root0` — .initialQuery - Pre-fill the search input.
- `root0` — .className - Optional CSS class name.

**Returns:** The quick picker element.

#### `registerCustomEventCard(name, factory)`

Register a renderer for a custom chat-stream event. Consuming apps call this at
startup so their own `{ type: 'custom', name }` events surface as chat cards —
keeping app-specific events out of the core ai-chat union and this package's
ChatPanel. Re-registering the same name overwrites the previous factory.

```typescript
function registerCustomEventCard(name: string, factory: ChatEventCardFactory): void
```

- `name` — The custom event `name` to handle (matches the emitted event's `name`).
- `factory` — Builds the card from the event's `data` (or returns null to skip).

#### `ResizeHandle(root0, root0, root0, root0)`

Draggable handle for resizing adjacent panels.

```typescript
function ResizeHandle({
  onResize,
  direction = 'horizontal',
  className,
}: ResizeHandleProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .onResize - Callback invoked with the pixel delta on drag.
- `root0` — .direction - The resize direction, horizontal or vertical.
- `root0` — .className - Optional CSS class name for the handle.

**Returns:** The rendered resize handle element.

#### `resolveUserAvatar(avatar)`

Resolve a stored avatar value to a safe `<img>` src, or `null` to fall back to
the generic icon.

```typescript
function resolveUserAvatar(avatar?: string | null): string | null
```

- `avatar` — The avatar value from user metadata (data-URI, URL, or absent).

**Returns:** A safe image src string, or `null` when there is no renderable avatar.

#### `SearchPanel(root0, root0, root0, root0)`

Search-in-files panel for the IDE sidebar with find-and-replace support.

```typescript
function SearchPanel({
  projectId,
  onResultClick,
  className,
}: SearchPanelProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .projectId - The project to search in.
- `root0` — .onResultClick - Called when a match is clicked.
- `root0` — .className - Optional CSS class name.

**Returns:** The search panel element.

#### `serializeEvent(e, isMac)`

Serialize a `KeyboardEvent` into a normalized combo string.
Format: modifier keys in order `mod+ctrl+alt+shift+key` (lowercase).
`mod` maps to Meta on Mac, Control elsewhere.

```typescript
function serializeEvent(e: KeyboardEvent, isMac?: boolean): string
```

- `e` — The keyboard event.
- `isMac` — Override platform detection (for testing).

**Returns:** Serialized combo string.

#### `SidebarTabs(root0, root0, root0, root0, root0)`

Sidebar tab strip with file explorer and search icons.

```typescript
function SidebarTabs({
  activeTab,
  onTabChange,
  children,
  className,
}: SidebarTabsProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .activeTab - The currently selected tab.
- `root0` — .onTabChange - Callback when tab is clicked.
- `root0` — .children - Content to render below the tab strip.
- `root0` — .className - Optional CSS class name.

**Returns:** The sidebar tabs element.

#### `TabBar(root0, root0, root0, root0, root0, root0, root0, root0)`

Horizontally scrollable tab bar for open editor files.

```typescript
function TabBar({
  tabs,
  activeFile,
  onSelect,
  onClose,
  onDoubleClick,
  fileStatuses,
  className,
}: TabBarProps): JSX.Element | null
```

- `root0` — The component props.
- `root0` — .tabs - The list of open file tabs.
- `root0` — .activeFile - The path of the currently active file.
- `root0` — .onSelect - Callback invoked when a tab is clicked.
- `root0` — .onClose - Callback invoked when a tab's close button is clicked.
- `root0` — .onDoubleClick - Callback invoked when a tab is double-clicked (pin).
- `root0` — .fileStatuses - Git status map keyed by file path.
- `root0` — .className - Optional CSS class name for the tab bar.

**Returns:** The rendered tab bar element, or null if no tabs are open.

#### `useKeyboardShortcuts(shortcuts)`

Registers global keyboard shortcuts on the document.

```typescript
function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void
```

- `shortcuts` — Array of shortcut definitions. Callers should wrap

#### `UserAvatar(props)`

Renders the user's avatar image, or the generic `user` icon when there is no
safe, renderable avatar.

```typescript
function UserAvatar({ userAvatar, size = 24 }: UserAvatarProps): JSX.Element
```

- `props` — {@link UserAvatarProps}.

**Returns:** The avatar image or icon fallback.

#### `WorkspaceLayout(root0, root0, root0)`

Top-level workspace layout that arranges child panels in a row with draggable
vertical dividers between them. Each divider resizes its left panel; the new
size is written back through `resizePanel`, so it persists in workspace state.

```typescript
function WorkspaceLayout({ children, className }: WorkspaceLayoutProps): JSX.Element
```

- `root0` — The component props.
- `root0` — .children - The panel components to render in the layout.
- `root0` — .className - Optional CSS class name for the layout container.

**Returns:** The rendered workspace layout element.

### Constants

#### `ACTIVITY_TYPES`

All channel types, in the order their filter tabs should appear.

```typescript
const ACTIVITY_TYPES: ActivityType[]
```

#### `COMMAND_CATEGORIES`

Ordered list of command categories used as section headings.

```typescript
const COMMAND_CATEGORIES: readonly CommandCategory[]
```

#### `COMMANDS`

Every available slash command, grouped by category order. This is the
authoritative list — the menu, key handling, `/help`, AND the system prompt's
"Available Commands" section all read from it.

```typescript
const COMMANDS: readonly CommandDef[]
```

#### `DEVICE_CYCLE`

The order the device-cycle button advances through on each click, wrapping
back to the start. `none` = responsive (no fixed frame, full width).

```typescript
const DEVICE_CYCLE: readonly DeviceFrame[]
```

#### `DEVICE_META`

Per-frame display metadata: the icon-set glyph name and the i18n label
(key + English default) shown in the button tooltip.

```typescript
const DEVICE_META: Record<DeviceFrame, { readonly icon: string; readonly labelKey: string; readonly label: string; }>
```

#### `IS_MAC`

Detect macOS / iOS for Cmd vs Ctrl.

```typescript
const IS_MAC: boolean
```

#### `MAX_AVATAR_SRC_LENGTH`

Maximum avatar source length we will render inline (~256 KB data-URI).

```typescript
const MAX_AVATAR_SRC_LENGTH: 262144
```

#### `MAX_PANEL_PERCENT`

Largest a panel may grow to, as a percentage of the container.

```typescript
const MAX_PANEL_PERCENT: 80
```

#### `MIN_PANEL_PERCENT`

Smallest a panel may shrink to, as a percentage of the container.

```typescript
const MIN_PANEL_PERCENT: 10
```

#### `ToolCallCard`

Compact tool-call row with status dot, label, summary, and expandable detail pane.

```typescript
const ToolCallCard: MemoExoticComponent<({ id, name, input, output, status, fileDiff, isUndone: isUndoneProp, onUndoToggle, onFileOpen, onFileDoubleClick, onFileDiff, onFileRevert, onAskUserResponse, className, }: ToolCallCardProps) => JSX.Element | null>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-ai-chat` ^1.0.0
- `@molecule/app-ai-models` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-icons` ^1.0.0
- `@molecule/app-code-editor` ^1.0.0
- `@molecule/app-ide` ^1.0.0
- `@molecule/app-live-preview` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-ide`.
