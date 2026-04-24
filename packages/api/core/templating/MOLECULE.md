# @molecule/api-templating

Provider-agnostic template rendering interface for molecule.dev.

Defines the `TemplateProvider` interface for rendering templates, compiling
templates for reuse, and registering helpers and partials. Bond packages
(Handlebars, MJML, Liquid, etc.) implement this interface. Application code
uses the convenience functions (`render`, `compile`, `renderCompiled`,
`registerHelper`, `registerPartial`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, render, compile, renderCompiled } from '@molecule/api-templating'
import { provider as handlebars } from '@molecule/api-templating-handlebars'

setProvider(handlebars)

const html = await render('Hello {{name}}!', { name: 'World' })

const compiled = await compile('Hello {{name}}!')
const fast = renderCompiled(compiled, { name: 'Fast' })
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-templating
```

## API

### Interfaces

#### `CompiledTemplate`

A compiled template that can be rendered multiple times with different data
without re-parsing.

```typescript
interface CompiledTemplate {
  /** An opaque identifier for the compiled template. */
  id: string

  /** The original template source string. */
  source: string

  /**
   * Provider-specific compiled representation.
   * This is intentionally opaque — callers use `renderCompiled()` to render.
   */
  compiled: unknown
}
```

#### `RenderOptions`

Configuration options for template rendering.

```typescript
interface RenderOptions {
  /** Whether to HTML-escape output by default. Defaults to `true`. */
  escape?: boolean

  /** Additional helpers available during rendering. */
  helpers?: Record<string, TemplateHelper>

  /** Additional partials available during rendering. */
  partials?: Record<string, string>
}
```

#### `TemplateConfig`

Configuration options for template providers.

```typescript
interface TemplateConfig {
  /** Whether to HTML-escape output by default. Defaults to `true`. */
  escape?: boolean

  /** Directory path to load template files from. */
  templateDir?: string

  /** File extension for template files (e.g., `'.hbs'`, `'.mjml'`). */
  fileExtension?: string
}
```

#### `TemplateProvider`

Template provider interface.

All template providers must implement this interface. Bond packages
(Handlebars, MJML, Liquid, etc.) provide concrete implementations.

```typescript
interface TemplateProvider {
  /**
   * Renders a template string with the provided data.
   *
   * @param template - The template source string.
   * @param data - Key-value pairs to inject into the template.
   * @param options - Optional rendering configuration.
   * @returns The rendered output string.
   */
  render(template: string, data: Record<string, unknown>, options?: RenderOptions): Promise<string>

  /**
   * Pre-compiles a template for repeated rendering. Use this when the same
   * template will be rendered multiple times with different data.
   *
   * @param template - The template source string.
   * @returns A compiled template object.
   */
  compile(template: string): Promise<CompiledTemplate>

  /**
   * Renders a previously compiled template with the provided data.
   * This is faster than `render()` for templates used multiple times.
   *
   * @param compiled - A compiled template from `compile()`.
   * @param data - Key-value pairs to inject into the template.
   * @returns The rendered output string.
   */
  renderCompiled(compiled: CompiledTemplate, data: Record<string, unknown>): string

  /**
   * Registers a named helper function available in all templates.
   *
   * @param name - The helper name used in templates (e.g., `{{uppercase name}}`).
   * @param fn - The helper implementation.
   */
  registerHelper(name: string, fn: TemplateHelper): void

  /**
   * Registers a named partial template that can be included in other templates.
   *
   * @param name - The partial name used in templates (e.g., `{{> header}}`).
   * @param template - The partial template source string.
   */
  registerPartial(name: string, template: string): void
}
```

### Types

#### `TemplateHelper`

A template helper function registered with the template engine.
Receives arguments from the template and returns a string.

```typescript
type TemplateHelper = (...args: unknown[]) => string
```

### Functions

#### `compile(template)`

Pre-compiles a template for repeated rendering.

```typescript
function compile(template: string): Promise<CompiledTemplate>
```

- `template` — The template source string.

**Returns:** A compiled template object.

#### `getProvider()`

Retrieves the bonded template provider, throwing if none is configured.

```typescript
function getProvider(): TemplateProvider
```

**Returns:** The bonded template provider.

#### `hasProvider()`

Checks whether a template provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a template provider is bonded.

#### `registerHelper(name, fn)`

Registers a named helper function available in all templates.

```typescript
function registerHelper(name: string, fn: TemplateHelper): void
```

- `name` — The helper name used in templates.
- `fn` — The helper implementation.

#### `registerPartial(name, template)`

Registers a named partial template that can be included in other templates.

```typescript
function registerPartial(name: string, template: string): void
```

- `name` — The partial name used in templates.
- `template` — The partial template source string.

#### `render(template, data, options)`

Renders a template string with the provided data.

```typescript
function render(template: string, data: Record<string, unknown>, options?: RenderOptions): Promise<string>
```

- `template` — The template source string.
- `data` — Key-value pairs to inject into the template.
- `options` — Optional rendering configuration.

**Returns:** The rendered output string.

#### `renderCompiled(compiled, data)`

Renders a previously compiled template with the provided data.

```typescript
function renderCompiled(compiled: CompiledTemplate, data: Record<string, unknown>): string
```

- `compiled` — A compiled template from `compile()`.
- `data` — Key-value pairs to inject into the template.

**Returns:** The rendered output string.

#### `setProvider(provider)`

Registers a template provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: TemplateProvider): void
```

- `provider` — The template provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
