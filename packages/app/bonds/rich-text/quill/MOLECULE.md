# @molecule/app-rich-text-quill

Quill v2 rich text editor provider for molecule.dev.

Implements the RichTextProvider interface using Quill v2.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-rich-text-quill
```

## Usage

```typescript
import { setProvider } from '@molecule/app-rich-text'
import { createQuillProvider } from '@molecule/app-rich-text-quill'

setProvider(createQuillProvider())
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
    container: HTMLElement;
    /**
     * Initial value.
     */
    value?: RichTextValue;
    /**
     * Placeholder text.
     */
    placeholder?: string;
    /**
     * Toolbar configuration key or custom config.
     */
    toolbar?: string | ToolbarConfig;
    /**
     * Read-only mode.
     */
    readOnly?: boolean;
    /**
     * Custom formats to register.
     */
    formats?: FormatType[];
    /**
     * Theme name.
     */
    theme?: string;
    /**
     * Additional modules/plugins configuration.
     */
    modules?: Record<string, unknown>;
}
```

#### `QuillOptions`

Quill-specific configuration options.

```typescript
interface QuillOptions extends EditorOptions {
  /**
   * Quill theme ('snow' or 'bubble').
   */
  theme?: 'snow' | 'bubble'

  /**
   * Enable/disable specific formats.
   */
  formats?: FormatType[]

  /**
   * Quill module configurations.
   */
  modules?: {
    toolbar?: boolean | string | unknown[] | Record<string, unknown>
    history?: { delay?: number; maxStack?: number; userOnly?: boolean }
    clipboard?: { matchVisual?: boolean }
    keyboard?: Record<string, unknown>
    [key: string]: unknown
  }

  /**
   * Scroll container element.
   */
  scrollingContainer?: HTMLElement | string | null

  /**
   * Strict mode (limit user input to editor's capabilities).
   */
  strict?: boolean

