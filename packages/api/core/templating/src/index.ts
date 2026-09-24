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
 * import {
 *   compile,
 *   registerHelper,
 *   registerPartial,
 *   render,
 *   renderCompiled,
 *   setProvider,
 * } from '@molecule/api-templating'
 * import { createProvider } from '@molecule/api-templating-handlebars'
 *
 * // Startup: bond the provider, then register helpers/partials BEFORE any render.
 * setProvider(createProvider({ escape: true }))
 * registerHelper('upper', (value) => String(value).toUpperCase())
 * registerPartial('footer', '<p>Sent by {{appName}}</p>')
 *
 * // Trusted template + untrusted DATA: `{{name}}` is HTML-escaped.
 * const html = await render('<h1>Hello {{upper name}}</h1>{{> footer}}', {
 *   name: '<b>ada</b>',
 *   appName: 'Acme',
 * })
 * // '<h1>Hello &lt;B&gt;ADA&lt;/B&gt;</h1><p>Sent by Acme</p>'
 *
 * // Hot path: compile once, render many.
 * const greeting = await compile('Hi {{name}}, your order #{{orderId}} shipped.')
 * const recipients = [
 *   { name: 'Ada', orderId: 1001 },
 *   { name: 'Grace', orderId: 1002 },
 * ]
 * const bodies = await Promise.all(recipients.map((r) => renderCompiled(greeting, r)))
 * ```
 *
 * @remarks
 * - **Bond first.** Every function throws until `setProvider(...)` runs.
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
