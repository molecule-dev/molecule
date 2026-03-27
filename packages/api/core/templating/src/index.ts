/**
 * Provider-agnostic template rendering interface for molecule.dev.
 *
 * Defines the `TemplateProvider` interface for rendering templates, compiling
 * templates for reuse, and registering helpers and partials. Bond packages
 * (Handlebars, MJML, Liquid, etc.) implement this interface. Application code
 * uses the convenience functions (`render`, `compile`, `renderCompiled`,
 * `registerHelper`, `registerPartial`) which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, render, compile, renderCompiled } from '@molecule/api-templating'
 * import { provider as handlebars } from '@molecule/api-templating-handlebars'
 *
 * setProvider(handlebars)
 *
 * const html = await render('Hello {{name}}!', { name: 'World' })
 *
 * const compiled = await compile('Hello {{name}}!')
 * const fast = renderCompiled(compiled, { name: 'Fast' })
 * ```
 *
 * @module
 */

// Type exports
export * from './types.js'

// Provider exports
export * from './provider.js'
