/**
 * MJML email template provider for molecule.dev.
 *
 * Implements the `TemplateProvider` interface using MJML for responsive email
 * template rendering. Variable interpolation uses Handlebars syntax. Templates
 * are first interpolated with data, then compiled from MJML to responsive HTML
 * that works across all major email clients.
 *
 * @example
 * ```typescript
 * import { setProvider, render } from '@molecule/api-templating'
 * import { provider } from '@molecule/api-templating-mjml'
 *
 * setProvider(provider)
 *
 * const html = await render(`
 *   <mjml>
 *     <mj-body>
 *       <mj-section>
 *         <mj-column>
 *           <mj-text>Hello {{name}}!</mj-text>
 *         </mj-column>
 *       </mj-section>
 *     </mj-body>
 *   </mjml>
 * `, { name: 'World' })
 * ```
 *
 * @remarks
 * - Validation defaults to `'soft'` (render despite MJML errors). Set
 *   `createProvider({ validationLevel: 'strict' })` to make `render()` throw
 *   on invalid MJML — but note `renderCompiled()` skips validation entirely.
 * - `compile()` pre-compiles only the Handlebars interpolation; the MJML →
 *   responsive-HTML conversion still runs on every `renderCompiled()` call.
 * - Raw (unescaped) interpolation is per-render only (`options.escape:
 *   false` on `render()`); compiled templates always escape.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
