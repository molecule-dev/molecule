# @molecule/app-markdown-react-markdown

react-markdown provider for \@molecule/app-markdown.

Provides a regex-based markdown-to-HTML renderer conforming to
the molecule markdown provider interface.

## Quick Start

```typescript
import { provider } from '@molecule/app-markdown-react-markdown'
import { setProvider } from '@molecule/app-markdown'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/app-markdown-react-markdown
```

## API

### Interfaces

#### `ReactMarkdownConfig`

Provider-specific configuration options.

```typescript
interface ReactMarkdownConfig {
  /** Whether to sanitize HTML by default. Defaults to `true`. */
  sanitize?: boolean

  /** Whether to enable GFM by default. Defaults to `true`. */
  gfm?: boolean
}
```

### Functions

#### `createProvider(config)`

Creates a react-markdown-compatible provider instance.

```typescript
function createProvider(config?: ReactMarkdownConfig): MarkdownProvider
```

- `config` — Optional provider configuration.

**Returns:** A configured MarkdownProvider.

### Constants

#### `provider`

Default react-markdown provider instance.

```typescript
const provider: MarkdownProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-markdown` ^1.0.0
