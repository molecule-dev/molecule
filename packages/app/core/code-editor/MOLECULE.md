# @molecule/app-code-editor

Code editor core interface for molecule.dev.

## Type
`core`

## Installation
```bash
npm install @molecule/app-code-editor
```

## API

### Interfaces

#### `EditorChangeEvent`

Event emitted when file content changes in the editor.

```typescript
interface EditorChangeEvent {
  path: string
  content: string
  version: number
}
```

#### `EditorConfig`

Editor display and behavior configuration options.

```typescript
interface EditorConfig {
  theme?: string
  fontSize?: number
  tabSize?: number
  wordWrap?: boolean
  minimap?: boolean
  readOnly?: boolean
}
```

#### `EditorFile`

A file opened in the code editor, with its path, content, and language.

```typescript
interface EditorFile {
  path: string
  content: string
  language?: string
  isDirty?: boolean
}
```

#### `EditorPosition`

A line/column cursor position in the editor.

```typescript
interface EditorPosition {
  line: number
  column: number
}
```

#### `EditorProvider`

Code editor provider interface that all editor bond packages must implement.
Provides mounting, file management, cursor control, and change subscription.

```typescript
interface EditorProvider {
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
```

#### `EditorSelection`

A text selection range defined by start and end positions.

```typescript
interface EditorSelection {
  start: EditorPosition
  end: EditorPosition
}
```

#### `EditorState`

Snapshot of the editor's current state including open tabs, active file, and cursor.

```typescript
interface EditorState {
  openFiles: EditorTab[]
  activeFile: string | null
  cursorPosition: EditorPosition | null
}
```

#### `EditorTab`

Represents a tab in the editor's tab bar, tracking its file path,
display label, dirty state, and active state.

```typescript
interface EditorTab {
  path: string
  label: string
  isDirty: boolean
  isActive: boolean
}
```

### Functions

#### `getProvider()`

Retrieves the bonded code editor provider, or `null` if none is bonded.

```typescript
function getProvider(): EditorProvider | null
```

**Returns:** The bonded editor provider, or `null`.

#### `hasProvider()`

Checks whether a code editor provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a code editor provider is bonded.

#### `requireProvider()`

Retrieves the bonded code editor provider, throwing if none is configured.

```typescript
function requireProvider(): EditorProvider
```

**Returns:** The bonded editor provider.

#### `setProvider(provider)`

Registers a code editor provider as the active singleton.

```typescript
function setProvider(provider: EditorProvider): void
```

- `provider` — The editor provider implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Monaco | `@molecule/app-code-editor-monaco` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-bond` ^1.0.0

## Translations

Translation strings are provided by `@molecule/app-locales-code-editor`.
