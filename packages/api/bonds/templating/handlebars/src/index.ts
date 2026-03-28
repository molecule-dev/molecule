/**
 * Handlebars template provider for molecule.dev.
 *
 * Implements the `TemplateProvider` interface using the Handlebars template
 * engine. Supports Mustache-compatible syntax with helpers, partials, and
 * pre-compiled templates for fast rendering.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-templating'
 * import { provider } from '@molecule/api-templating-handlebars'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
