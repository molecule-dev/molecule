/**
 * Types for IDE React components.
 *
 * @module
 */

import type { ReactNode } from 'react'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { EditorTab, FixWithAIRequest } from '@molecule/app-code-editor'
import type { DeviceFrame } from '@molecule/app-live-preview'

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
export interface ChatPanelProps {
  projectId: string
  endpoint?: string
  /** If provided, auto-send this message once on mount (e.g., prompt from landing page). */
  initialMessage?: string
  /** Called after the initial message has been sent — used to clear router state. */
  onInitialMessageSent?: () => void
  /** Called when a filename in a tool call is clicked — should open the file as a preview tab. */
  onFileOpen?: (path: string) => void
  /** Called when a filename in a tool call is double-clicked — should pin the tab. */
  onFileDoubleClick?: (path: string) => void
  /** Called when a file in the uncommitted list is clicked for diff view. */
  onFileDiff?: (path: string, diff?: { original: string; modified: string }) => void
  /** Called to undo/redo a file change — writes the given content to the file path. */
  onFileRevert?: (path: string, content: string) => Promise<void>
  /** Called when the AI creates or modifies a file — should refresh the editor if the file is open. */
  onFileChange?: (path: string, content: string) => void
  /** Called after a successful commit — should refresh file explorer git status. */
  onCommit?: () => void
  /** Message to auto-send (e.g. from "Fix with AI"). Sent when pendingMessageKey changes. */
  pendingMessage?: string
  /** Incremented to trigger sending pendingMessage. */
  pendingMessageKey?: number
  /** When true, model picker shows non-default models as locked (sign-up required). */
  isAnonymous?: boolean
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
}

/**
 * Properties for preview panel.
 */
export interface PreviewPanelProps {
  /** Custom loading indicator shown while the dev server is starting. */
  loadingIndicator?: ReactNode
  /** Custom loading indicator shown when the dev server restarts mid-session. Falls back to loadingIndicator if not provided. */
  restartingIndicator?: ReactNode
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
