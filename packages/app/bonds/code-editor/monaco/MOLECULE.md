# @molecule/app-code-editor-monaco

Monaco code editor provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/app-code-editor-monaco
```

## API

### Interfaces

#### `MonacoConfig`

Configuration for monaco.

```typescript
interface MonacoConfig {
  /** Theme for the editor. Defaults to 'vs-dark'. */
  theme?: string
  /** Default font size. */
  fontSize?: number
  /** Default tab size. */
  tabSize?: number
  /** Enable word wrap by default. */
  wordWrap?: boolean
  /** Show minimap by default. */
  minimap?: boolean
  /** CDN URL for Monaco Editor assets. */
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

### Constants

#### `provider`

Pre-instantiated provider singleton.

```typescript
const provider: MonacoEditorProvider
```

## Core Interface
Implements `@molecule/app-code-editor` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-code-editor` ^1.0.0
- `@molecule/app-logger` ^1.0.0
- `monaco-editor` >=0.40.0
