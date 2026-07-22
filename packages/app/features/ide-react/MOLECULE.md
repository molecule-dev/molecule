# @molecule/app-ide-react

`@molecule/app-ide-react` — React components for an AI-powered IDE
workspace: `WorkspaceLayout` (resizable panel row), `ChatPanel` (streaming
AI chat with tool-call cards, @ file mentions, / commands), `EditorPanel`
(tabbed Monaco editor), `PreviewPanel` (live-preview iframe with device
frames + crash/blank recovery), `FileExplorer`, `CommandPalette`,
`QuickOpen`, `TabBar`, plus `registerCustomEventCard()` for app-specific
chat cards and `useKeyboardShortcuts()`.

## Quick Start

```tsx
import { ChatPanel, EditorPanel, PreviewPanel, WorkspaceLayout } from '@molecule/app-ide-react'

<WorkspaceLayout>
  <ChatPanel
    projectId="proj_abc123"
    onFileOpen={(path) => console.log('open', path)}
    onFileChange={(path, content) => console.log('changed', path, content.length)}
    onReadyToBuild={() => console.log('boot sandbox')}
  />
  <EditorPanel
    onActiveFileChange={(path) => console.log('active', path)}
    onFixWithAI={(req) => console.log('fix', req)}
  />
  <PreviewPanel onPreviewError={(errs) => console.error(errs)} />
</WorkspaceLayout>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-ide-react @molecule/app-ai-chat @molecule/app-ai-models @molecule/app-code-editor @molecule/app-i18n @molecule/app-icons @molecule/app-ide @molecule/app-live-preview @molecule/app-logger @molecule/app-react @molecule/app-storage @molecule/app-ui @molecule/app-ui-react material-file-icons react react-dom
npm install -D @types/react
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

#### `AutoCommitState`

The countdown's state.

`intervalSeconds` is the configured cadence (`0` = disabled). `remaining` is
the live count: a positive number while counting down, `0` at the instant a
commit is due, and `null` while disabled or paused (after a commit, awaiting
the next file change to re-arm).

```typescript
interface AutoCommitState {
  /** Configured countdown length in seconds; `0` when auto-commit is off. */
  intervalSeconds: number
  /** Seconds left until the next auto-commit; `null` when disabled or paused. */
  remaining: number | null
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
   * When true, ChatPanel renders the card as a stand-out tip box rather than muted inline
   * text. Prefer setting {@link ChatEventCard.tone} (which implies emphasis AND picks the
   * accent colour + icon); `emphasized` without a `tone` falls back to the neutral `info`
   * tone. The app opts in; the shared package never infers emphasis from a card's copy.
   */
  emphasized?: boolean
  /**
   * The card's tip TONE — picks its accent colour + default icon so every notice card
   * shares ONE consistent box (icon + tinted body + a uniform 1px border + actions),
   * differing only by colour/icon per kind:
   * - `info` — blue, info glyph (neutral notice)
   * - `gold` — amber, lightbulb (an honest tip / onboarding note)
   * - `upgrade` — amber, clock (a plan/limit/budget nudge)
   * - `success` — green, check (a completed action, e.g. a saved script)
   * - `signup` — primary, sign-in (an auth nudge)
   *
   * Setting `tone` implies emphasis. Cards that supply composable {@link ChatEventCard.content}
   * render their inline links in the box; cards that supply `action`(s) render them as a
   * consistent row of accent buttons. Omit `tone` (and `emphasized`) for a plain muted line.
   */
  tone?: 'info' | 'gold' | 'upgrade' | 'success' | 'signup'
  /**
   * Optional icon-name override (a `@molecule/app-icons` glyph) — defaults to the tone's
   * icon. Use only a name that exists in the bonded set (`getIcon` throws otherwise);
   * sets with extra glyphs register them via `CustomIconNames` augmentation.
   */
  icon?: IconName
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
  /**
   * Render the action's label as inline monospace code — a command/identifier like
   * `/report` or a skill name — so it stands out from prose while staying clickable.
   */
  code?: boolean
}
```

#### `ChatEventCardCode`

A non-interactive inline monospace code span in a card body — a command or identifier
the prose refers to (`/report`, a skill name) that should read as code but isn't
clickable. For a *clickable* command, use {@link ChatEventCardAction} with `code: true`.

```typescript
interface ChatEventCardCode {
  /** The code text, rendered monospaced/tinted. */
  code: string
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
   * The host's current app/build version (e.g. `'0.1.0'`), shown in the `/version`
   * command's menu description and its output. The shared IDE has no build version
   * of its own, so when omitted it falls back to the package default constant.
   */
  version?: string
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

#### `ChatUserIdentity`

Identity of the user whose avatar was clicked in the chat timeline, passed to
{@link ChatPanelProps.onProfileClick} so the host can open that user's profile.

Today the chat is solo — the only avatar shown is the signed-in user's own —
so the only known field is the avatar value. The interface is intentionally
forward-compatible: collaborator fields (id, name) can be added here when
multi-user chat lands, without changing the callback signature.

```typescript
interface ChatUserIdentity {
  /** The clicked user's avatar value (data-URI / URL), if any. */
  avatar?: string | null
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

#### `DeviceDimensions`

Per-frame iframe sizing. `width`/`height` are the PORTRAIT CSS sizes; a
fixed-frame (`rotatable`) device swaps them in landscape. `'100%'` width with
a `null` height means "fluid" — fill the available preview area (responsive /
desktop have no fixed frame to rotate).

```typescript
interface DeviceDimensions {
  /** Portrait CSS width (e.g. `'768px'`, or `'100%'` for a fluid frame). */
  readonly width: string
  /** Portrait CSS height in px (e.g. `'1024px'`), or `null` to fill the area. */
  readonly height: string | null
  /** Whether the frame has a fixed size that can be rotated portrait ⇄ landscape. */
  readonly rotatable: boolean
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
  name: IconName
  /** Width and height of the rendered SVG in pixels. Defaults to 16. */
  size?: number
  /** Class name forwarded to the root `<svg>`. */
  className?: string
}
```

#### `IdeClientAction`

A non-mutating UI action the AI agent asks the IDE to perform — reload or
navigate the live preview, open a file in the editor, or drive the preview's
interaction bridge (`preview_ui`). Delivered via the `client_action`
chat-stream event (and, for `preview_ui`, also via the host's collab socket
so a mid-build tab reload can't orphan it).

```typescript
interface IdeClientAction {
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

Props for the {@link PreviewPanel} — the live app preview (iframe + device frame + URL bar).

```typescript
interface PreviewPanelProps {
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
   * Called when the preview's render verdict changes ({@link PreviewRenderState}) — and
   * with the current location so the host can report WHERE. The host forwards this to the
   * server so Synthase's post-loop verification can confirm the app actually rendered (not
   * just that it compiled + served) before calling a build done.
   */
  onRenderState?: (state: PreviewRenderState, url?: string) => void
  className?: string
}
```

#### `PreviewStuckReport`

Structured report passed to {@link PreviewPanelProps.onPreviewStuck} when the preview
gives up. Carries the failure class + the route it happened on so the host can compose
an actionable, agent-fixable message instead of a bare "preview is stuck".

```typescript
interface PreviewStuckReport {
  /** The failure class — what left the preview unable to show the running app. */
  reason: PreviewStuckReason
  /** The preview's current location (route) when the failure was detected, if known. */
  url?: string
}
```

#### `PreviewUiCommand`

A live-preview interaction the host asks the panel to perform inside the iframe, so an AI
agent can verify a feature end-to-end by DRIVING the app the user is watching (no headless
browser). The panel just relays it to the iframe's interaction bridge — generic, so it
carries no host/API specifics.

```typescript
interface PreviewUiCommand {
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
}
```

#### `PreviewUiResult`

The preview interaction bridge's reply to a {@link PreviewUiCommand}.

```typescript
interface PreviewUiResult {
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

#### `SettingMeta`

Canonical, value-free metadata for a single user-controllable setting.

```typescript
interface SettingMeta {
  /** Stable id (also the i18n key suffix, e.g. `'effort'`). */
  id: SettingKey
  /** Human-readable label (English default; wrapped in `t()` at render). */
  label: string
  /**
   * One-line explanation of what the setting does (English default). May
   * contain the `{{agentName}}` interpolation token, filled in at render from
   * the host's agent identity (neutral default: "the assistant").
   */
  description: string
  /**
   * The slash command that edits this setting client-side. Drives the inline
   * "Edit" affordance and cross-links the setting to its command. Omitted only
   * for read-only settings.
   */
  editCommand?: CommandId
  /**
   * The exact slash-command input to prefill when editing, for settings whose
   * bare {@link SettingMeta.editCommand} is not specific enough — e.g. the
   * per-mode model rows both run the `model` command but must scope it to a
   * mode (`/model --plan`, `/model --execute`). Omit when running the bare
   * command suffices.
   */
  editInput?: string
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
  /**
   * Optional click handler. When supplied, the avatar becomes an interactive
   * button (pointer cursor, hover/focus ring, keyboard- and screen-reader
   * accessible) that opens the user's profile — the host decides what to show.
   * When omitted (the default) the avatar renders exactly as before: a static,
   * non-interactive image/icon, so existing call sites are unaffected.
   */
  onClick?: () => void
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

#### `AutoCommitAction`

Actions the countdown reducer accepts.

- `set` — apply a `/autocommit <seconds>` command (`seconds <= 0` disables);
  arms AND starts a fresh countdown (an explicit, just-now user choice).
- `hydrate` — restore a cadence persisted on the project (e.g. on reload),
  enabled but PAUSED (`seconds <= 0` disables). Unlike `set`, it does NOT
  start counting down — the countdown only re-arms on the next file change —
  so reopening a project never auto-commits a tree the user hasn't touched.
- `reset` — a file changed; restart the full countdown (no-op when disabled).
- `tick` — one second elapsed; decrement toward zero (no-op when paused).
- `fired` — a commit was just dispatched; pause until the next file change.

```typescript
type AutoCommitAction =
  | { type: 'set'; seconds: number }
  | { type: 'hydrate'; seconds: number }
  | { type: 'reset' }
  | { type: 'tick' }
  | { type: 'fired' }
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

One inline segment of a card's composable body: literal text, an inline monospace
{@link ChatEventCardCode} span, or a labelled link/action ({@link ChatEventCardAction}).
See {@link ChatEventCard.content}.

```typescript
type ChatEventCardSegment = string | ChatEventCardCode | ChatEventCardAction
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

#### `DeviceOrientation`

Preview-only iframe orientation. Portrait is the natural orientation of a
fixed-frame device; landscape swaps its width/height. This is a visual
preview concern that lives in {@link PreviewPanel}'s local state — it is NOT
part of the live-preview core state.

```typescript
type DeviceOrientation = 'portrait' | 'landscape'
```

#### `PreviewRenderState`

The preview's live render verdict, derived from the iframe bridges — the one preview
fact the server can't observe itself (it has no browser). The host forwards it to the
server so the post-loop verification won't pass a build while the app isn't actually
rendering ("compiles + serves" ≠ "renders").

- `rendered` — the app drew content (`molecule:ready`).
- `blank` — loaded but showed nothing (gave up / `#root` empty after settling).
- `frozen` — rendered then locked up (heartbeats stopped).
- `loading` — still loading / not yet determined.

```typescript
type PreviewRenderState = 'rendered' | 'blank' | 'frozen' | 'loading'
```

#### `PreviewStuckReason`

Why the preview could not show the running app — the failure CLASS the host hands
to its AI agent so a fix can be targeted (and so the agent isn't told "it's broken"
with no hint of how). Distinct from a JS error (`onPreviewError`): these are states
the iframe itself can't report once it's in them.

```typescript
type PreviewStuckReason =
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
```

#### `SettingKey`

Stable ids for each user-controllable setting (also the i18n key suffix).

```typescript
type SettingKey =
  | 'model'
  | 'planModel'
  | 'executeModel'
  | 'mode'
  | 'effort'
  | 'maxLoops'
  | 'autoFix'
  | 'autoCommit'
  | 'hooks'
  | 'autoApproveCommands'
  | 'sounds'
```

### Functions

#### `ActivityCard(props)`

Compact, clickable inline card for a single captured activity.

```typescript
function ActivityCard({ activity, onActivityClick }: ActivityCardProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered activity card element.

#### `activityFromEvent(raw)`

Maps a raw SSE `activity` event payload into a normalized {@link Activity}.
Tolerates missing optional fields and supplies an id/timestamp if absent.

```typescript
function activityFromEvent(raw: { id?: string; type?: string; status?: string; recipient?: string; summary?: string; timestamp?: string; }): Activity
```

- `raw` — The `activity` field from the SSE event.
- `raw.id` — Activity id; generated if absent.
- `raw.type` — Channel type; defaults to `webhook` if absent.
- `raw.status` — Lifecycle status; defaults to `captured` if absent.
- `raw.recipient` — Optional recipient.
- `raw.summary` — Optional short summary.
- `raw.timestamp` — ISO timestamp; defaults to now if absent.

**Returns:** A normalized Activity object.

#### `activityIconName(type)`

Returns the bonded-icon-set glyph NAME for an activity type — pass it to
`<Icon name={…} />` to render the themed SVG. Unknown/future types (which
{@link activityFromEvent} normalizes to `webhook`) reuse the `link` glyph
rather than risk a `getIcon` throw.

```typescript
function activityIconName(type: ActivityType): IconName
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

#### `autoCommitReducer(state, action)`

Pure reducer for the auto-commit countdown. Deterministic and side-effect
free: the component performs the actual commit when {@link isAutoCommitDue}
becomes true, then dispatches `fired`.

```typescript
function autoCommitReducer(state: AutoCommitState, action: AutoCommitAction): AutoCommitState
```

- `state` — The current countdown state.
- `action` — The action to apply.

**Returns:** The next countdown state.

#### `ChatPanel(props)`

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
  onProfileClick,
  onReadyToBuild,
  awaitingSandboxBoot,
  onClientAction,
  onTurnComplete,
  onLoadingChange,
  onNavigatePreview,
  onRegisterPushHandler,
  autoSubmitSignal,
  initialInputValue,
  hideConversationMenu,
  renderConversationHeader = true,
  conversationId: controlledConversationId,
  chatKey: controlledChatKey,
  onConversationId: controlledOnConversationId,
  openShareSignal: controlledShareSignal,
  openReportSignal: controlledReportSignal,
  openSettingsSignal: controlledSettingsSignal,
  gitStatusTick,
  pendingMessage,
  pendingMessageKey,
  pendingMessageSuppressUser,
  pendingMessageUserInitiated,
  userEditedFile,
  userEditedFileKey,
  isPro,
  buildUpgradeCta,
  buildHelpUpgradeSection,
  userAvatar,
  agentName,
  productName,
  version,
  feedbackUrl,
  className,
}: ChatPanelProps): JSX.Element
```

- `props` — Component props (see {@link MessageItemProps}).

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

#### `CommandPalette(props)`

Command Palette overlay.

```typescript
function CommandPalette({ commands, onDismiss }: CommandPaletteProps): JSX.Element
```

- `props` — Component props.

**Returns:** The command palette element.

#### `DeviceFrameSelector(props)`

A dropdown that selects the preview device frame and hosts the Rotate +
Open-in-new-tab actions.

```typescript
function DeviceFrameSelector({
  current,
  onChange,
  className,
  canRotate,
  rotated,
  onRotate,
  onOpenExternal,
}: DeviceFrameSelectorWithActionsProps): JSX.Element
```

- `props` — Component props (see {@link DeviceFrameSelectorWithActionsProps}).

**Returns:** The rendered device-frame selector element.

#### `deviceIconName(device)`

Returns the icon-set glyph name for a device frame.

```typescript
function deviceIconName(device: DeviceFrame): string
```

- `device` — The device frame.

**Returns:** The icon name registered in the bonded icon set.

#### `EditorPanel(props)`

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

- `props` — Component props.

**Returns:** The rendered editor panel element.

#### `FileExplorer(props)`

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

- `props` — Component props (see {@link FileTreeItemProps}).

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

#### `formatAutoCommitBadge(state)`

Formats the countdown's remaining seconds for the compact badge (e.g. `"12s"`).
Returns `''` when there is nothing to show (disabled or paused).

```typescript
function formatAutoCommitBadge(state: AutoCommitState): string
```

- `state` — The countdown state.

**Returns:** The badge label, or `''`.

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

#### `isAutoCommitArmed(state)`

Whether the countdown is actively armed (counting down), i.e. a 1s tick
interval should be running. False when disabled or paused after a commit.

```typescript
function isAutoCommitArmed(state: AutoCommitState): boolean
```

- `state` — The countdown state.

**Returns:** `true` when `remaining` is a number.

#### `isAutoCommitCountdownVisible(state)`

Whether the countdown is in its visible window — armed and within the final
{@link AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS} seconds — i.e. the commit
button should render the live "Auto-commit in Ns" label instead of "Commit".

```typescript
function isAutoCommitCountdownVisible(state: AutoCommitState): boolean
```

- `state` — The countdown state.

**Returns:** `true` when armed with at most the visible-window seconds left.

#### `isAutoCommitDue(state)`

Whether a commit is due this instant (the countdown has reached zero). The
component reacts to this by running `/commit` and dispatching `fired`.

```typescript
function isAutoCommitDue(state: AutoCommitState): boolean
```

- `state` — The countdown state.

**Returns:** `true` when `remaining === 0`.

#### `isAutoCommitEnabled(state)`

Whether auto-commit is enabled (a positive cadence is configured), regardless
of whether it is currently counting down or paused.

```typescript
function isAutoCommitEnabled(state: AutoCommitState): boolean
```

- `state` — The countdown state.

**Returns:** `true` when `intervalSeconds > 0`.

#### `isDeviceRotatable(device)`

Whether a device frame can be rotated (true only for fixed-frame devices —
tablet and mobile). Responsive and desktop are full-width with nothing to
rotate, so the "Rotate" control is enabled only "where possible".

```typescript
function isDeviceRotatable(device: DeviceFrame): boolean
```

- `device` — The device frame.

**Returns:** `true` if the frame has a fixed size that can be rotated.

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

#### `KeyboardShortcutsPanel(props)`

Keyboard shortcuts reference panel.

```typescript
function KeyboardShortcutsPanel({
  shortcuts,
  onDismiss,
}: KeyboardShortcutsPanelProps): JSX.Element
```

- `props` — Component props.

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

#### `normalizeKeys(keys)`

Normalize a shortcut definition string into the same format produced by
`serializeEvent`. Accepts `mod+shift+f` style strings (case-insensitive).

```typescript
function normalizeKeys(keys: string): string
```

- `keys` — Raw shortcut string.

**Returns:** Normalized lowercase combo string.

#### `parseAutoCommitCommand(input)`

Parses an `/autocommit [seconds]` command.

Returns `{ seconds: null }` when `/autocommit` is typed with no argument (the
caller shows usage/current state), `{ seconds: n }` for a non-negative integer
argument (`0` cancels), or `null` when the input is not the command.

```typescript
function parseAutoCommitCommand(input: string): { seconds: number | null; } | null
```

- `input` — The raw chat input.

**Returns:** The parsed command, or `null` when it is not `/autocommit`.

#### `PreviewPanel(props)`

Live preview panel with iframe, device frame selector, and URL bar.

```typescript
function PreviewPanel({
  loadingIndicator,
  restartingIndicator,
  className,
  onPreviewError,
  onPreviewStuck,
  onRenderState,
  uiCommand,
  onUiResult,
  fileChangeTick,
  buildingHint,
  isBuilding,
  wakeAt,
}: PreviewPanelProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered preview panel element.

#### `QuickOpen(props)`

Quick Open file finder overlay.

```typescript
function QuickOpen({ projectId, onFileOpen, onDismiss }: QuickOpenProps): JSX.Element
```

- `props` — Component props.

**Returns:** The quick open element.

#### `QuickPicker(props)`

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

- `props` — Component props.

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

#### `ResizeHandle(props)`

Draggable handle for resizing adjacent panels. Uses Pointer Events so it works
with mouse, touch, and pen (an iPad drag resizes just like a desktop drag); a
wide invisible grab zone wraps a thin visible line that brightens to the
primary color on hover/drag for a clear affordance. Arrow keys nudge the split
for keyboard users.

```typescript
function ResizeHandle({
  onResize,
  direction = 'horizontal',
  className,
}: ResizeHandleProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered resize handle element.

#### `resolveAutoCommitSeconds(saved)`

Resolves the persisted `project.settings.autoCommitSeconds` value to the
effective cadence. A finite number is an explicit user choice: positive
values floor to whole seconds, non-positive values mean "the user turned
auto-commit off" (`0`). Anything else — missing, never configured, or
invalid — falls back to {@link DEFAULT_AUTO_COMMIT_SECONDS}, because
auto-commit is on by default.

```typescript
function resolveAutoCommitSeconds(saved: unknown): number
```

- `saved` — The raw persisted setting value.

**Returns:** The effective cadence in whole seconds (`0` = off).

#### `resolveDeviceSize(device, orientation)`

Resolves the concrete iframe `width`/`height` for a device frame at a given
orientation. Fluid frames (responsive/desktop) ignore orientation and fill
the preview area (`width` from dims, `height: '100%'`). Fixed frames render
at their pixel size in portrait and at the swapped size in landscape.

```typescript
function resolveDeviceSize(device: DeviceFrame, orientation: DeviceOrientation): { width: string; height: string; }
```

- `device` — The device frame.
- `orientation` — The preview orientation.

**Returns:** The CSS `width` and `height` to apply to the preview iframe.

#### `resolveUserAvatar(avatar)`

Resolve a stored avatar value to a safe `<img>` src, or `null` to fall back to
the generic icon.

```typescript
function resolveUserAvatar(avatar?: string | null): string | null
```

- `avatar` — The avatar value from user metadata (data-URI, URL, or absent).

**Returns:** A safe image src string, or `null` when there is no renderable avatar.

#### `SearchPanel(props)`

Search-in-files panel for the IDE sidebar with find-and-replace support.

```typescript
function SearchPanel({
  projectId,
  onResultClick,
  className,
  excludedDirs,
  onExcludedDirsChange,
}: SearchPanelProps): JSX.Element
```

- `props` — Component props.

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

#### `SidebarTabs(props)`

Sidebar tab strip with file explorer and search icons.

```typescript
function SidebarTabs({
  activeTab,
  onTabChange,
  children,
  className,
}: SidebarTabsProps): JSX.Element
```

- `props` — Component props.

**Returns:** The sidebar tabs element.

#### `TabBar(props)`

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

- `props` — Component props (see {@link TabItemProps}).

**Returns:** The rendered tab bar element, or null if no tabs are open.

#### `useKeyboardShortcuts(shortcuts)`

Registers global keyboard shortcuts on the document.

```typescript
function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void
```

- `shortcuts` — Array of shortcut definitions. Callers should wrap the array in `useMemo` to avoid unnecessary re-subscriptions.

#### `UserAvatar(props)`

Renders the user's avatar image, or the generic `user` icon when there is no
safe, renderable avatar. When {@link UserAvatarProps.onClick} is provided the
visual is wrapped in an accessible button so the avatar can open the user's
profile.

```typescript
function UserAvatar({ userAvatar, size = 24, onClick }: UserAvatarProps): JSX.Element
```

- `props` — {@link UserAvatarProps}.

**Returns:** The avatar image or icon fallback, optionally wrapped in a button.

#### `WorkspaceLayout(props)`

Top-level workspace layout that arranges child panels in a row with draggable
vertical dividers between them. Each divider resizes its left panel; the new
size is written back through `resizePanel`, so it persists in workspace state.

```typescript
function WorkspaceLayout({ children, className }: WorkspaceLayoutProps): JSX.Element
```

- `props` — Component props.

**Returns:** The rendered workspace layout element.

### Constants

#### `ACTIVITY_TYPES`

All channel types, in the order their filter tabs should appear.

```typescript
const ACTIVITY_TYPES: ActivityType[]
```

#### `AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS`

How many final seconds of the countdown are DISPLAYED as a live countdown.
Until the countdown drops to this threshold, the commit-bar button stays a
plain green "Commit" (a bare "12s" pill told users nothing); the countdown
label only takes over for these last seconds, right before the auto-commit
fires. Cadences at or below the threshold show the countdown the whole time.

```typescript
const AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS: 3
```

#### `AUTO_COMMIT_DISABLED`

The disabled (off) countdown state — the reducer's initial value.

```typescript
const AUTO_COMMIT_DISABLED: AutoCommitState
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

#### `DEFAULT_AUTO_COMMIT_SECONDS`

The default auto-commit cadence in seconds — auto-commit is ON by default.
Projects that have never persisted `autoCommitSeconds` hydrate to this
cadence (paused, arming on the first file change); only an explicit `0`
(the user cancelled) keeps auto-commit off.

The value is the TOTAL debounce after the last file change (once the agent's
turn has finished): a short quiet period, then the final
{@link AUTO_COMMIT_COUNTDOWN_VISIBLE_SECONDS} seconds render as a live
countdown on the commit button. 5s = 2s quiet + 3s visible countdown.

```typescript
const DEFAULT_AUTO_COMMIT_SECONDS: 5
```

#### `DEFAULT_SEARCH_EXCLUDED_DIRS`

Default search-excluded directory names shown when the host supplies none —
VS Code's `search.exclude`/`files.exclude` defaults plus the platform's
vendored/build dirs. MUST stay in sync with the API-side list in
`@molecule/api-ai-tools` (utilities.ts) — the cross-stack import boundary
forces the duplication.

```typescript
const DEFAULT_SEARCH_EXCLUDED_DIRS: readonly ["node_modules", "bower_components", ".git", ".svn", ".hg", "CVS", "dist", ".next", ".vite", "molecule"]
```

#### `DEVICE_DIMENSIONS`

The fixed pixel frame each device renders the preview iframe at. `none`
(responsive) and `desktop` are fluid — full width, full height, nothing to
rotate. `tablet` (768×1024) and `mobile` (375×667) are fixed frames that can
be rotated to landscape (swapping width/height).

```typescript
const DEVICE_DIMENSIONS: Record<DeviceFrame, DeviceDimensions>
```

#### `DEVICE_FRAMES`

The device frames the selector dropdown lists, in display order.
`none` = responsive (no fixed frame, full width).

```typescript
const DEVICE_FRAMES: readonly DeviceFrame[]
```

#### `DEVICE_META`

Per-frame display metadata: the icon-set glyph name and the i18n label
(key + English default) shown in the dropdown trigger + menu items.

```typescript
const DEVICE_META: Record<DeviceFrame, { readonly icon: IconName; readonly labelKey: string; readonly label: string; }>
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

#### `SETTINGS`

Every user-controllable setting, in display order. The authoritative list —
the `/settings` view (via `buildSettingsList`) and the system prompt both read
from it, so they cannot drift. The default `model` and the per-mode
`planModel` / `executeModel` rows are kept distinct (rather than collapsed
into one "Model" row); `effort`, `autoCommit`, and `hooks` are each listed
alongside (or in `hooks`' case, instead of) the command the panel references —
so a user's actual configuration is never understated and the panel never
shows a command for a setting it hides.

```typescript
const SETTINGS: readonly SettingMeta[]
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
- `@molecule/app-storage` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-ai-chat`
- `@molecule/app-ai-models`
- `@molecule/app-code-editor`
- `@molecule/app-i18n`
- `@molecule/app-icons`
- `@molecule/app-ide`
- `@molecule/app-live-preview`
- `@molecule/app-logger`
- `@molecule/app-react`
- `@molecule/app-storage`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `material-file-icons`
- `react`
- `react-dom`

- The panels are hook-driven and THROW without provider wiring: wrap the
  tree in `@molecule/app-react`'s `WorkspaceProvider`, `EditorProvider`,
  `ChatProvider`, and `PreviewProvider` (or the umbrella
  `MoleculeProvider`), each wired to a bond — typically
  `@molecule/app-ide-default` (workspace/layout state + persistence),
  `@molecule/app-code-editor-monaco`, `@molecule/app-ai-chat-http`
  (streaming chat endpoint), and `@molecule/app-live-preview-iframe`.
  `ChatPanel` additionally needs the bonded HTTP client
  (`useHttpClient`) and `I18nProvider`; `getClassMap()` needs a ClassMap
  bond.
- `WorkspaceLayout` takes panels as CHILDREN and matches them in order to
  the workspace provider's panel configs (extra configs are ignored, so
  rendering 2 children against the default 3-panel layout works). Panel
  sizes persist through the workspace provider's `resizePanel`.
- App-specific chat/stream events do NOT belong in this package — emit
  `{ type: 'custom', name, data }` events and register a card with
  `registerCustomEventCard(name, factory)` in the consuming app.
- Text routes through `t('ide.*')` — `@molecule/app-locales-ide` supplies
  translations.

## Translations

Translation strings are provided by `@molecule/app-locales-ide`.
