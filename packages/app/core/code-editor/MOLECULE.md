# @molecule/app-code-editor

Code editor core interface for molecule.dev.

Framework-agnostic contract for an embeddable code editor (tabs, file
content, cursor, diagnostics, diff view, optional LSP). Bond a provider
(e.g. `@molecule/app-code-editor-monaco`) at startup, then drive the
editor through the provider anywhere.

## Quick Start

```typescript
import { setProvider, requireProvider } from '@molecule/app-code-editor'
import { provider } from '@molecule/app-code-editor-monaco'

setProvider(provider)                    // once, at app startup (bonds.ts)

const editor = requireProvider()
await editor.mount(containerElement, { theme: 'dark', fontSize: 13 })
editor.openFile({ path: 'src/index.ts', content: source, language: 'typescript' })
const unsubscribe = editor.onChange((event) => save(event.path, event.content))
```

## Type
`core`

## Installation
```bash
npm install @molecule/app-code-editor @molecule/app-bond @molecule/app-i18n
```

## API

### Interfaces

#### `DiffFile`

A file diff with original (committed) and modified (current) content,
used to drive a side-by-side diff view in the editor.

```typescript
interface DiffFile {
  path: string
  originalContent: string
  modifiedContent: string
  language?: string
}
```

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
  fontFamily?: string
  fontSize?: number
  tabSize?: number
  wordWrap?: boolean
  minimap?: boolean
  readOnly?: boolean
}
```

#### `EditorDiagnostic`

A single diagnostic (error, warning, etc.) reported by the editor's language service.

```typescript
interface EditorDiagnostic {
  message: string
  severity: 'error' | 'warning' | 'info' | 'hint'
  startLine: number
  startColumn: number
  endLine: number
  endColumn: number
  source?: string
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
  isPreview?: boolean
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
  /** Register a callback for when the LSP connection drops unexpectedly. */
  onLspDisconnect?(cb: () => void): void
  /** Set a file resolver for Go to Definition / Peek Definition cross-file navigation. */
  setFileResolver?(
    resolver: (path: string) => Promise<{ content: string; language?: string } | null>,
  ): void
  /** Register a callback for "Fix with AI" requests from the editor (lightbulb quick fix or context menu). Returns an unsubscribe function. */
  onFixWithAI?(callback: (request: FixWithAIRequest) => void): () => void
  /** Get current diagnostics (errors/warnings) for a file from the language service. */
  getDiagnostics?(path: string): EditorDiagnostic[]
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
  isPreview?: boolean
  /** Diff tabs show a side-by-side comparison and cannot be pinned. */
  isDiff?: boolean
  diagnostics?: { errors: number; warnings: number }
}
```

#### `FixWithAIRequest`

Request to interact with AI about code, triggered from the editor's lightbulb quick fix
or right-click context menu.

```typescript
interface FixWithAIRequest {
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
- `@molecule/app-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/app-bond`
- `@molecule/app-i18n`

- **Wire the bond BEFORE any editor call.** `setProvider(provider)` in the app's
  bond setup; `requireProvider()` throws if nothing is bonded.
- **`mount()` needs a real, attached DOM element and may be async** (providers can
  lazy-load their engine). In component frameworks, mount in the after-render
  lifecycle hook (a ref/effect), and call `dispose()` on unmount — never re-mount
  over a live instance.
- **Feature-detect optional capabilities.** `openDiff`, `connectLsp`,
  `setContentSilent`, `markSaved`, `onFixWithAI`, `getDiagnostics`, etc. are
  optional provider methods — check `editor.openDiff?.(…)` before relying on them.
- `onChange` returns an unsubscribe function — keep it and call it on teardown to
  avoid leaked listeners across route changes.
- The editor renders its own chrome; any surrounding UI you add (toolbars, tab
  labels) styles via `getClassMap()`/`cm.*` and localizes via
  `t('key', values, { defaultValue })`.

## Translations

Translation strings are provided by `@molecule/app-locales-code-editor`.
