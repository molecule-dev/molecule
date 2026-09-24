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
 * import { render, setProvider } from '@molecule/api-templating'
 * import { createProvider } from '@molecule/api-templating-mjml'
 *
 * // Startup: bond once. 'strict' makes render() throw on invalid MJML instead of guessing.
 * setProvider(createProvider({ validationLevel: 'strict' }))
 *
 * // Handlebars placeholders are filled FIRST (HTML-escaped), then MJML becomes email HTML.
 * const html = await render(
 *   `<mjml>
 *     <mj-body>
 *       <mj-section>
 *         <mj-column>
 *           <mj-text font-size="20px">Welcome, {{name}}!</mj-text>
 *           <mj-button href="{{verifyUrl}}">Verify your email</mj-button>
 *         </mj-column>
 *       </mj-section>
 *     </mj-body>
 *   </mjml>`,
 *   { name: 'Ada', verifyUrl: 'https://app.example.com/verify?token=abc123' },
 * )
 * // A full '<!doctype html>…' document (inline styles + tables) — pass it as `html` to sendMail().
 * ```
 *
 * @remarks
 * - **The template must be a complete `<mjml><mj-body>…</mj-body></mjml>` document** — a
 *   bare HTML fragment is not MJML. The result is a whole HTML document, not a fragment to
 *   embed; it does NOT send anything (hand it to `sendMail()` from `@molecule/api-emails`).
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
