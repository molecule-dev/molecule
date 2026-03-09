/**
 * Code editor interface types.
 *
 * @module
 */

/**
 * A file opened in the code editor, with its path, content, and language.
 */
export interface EditorFile {
  path: string
  content: string
  language?: string
  isDirty?: boolean
  isPreview?: boolean
}

/**
 * A line/column cursor position in the editor.
 */
export interface EditorPosition {
  line: number
  column: number
}

/**
 * A text selection range defined by start and end positions.
 */
export interface EditorSelection {
  start: EditorPosition
  end: EditorPosition
}

/**
 * Represents a tab in the editor's tab bar, tracking its file path,
 * display label, dirty state, and active state.
 */
export interface EditorTab {
  path: string
  label: string
  isDirty: boolean
  isActive: boolean
  isPreview?: boolean
  /** Diff tabs show a side-by-side comparison and cannot be pinned. */
  isDiff?: boolean
  diagnostics?: { errors: number; warnings: number }
}

/**
 * Editor display and behavior configuration options.
 */
export interface EditorConfig {
  theme?: string
  fontFamily?: string
  fontSize?: number
  tabSize?: number
  wordWrap?: boolean
  minimap?: boolean
  readOnly?: boolean
}

/**
 * Snapshot of the editor's current state including open tabs, active file, and cursor.
 */
export interface EditorState {
  openFiles: EditorTab[]
  activeFile: string | null
  cursorPosition: EditorPosition | null
}

/**
 * Event emitted when file content changes in the editor.
 */
export interface EditorChangeEvent {
  path: string
  content: string
  version: number
}

/**
 * A single diagnostic (error, warning, etc.) reported by the editor's language service.
 */
export interface EditorDiagnostic {
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  source?: string
}

/**
 * Request to interact with AI about code, triggered from the editor's lightbulb quick fix
 * or right-click context menu.
 */
export interface FixWithAIRequest {
  /** File path of the file containing the code. */
  path: string
  /** Diagnostics (errors/warnings) at the target location, if any. */
  diagnostics: EditorDiagnostic[]
  /** Source code surrounding the target location for context. */
  codeContext?: string
  /** Exact text the user had selected, if any. */
  selectedCode?: string
  /** Line number where the cursor or selection starts. */
  line?: number
}

/**
 * A file diff with original (committed) and modified (current) content,
 * used to drive a side-by-side diff view in the editor.
 */
export interface DiffFile {
  path: string
  originalContent: string
  modifiedContent: string
  language?: string
}

/**
 * Code editor provider interface that all editor bond packages must implement.
 * Provides mounting, file management, cursor control, and change subscription.
 */
export interface EditorProvider {
  readonly name: string
  mount(element: HTMLElement, config?: EditorConfig): void | Promise<void>
  dispose(): void
  openFile(file: EditorFile): void
  closeFile(path: string): void
  getContent(): string | null
  setContent(path: string, content: string): void
  /** Silently update file content without firing change events or marking dirty. Preserves cursor position. */
  setContentSilent?(path: string, content: string): void
  getCursorPosition(): EditorPosition | null
  setCursorPosition(position: EditorPosition): void
  focus(): void
  onChange(callback: (event: EditorChangeEvent) => void): () => void
  getTabs(): EditorTab[]
  setActiveTab(path: string): void
  updateConfig(config: Partial<EditorConfig>): void
  /** Open a side-by-side diff view for a file. Optional — providers may not support this. */
  openDiff?(file: DiffFile): void
  /** Close the diff view and restore the normal editor. */
  closeDiff?(): void
  /** Clear the dirty flag on a tab after a successful save. */
  markSaved?(path: string): void
  /** Promote a preview tab to a permanent tab. */
  pinTab?(path: string): void
  /** Add a type definition or virtual file for module resolution. */
  addExtraLib?(content: string, filePath: string): void
  /** Remove all registered extra libs. */
  clearExtraLibs?(): void
  /** Connect to an LSP server for language intelligence. */
  connectLsp?(wsUrl: string): Promise<void>
  /** Disconnect from the LSP server. */
  disconnectLsp?(): void
  /** Set a file resolver for Go to Definition / Peek Definition cross-file navigation. */
  setFileResolver?(
    resolver: (path: string) => Promise<{ content: string; language?: string } | null>,
  ): void
  /** Register a callback for "Fix with AI" requests from the editor (lightbulb quick fix or context menu). Returns an unsubscribe function. */
  onFixWithAI?(callback: (request: FixWithAIRequest) => void): () => void
}
