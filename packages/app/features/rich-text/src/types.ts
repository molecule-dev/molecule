/**
 * Rich text editor types for molecule.dev.
 *
 * @module
 */

/**
 * Rich text content value.
 */
export interface RichTextValue {
  /**
   * Plain text content.
   */
  text: string

  /**
   * HTML content.
   */
  html: string

  /**
   * Delta/JSON representation (if supported by the editor).
   */
  delta?: unknown
}

/**
 * Editor format types.
 */
export type FormatType =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'link'
  | 'image'
  | 'video'
  | 'blockquote'
  | 'code-block'
  | 'header'
  | 'list'
  | 'indent'
  | 'align'
  | 'color'
  | 'background'
  | 'font'
  | 'size'
  | 'script'
  | 'direction'
  | 'clean'

/**
 * Rich text editor toolbar layout (named preset with grouped format buttons).
 */
export interface ToolbarConfig {
  /**
   * Toolbar name/key.
   */
  name: string

  /**
   * Toolbar groups - each group is an array of format buttons.
   */
  groups: ToolbarGroup[]
}

/**
 * A group of format buttons displayed together in the toolbar (e.g. [bold, italic, underline]).
 */
export type ToolbarGroup = (FormatType | FormatButton)[]

/**
 * Format button with options.
 */
export interface FormatButton {
  /**
   * Format type.
   */
  type: FormatType

  /**
   * Options for the format (e.g., header levels, colors).
   */
  options?: (string | number | boolean)[]
}

/**
 * Selection range in the editor.
 */
export interface SelectionRange {
  /**
   * Start index.
   */
  index: number

  /**
   * Length of selection.
   */
  length: number
}

/**
 * Editor event types.
 */
export type EditorEvent = 'text-change' | 'selection-change' | 'focus' | 'blur'

/**
 * Event handler for editor events.
 * @param data - The data.
 */
export type EditorEventHandler<T = unknown> = (data: T) => void

/**
 * Data emitted when the editor content changes.
 */
export interface TextChangeData {
  /**
   * New value.
   */
  value: RichTextValue

  /**
   * Previous value.
   */
  previousValue: RichTextValue

  /**
   * Source of the change.
   */
  source: 'user' | 'api' | 'silent'
}

/**
 * Data emitted when the editor selection changes.
 */
export interface SelectionChangeData {
  /**
   * New selection range.
   */
  range: SelectionRange | null

  /**
   * Previous selection range.
   */
  previousRange: SelectionRange | null

  /**
   * Source of the change.
   */
  source: 'user' | 'api' | 'silent'
}

/**
 * Rich text editor instance with methods for content manipulation, formatting, and event handling.
 */
export interface RichTextEditor {
  /**
   * Gets the current content value.
   */
  getValue(): RichTextValue

  /**
   * Sets the content value.
   */
  setValue(value: RichTextValue): void

  /**
   * Gets the plain text content.
   */
  getText(): string

  /**
   * Gets the HTML content.
   */
  getHTML(): string

  /**
   * Gets the content length.
   */
  getLength(): number

  /**
   * Inserts text at the current cursor position.
   */
  insertText(text: string, index?: number): void

  /**
   * Inserts HTML at the current cursor position.
   */
  insertHTML(html: string, index?: number): void

  /**
   * Inserts an embed (image, video, etc.).
   */
  insertEmbed(type: string, value: unknown, index?: number): void

  /**
   * Deletes content.
   */
  deleteText(index: number, length: number): void

  /**
   * Formats text.
   */
  format(format: FormatType, value?: unknown): void

  /**
   * Formats text at a specific range.
   */
  formatText(index: number, length: number, format: FormatType, value?: unknown): void

  /**
   * Removes formatting.
   */
  removeFormat(index: number, length: number): void

  /**
   * Gets the current selection.
   */
  getSelection(): SelectionRange | null

  /**
   * Sets the selection.
   */
  setSelection(index: number, length?: number): void

  /**
   * Focuses the editor.
   */
  focus(): void

  /**
   * Blurs the editor.
   */
  blur(): void

  /**
   * Checks if the editor has focus.
   */
  hasFocus(): boolean

  /**
   * Enables the editor.
   */
  enable(): void

  /**
   * Disables the editor.
   */
  disable(): void

  /**
   * Checks if the editor is enabled.
   */
  isEnabled(): boolean

  /**
   * Subscribes to editor events.
   */
  on<T>(event: EditorEvent, handler: EditorEventHandler<T>): () => void

  /**
   * Removes event handler.
   */
  off<T>(event: EditorEvent, handler: EditorEventHandler<T>): void

  /**
   * Gets the underlying editor instance (for advanced usage).
   */
  getEditorInstance(): unknown

  /**
   * Destroys the editor.
   */
  destroy(): void
}

/**
 * Configuration options for creating a new rich text editor instance.
 */
export interface EditorOptions {
  /**
   * Container element.
   */
  container: HTMLElement

  /**
   * Initial value.
   */
  value?: RichTextValue

  /**
   * Placeholder text.
   */
  placeholder?: string

  /**
   * Toolbar configuration key or custom config.
   */
  toolbar?: string | ToolbarConfig

  /**
   * Read-only mode.
   */
  readOnly?: boolean

  /**
   * Custom formats to register.
   */
  formats?: FormatType[]

  /**
   * Theme name.
   */
  theme?: string

  /**
   * Additional modules/plugins configuration.
   */
  modules?: Record<string, unknown>
}

/**
 * Rich text editor provider interface for creating editors and converting content formats.
 */
export interface RichTextProvider {
  /**
   * Create a new rich text editor instance attached to a container element.
   * @returns A RichTextEditor instance for controlling the editor.
   */
  createEditor(options: EditorOptions): RichTextEditor

  /**
   * Get the name of this rich text provider (e.g., 'quill', 'tiptap', 'slate').
   * @returns The provider name string.
   */
  getName(): string

  /**
   * Get the available toolbar configuration presets (e.g., 'basic', 'full').
   * @returns A map of preset names to their ToolbarConfig definitions.
   */
  getToolbarPresets(): Record<string, ToolbarConfig>

  /**
   * Convert an HTML string to the editor's internal rich text format.
   * @returns A RichTextValue in the provider's internal format.
   */
  htmlToValue(html: string): RichTextValue

  /**
   * Convert a plain text string to the editor's internal rich text format.
   * @returns A RichTextValue in the provider's internal format.
   */
  textToValue(text: string): RichTextValue

  /**
   * Create an empty rich text value suitable for initializing an editor.
   * @returns An empty RichTextValue.
   */
  createEmptyValue(): RichTextValue
}
