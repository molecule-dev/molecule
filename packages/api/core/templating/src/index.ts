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
 * const fast = await renderCompiled(compiled, { name: 'Fast' })
 * ```
 *
 * @remarks
 * - **User input goes in the DATA argument, never into the template string.** A template is
 *   CODE to the engine (expressions, helpers, partials) — concatenating user text into it is
 *   template injection. `render(trustedTemplate, userData)` is the safe shape.
 * - Interpolated values are HTML-escaped by default in the HTML bonds; raw interpolation
 *   (e.g. Handlebars triple-stash, or a bond's `escape: false` config) re-opens XSS —
 *   reserve it for markup you generated server-side.
 * - Register helpers/partials BEFORE rendering templates that use them — do
 *   `registerHelper`/`registerPartial` at startup alongside `setProvider`, not lazily in
 *   handlers.
 * - `compile()` returns an opaque {@link CompiledTemplate} — reuse it for hot paths (e.g.
 *   an email loop) instead of re-parsing the same template per render.
 * - This package renders STRINGS; pair it with the emails/pdf packages for delivery (e.g.
 *   the MJML bond turns email markup into inline-styled HTML for `sendMail`).
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
