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
}

/**
 * Editor display and behavior configuration options.
 */
export interface EditorConfig {
  theme?: string
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
  getCursorPosition(): EditorPosition | null
  setCursorPosition(position: EditorPosition): void
  focus(): void
  onChange(callback: (event: EditorChangeEvent) => void): () => void
  getTabs(): EditorTab[]
  setActiveTab(path: string): void
  updateConfig(config: Partial<EditorConfig>): void
}
