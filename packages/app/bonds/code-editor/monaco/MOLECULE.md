# @molecule/app-code-editor-monaco

Monaco code editor provider for molecule.dev — the VS Code editor core
wired to the `@molecule/app-code-editor` interface (mount, models, themes,
diff view, LSP client).

## Quick Start

```typescript
import { setProvider } from '@molecule/app-code-editor'
import { provider } from '@molecule/app-code-editor-monaco'

setProvider(provider) // custom fonts/theme: setProvider(createProvider({...}))
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-code-editor-monaco @molecule/app-code-editor @molecule/app-i18n @molecule/app-logger monaco-editor
```

## API

### Interfaces

#### `MonacoConfig`

Configuration for monaco.

```typescript
interface MonacoConfig {
  /** Theme for the editor. Defaults to the bundled 'molecule-dark' (registered at mount); the diff editor defaults to 'vs-dark'. */
  theme?: string
  /** Default font family. */
  fontFamily?: string
  /** Default font size. */
  fontSize?: number
  /** Default tab size. */
  tabSize?: number
  /** Enable word wrap by default. */
  wordWrap?: boolean
  /** Show minimap by default. */
  minimap?: boolean
  /** Currently unused — Monaco loads from the bundled `monaco-editor` peer dependency, never from a CDN. */
  cdnUrl?: string
  /** TypeScript compiler options for the language service. */
  tsCompilerOptions?: Record<string, unknown>
}
```

### Classes

#### `MonacoEditorProvider`

Monaco Editor implementation of `EditorProvider`. Dynamically imports the Monaco Editor
library at runtime to avoid large bundle sizes. Manages multiple file tabs with
independent Monaco models, cursor tracking, and change event listeners.

### Functions

#### `createProvider(config)`

Creates a `MonacoEditorProvider` instance with optional configuration.

```typescript
function createProvider(config?: MonacoConfig): MonacoEditorProvider
```

- `config` — Monaco-specific editor options (theme, font size, etc.).

**Returns:** A `MonacoEditorProvider` that manages Monaco Editor instances.

#### `preloadMonaco()`

Warm the Monaco core bundle ahead of the first {@link MonacoEditorProvider.mount}.

Monaco is a large library loaded via `await import('monaco-editor')` inside
`mount()`, which lets it code-split out of the initial app bundle. The cost is
that the first editor mount has to download ~1 MB before it can paint. Call
this during idle time (e.g. while the user is still on the landing page) to
fetch that exact chunk into the browser cache in advance — `mount()` then
resolves its `import('monaco-editor')` from cache and the editor appears with
no network wait.

Uses the identical bare specifier as `mount()`, so the bundler resolves both
to the same chunk and they share one download and one cache entry. Idempotent
and best-effort: the returned promise never rejects the caller's flow.

```typescript
function preloadMonaco(): Promise<unknown>
```

**Returns:** A promise that resolves once the Monaco core module is fetched.

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: MonacoEditorProvider
```

## Core Interface
Implements `@molecule/app-code-editor` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/app-code-editor'
import { provider } from '@molecule/app-code-editor-monaco'

export function setupCodeEditorMonaco(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-code-editor` ^1.0.0
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `monaco-editor` >=0.40.0

### Runtime Dependencies

- `@molecule/app-code-editor`
- `@molecule/app-i18n`
- `@molecule/app-logger`
- `monaco-editor`

- Monaco is code-split: `mount()` does `await import('monaco-editor')`
  (~1 MB) on first use — call `preloadMonaco()` during idle time to
  prefetch. `monaco-editor` is a peer dependency your app must install.
- **TypeScript/JavaScript IntelliSense needs an LSP connection.** This
  bond deliberately does NOT load Monaco's TS worker (it would try to
  resolve imports in the browser and freeze the tab); TS/JS gets syntax
  highlighting out of the box, and completion/hover/diagnostics only
  after `provider.connectLsp(wsUrl)` — a WebSocket URL to a running LSP
  server. JSON/CSS/HTML language features work without LSP via their
  bundled workers.
- Default theme is the bundled `'molecule-dark'` (registered at mount),
  not Monaco's `'vs-dark'`.
