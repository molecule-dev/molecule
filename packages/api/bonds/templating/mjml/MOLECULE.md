# @molecule/api-templating-mjml

MJML email template provider for molecule.dev.

Implements the `TemplateProvider` interface using MJML for responsive email
template rendering. Variable interpolation uses Handlebars syntax. Templates
are first interpolated with data, then compiled from MJML to responsive HTML
that works across all major email clients.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-templating-mjml
```

## Usage

```typescript
import { setProvider, render } from '@molecule/api-templating'
import { provider } from '@molecule/api-templating-mjml'

setProvider(provider)

const html = await render(`
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text>Hello {{name}}!</mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`, { name: 'World' })
```

## API

### Interfaces

#### `MjmlTemplateConfig`

Configuration options for the MJML template provider.

```typescript
interface MjmlTemplateConfig {
  /**
   * Validation level for MJML templates.
   * - `'strict'` — throws on any MJML error (default)
   * - `'soft'` — renders despite errors, attaching warnings
   * - `'skip'` — no validation at all
   */
  validationLevel?: MjmlValidationLevel

  /** Whether to minify the HTML output. Defaults to `false`. */
  minify?: boolean

  /** Whether to beautify the HTML output. Defaults to `false`. */
  beautify?: boolean

  /** File path for resolving `mj-include` relative paths. */
  filePath?: string

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

### Types

#### `MjmlValidationLevel`

MJML validation level for template processing.

```typescript
type MjmlValidationLevel = 'strict' | 'soft' | 'skip'
```

### Functions

#### `createProvider(config)`

Creates an MJML template provider.

```typescript
function createProvider(config?: MjmlTemplateConfig): TemplateProvider
```

- `config` — Provider configuration.

**Returns:** A `TemplateProvider` backed by MJML with Handlebars interpolation.

### Constants

#### `provider`

The provider implementation with default configuration (soft validation).

```typescript
const provider: TemplateProvider
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-templating` ^1.0.0
