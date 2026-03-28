# @molecule/api-templating-handlebars

Handlebars template provider for molecule.dev.

Implements the `TemplateProvider` interface using the Handlebars template
engine. Supports Mustache-compatible syntax with helpers, partials, and
pre-compiled templates for fast rendering.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-templating-handlebars
```

## Usage

```typescript
import { setProvider } from '@molecule/api-templating'
import { provider } from '@molecule/api-templating-handlebars'

setProvider(provider)
```

## API

### Interfaces

#### `HandlebarsTemplateConfig`

Configuration options for the Handlebars template provider.

```typescript
interface HandlebarsTemplateConfig {
  /** Whether to HTML-escape output by default. Defaults to `true`. */
  escape?: boolean

  /**
   * Built-in helpers to register on creation.
   * Keys are helper names, values are helper functions.
   */
  helpers?: Record<string, (...args: unknown[]) => string>

  /**
   * Built-in partials to register on creation.
   * Keys are partial names, values are partial template strings.
   */
  partials?: Record<string, string>
}
```

### Functions

#### `createProvider(config)`

Creates a Handlebars template provider.

```typescript
function createProvider(config?: HandlebarsTemplateConfig): TemplateProvider
```

- `config` — Provider configuration.

**Returns:** A `TemplateProvider` backed by Handlebars.

### Constants

#### `provider`

The provider implementation with default configuration.

```typescript
const provider: TemplateProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-templating` ^1.0.0
