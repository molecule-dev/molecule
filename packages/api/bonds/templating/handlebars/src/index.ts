/**
 * Handlebars template provider for molecule.dev.
 *
 * Implements the `TemplateProvider` interface using the Handlebars template
 * engine. Supports Mustache-compatible syntax with helpers, partials, and
 * pre-compiled templates for fast rendering.
 *
 * @example
 * ```typescript
 * import { compile, registerPartial, render, renderCompiled, setProvider } from '@molecule/api-templating'
 * import { createProvider } from '@molecule/api-templating-handlebars'
 *
 * // Startup: bond once, with app-wide helpers (the LAST helper arg is Handlebars' options object).
 * setProvider(
 *   createProvider({
 *     helpers: { money: (cents: unknown) => `$${(Number(cents) / 100).toFixed(2)}` },
 *   }),
 * )
 * registerPartial('footer', '<p>Questions? Reply to this email.</p>')
 *
 * // One-off render — {{ }} HTML-escapes, {{{ }}} does not.
 * const greeting = await render('<h1>Hi {{name}}</h1>', { name: 'Ada <3' })
 * // '<h1>Hi Ada &lt;3</h1>'
 *
 * // Hot path: compile once, render many times.
 * const receipt = await compile(
 *   '<p>Order {{orderId}}: {{#each items}}{{name}} ({{money priceCents}}) {{/each}}</p>{{> footer}}',
 * )
 * const html = await renderCompiled(receipt, {
 *   orderId: 'A-1001',
 *   items: [
 *     { name: 'Mug', priceCents: 1200 },
 *     { name: 'Tee', priceCents: 2500 },
 *   ],
 * })
 * // '<p>Order A-1001: Mug ($12.00) Tee ($25.00) </p><p>Questions? Reply to this email.</p>'
 * ```
 *
 * @remarks
 * - **Output is HTML-escaped by default** (`{{value}}`), including helper return values — use
 *   `{{{value}}}` for trusted HTML, or `createProvider({ escape: false })` for plain-text output
 *   (e.g. SMS bodies) where `&amp;` entities would be wrong.
 * - **Helpers are called with Handlebars' `options` object as the LAST argument** — a helper
 *   declared `(a, b) => …` used as `{{h x}}` gets `b` = that object, not `undefined`.
 * - **Missing values render as an empty string, never throw** — a typo in `{{usernmae}}`
 *   silently prints nothing. Test your templates.
 * - Partials are referenced as `{{> name}}`; an unregistered partial THROWS at render time.
 *   `RenderOptions.helpers`/`partials` passed to `render()` apply to that call only.
 * - Handlebars is logic-less: no arbitrary JS expressions — `{{a + b}}` is a syntax error;
 *   compute values before rendering or write a helper.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
