# @molecule/app-rich-text

Rich text editor interface for molecule.dev.

Provides a unified API for rich text editing that can be backed by
different editor implementations (Quill, TipTap, Slate, etc.).

## Type
`feature`

## Installation
```bash
npm install @molecule/app-rich-text
```

## API

### Interfaces

#### `EditorOptions`

Configuration options for creating a new rich text editor instance.

```typescript
interface EditorOptions {
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
```

#### `FormatButton`

Format button with options.

```typescript
interface FormatButton {
  /**
   * Format type.
   */
  type: FormatType

  /**
   * Options for the format (e.g., header levels, colors).
   */
  options?: (string | number | boolean)[]
}
```

#### `RichTextEditor`

Rich text editor instance with methods for content manipulation, formatting, and event handling.

```typescript
interface RichTextEditor {
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
```

#### `RichTextProvider`

Rich text editor provider interface for creating editors and converting content formats.

```typescript
interface RichTextProvider {
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
```

#### `RichTextValue`

Rich text content value.

```typescript
interface RichTextValue {
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
```

#### `SelectionChangeData`

Data emitted when the editor selection changes.

```typescript
interface SelectionChangeData {
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
```

#### `SelectionRange`

Selection range in the editor.

```typescript
interface SelectionRange {
  /**
   * Start index.
   */
  index: number

  /**
   * Length of selection.
   */
  length: number
}
```

#### `TextChangeData`

Data emitted when the editor content changes.

```typescript
interface TextChangeData {
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
```

#### `ToolbarConfig`

Rich text editor toolbar layout (named preset with grouped format buttons).

```typescript
interface ToolbarConfig {
  /**
   * Toolbar name/key.
   */
  name: string

  /**
   * Toolbar groups - each group is an array of format buttons.
   */
  groups: ToolbarGroup[]
}
```

### Types

#### `EditorEvent`

Editor event types.

```typescript
type EditorEvent = 'text-change' | 'selection-change' | 'focus' | 'blur'
```

#### `EditorEventHandler`

Event handler for editor events.

```typescript
type EditorEventHandler<T = unknown> = (data: T) => void
```

#### `FormatType`

Editor format types.

```typescript
type FormatType =
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
```

#### `ToolbarGroup`

A group of format buttons displayed together in the toolbar (e.g. [bold, italic, underline]).

```typescript
type ToolbarGroup = (FormatType | FormatButton)[]
```

### Functions

#### `createEditor(options)`

Create a new rich text editor instance using the current provider.

```typescript
function createEditor(options: EditorOptions): RichTextEditor
```

- `options` — Editor configuration (container, toolbar, initial value, etc.).

**Returns:** A RichTextEditor instance for controlling the editor.

#### `createEmptyValue()`

Create an empty rich text value suitable for initializing an editor.

```typescript
function createEmptyValue(): RichTextValue
```

**Returns:** An empty RichTextValue in the provider's internal format.

#### `createSimpleRichTextProvider()`

Create a simple contentEditable-based rich text provider. This is a basic
fallback — for production use, prefer dedicated providers like
`@molecule/app-rich-text-quill` or `@molecule/app-rich-text-tiptap`.

```typescript
function createSimpleRichTextProvider(): RichTextProvider
```

**Returns:** A RichTextProvider using the browser's contentEditable API.

#### `getProvider()`

Get the current rich text provider. Falls back to a simple contentEditable-based
provider if none has been explicitly set.

```typescript
function getProvider(): RichTextProvider
```

**Returns:** The active RichTextProvider instance.

#### `hasProvider()`

Check if a rich text provider has been registered.

```typescript
function hasProvider(): boolean
```

**Returns:** Whether a RichTextProvider has been bonded.

#### `htmlToValue(html)`

Convert an HTML string to the provider's internal rich text format.

```typescript
function htmlToValue(html: string): RichTextValue
```

- `html` — The HTML string to convert.

**Returns:** A RichTextValue representing the HTML content.

#### `setProvider(provider)`

Set the rich text provider.

```typescript
function setProvider(provider: RichTextProvider): void
```

- `provider` — RichTextProvider implementation to register.

#### `textToValue(text)`

Convert a plain text string to the provider's internal rich text format.

```typescript
function textToValue(text: string): RichTextValue
```

- `text` — The plain text string to convert.

**Returns:** A RichTextValue representing the text content.

### Constants

#### `defaultToolbars`

Default toolbar presets.

```typescript
const defaultToolbars: Record<string, ToolbarConfig>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0