  /**
   * Debug mode.
   */
  debug?: 'error' | 'warn' | 'log' | false
}
```

#### `RichTextEditor`

Rich text editor instance with methods for content manipulation, formatting, and event handling.

```typescript
interface RichTextEditor {
    /**
     * Gets the current content value.
     */
    getValue(): RichTextValue;
    /**
     * Sets the content value.
     */
    setValue(value: RichTextValue): void;
    /**
     * Gets the plain text content.
     */
    getText(): string;
    /**
     * Gets the HTML content.
     */
    getHTML(): string;
    /**
     * Gets the content length.
     */
    getLength(): number;
    /**
     * Inserts text at the current cursor position.
     */
    insertText(text: string, index?: number): void;
    /**
     * Inserts HTML at the current cursor position.
     */
    insertHTML(html: string, index?: number): void;
    /**
     * Inserts an embed (image, video, etc.).
     */
    insertEmbed(type: string, value: unknown, index?: number): void;
    /**
     * Deletes content.
     */
    deleteText(index: number, length: number): void;
    /**
     * Formats text.
     */
    format(format: FormatType, value?: unknown): void;
    /**
     * Formats text at a specific range.
     */
    formatText(index: number, length: number, format: FormatType, value?: unknown): void;
    /**
     * Removes formatting.
     */
    removeFormat(index: number, length: number): void;
    /**
     * Gets the current selection.
     */
    getSelection(): SelectionRange | null;
    /**
     * Sets the selection.
     */
    setSelection(index: number, length?: number): void;
    /**
     * Focuses the editor.
     */
    focus(): void;
    /**
     * Blurs the editor.
     */
    blur(): void;
    /**
     * Checks if the editor has focus.
     */
    hasFocus(): boolean;
    /**
     * Enables the editor.
     */
    enable(): void;
    /**
     * Disables the editor.
     */
    disable(): void;
    /**
     * Checks if the editor is enabled.
     */
    isEnabled(): boolean;
    /**
     * Subscribes to editor events.
     */
    on<T>(event: EditorEvent, handler: EditorEventHandler<T>): () => void;
    /**
     * Removes event handler.
     */
    off<T>(event: EditorEvent, handler: EditorEventHandler<T>): void;
    /**
     * Gets the underlying editor instance (for advanced usage).
     */
    getEditorInstance(): unknown;
    /**
     * Destroys the editor.
     */
    destroy(): void;
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
    createEditor(options: EditorOptions): RichTextEditor;
    /**
     * Get the name of this rich text provider (e.g., 'quill', 'tiptap', 'slate').
     * @returns The provider name string.
     */
    getName(): string;
    /**
     * Get the available toolbar configuration presets (e.g., 'basic', 'full').
     * @returns A map of preset names to their ToolbarConfig definitions.
     */
    getToolbarPresets(): Record<string, ToolbarConfig>;
    /**
     * Convert an HTML string to the editor's internal rich text format.
     * @returns A RichTextValue in the provider's internal format.
     */
    htmlToValue(html: string): RichTextValue;
    /**
     * Convert a plain text string to the editor's internal rich text format.
     * @returns A RichTextValue in the provider's internal format.
     */
    textToValue(text: string): RichTextValue;
    /**
     * Create an empty rich text value suitable for initializing an editor.
     * @returns An empty RichTextValue.
     */
    createEmptyValue(): RichTextValue;
}
```

#### `RichTextValue`

Rich text content value.

```typescript
interface RichTextValue {
    /**
     * Plain text content.
     */
    text: string;
    /**
     * HTML content.
     */
    html: string;
    /**
     * Delta/JSON representation (if supported by the editor).
     */
    delta?: unknown;
}
```

#### `SelectionChangeData`

Data emitted when the editor selection changes.

```typescript
interface SelectionChangeData {
    /**
     * New selection range.
     */
    range: SelectionRange | null;
    /**
     * Previous selection range.
     */
    previousRange: SelectionRange | null;
    /**
     * Source of the change.
     */
    source: 'user' | 'api' | 'silent';
}
```

#### `SelectionRange`

Selection range in the editor.

```typescript
interface SelectionRange {
    /**
     * Start index.
     */
    index: number;
    /**
     * Length of selection.
     */
    length: number;
}
```

#### `TextChangeData`

Data emitted when the editor content changes.

```typescript
interface TextChangeData {
    /**
     * New value.
     */
    value: RichTextValue;
    /**
     * Previous value.
     */
    previousValue: RichTextValue;
    /**
     * Source of the change.
     */
    source: 'user' | 'api' | 'silent';
}
```

#### `ToolbarConfig`

Rich text editor toolbar layout (named preset with grouped format buttons).

```typescript
interface ToolbarConfig {
    /**
     * Toolbar name/key.
     */
    name: string;
    /**
     * Toolbar groups - each group is an array of format buttons.
     */
    groups: ToolbarGroup[];
}
```

### Types

#### `EditorEvent`

Editor event types.

```typescript
type EditorEvent = 'text-change' | 'selection-change' | 'focus' | 'blur';
```

#### `EditorEventHandler`

Event handler for editor events.

```typescript
type EditorEventHandler<T = unknown> = (data: T) => void;
```

#### `FormatType`

Editor format types.

```typescript
type FormatType = 'bold' | 'italic' | 'underline' | 'strike' | 'link' | 'image' | 'video' | 'blockquote' | 'code-block' | 'header' | 'list' | 'indent' | 'align' | 'color' | 'background' | 'font' | 'size' | 'script' | 'direction' | 'clean';
```

### Classes

#### `Quill`

### Functions

#### `createQuillEditor(quill, container)`

Wraps a Quill instance in a molecule `RichTextEditor` interface. Sets up event listeners
for text changes, selection changes, focus, and blur, and exposes a unified API for
content manipulation, formatting, and selection management.

```typescript
function createQuillEditor(quill: Quill, container: HTMLElement): RichTextEditor
```

- `quill` — The initialized Quill editor instance.
- `container` — The DOM element containing the Quill editor (used for cleanup on destroy).

**Returns:** A `RichTextEditor` with getValue/setValue, formatting, selection, and event methods.

#### `createQuillProvider(defaultOptions)`

Creates a Quill-based rich text provider implementing the molecule `RichTextProvider` interface.
Supports toolbar presets (`minimal`, `standard`, `full`), HTML/text/delta value conversion,
and Quill themes (`snow`, `bubble`).

```typescript
function createQuillProvider(defaultOptions?: Partial<QuillOptions>): RichTextProvider
```

- `defaultOptions` — Default Quill options applied to every editor created by this provider.

**Returns:** A `RichTextProvider` backed by Quill.

#### `toolbarConfigToQuill(config)`

Converts a molecule `ToolbarConfig` to Quill's native toolbar array format.
Each group becomes a sub-array; string items pass through, objects become `{ type: options }` entries.

```typescript
function toolbarConfigToQuill(config: ToolbarConfig): unknown[][]
```

- `config` — A molecule toolbar config with named groups of toolbar items.

**Returns:** A nested array in Quill's toolbar module format.

### Constants

#### `provider`

Default Quill rich text provider instance.

```typescript
const provider: RichTextProvider
```

#### `quillToolbars`

Default toolbar presets for Quill.

```typescript
const quillToolbars: Record<string, ToolbarConfig>
```

## Core Interface
Implements `@molecule/app-rich-text` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-rich-text` ^1.0.0
