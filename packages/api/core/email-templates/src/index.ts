/**
 * Transactional email templates for molecule.dev.
 *
 * Provides a small registry of i18n-driven templates (subscription started,
 * renewed, canceled, payment failed, usage-limit warning, trial ending) plus
 * a `sendTemplate(...)` convenience wrapper around the bonded
 * `@molecule/api-emails` transport.
 *
 * Apps can override individual templates by calling `registerTemplate(...)`
 * with the same key, register entirely new templates, or render templates
 * directly via `renderTemplate(...)` for delivery channels other than email.
 *
 * @example
 * ```typescript
 * import { sendTemplate, TEMPLATE_KEYS } from '@molecule/api-email-templates'
 *
 * await sendTemplate(TEMPLATE_KEYS.subscriptionStarted, {
 *   from: 'support@example.com',
 *   to: 'user@example.com',
 *   locale: 'en',
 *   variables: {
 *     appName: 'Personal Finance',
 *     userName: 'Lou',
 *     planName: 'Pro',
 *     amount: '$19.00',
 *     period: 'month',
 *     manageUrl: 'https://app.example.com/billing',
 *   },
 * })
 * ```
 *
 * @remarks
 * This is a library on top of two bonds — BOTH must be wired before
 * `sendTemplate()` works:
 *
 * - **`@molecule/api-emails` transport bonded** (`sendTemplate` dispatches via
 *   the bonded transport and throws when none is wired) and
 *   **`@molecule/api-i18n` bonded** (subject/text/html resolve through `t()`).
 * - **`sendTemplate` throws on an unregistered key.** Built-ins cover only the
 *   subscription lifecycle (`TEMPLATE_KEYS.*`). Any other template must be
 *   registered at startup first:
 *   `registerTemplate({ key, subjectKey, defaultSubject, textKey, defaultText, ... })`.
 *   Overriding a built-in = registering with the SAME key (overrides win).
 * - **Interpolation is `{{variable}}` via i18n.** Pass every variable the
 *   template references in `variables`; strings/numbers/booleans/Dates pass
 *   through, anything else is JSON-stringified.
 * - For non-email channels (SMS, in-app inbox), call `renderTemplate(...)` and
 *   dispatch the `RenderedEmail` yourself.
 * - The emails-core rules apply to every send: the recipient comes from the
 *   authenticated account, never a client-named address; no secrets in
 *   subject or body.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual emails/flows, and check every box off one by
 * one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Rendering a template with a record's real data produces correct
 *   output: EVERY variable is filled — no leftover `{{placeholder}}`,
 *   `undefined`, or `[object Object]` survives in the subject, text, or html —
 *   and the html and text parts carry the same copy/links (consistent).
 * - [ ] A transactional email the app actually sends (subscription started,
 *   payment failed, a welcome / password-reset / receipt) goes out via
 *   `sendTemplate` with that record's real data — never a mock. The sandbox
 *   CAPTURES outbound email instead of delivering it — read it with the
 *   `read_activity` tool (filter type 'email') and confirm the captured
 *   subject + body match the template rendered with that record's data. Don't
 *   modify production code to expose the send.
 * - [ ] Different input yields different output: rendering (or sending) the
 *   same template twice with different data produces two different messages,
 *   not a cached first render reused for the second recipient.
 * - [ ] If the app exposes locale, rendering the same template in another
 *   locale produces translated subject/body copy — not the English fallback.
 * - [ ] Missing or extra variables are handled cleanly — a required variable
 *   with no value errors or falls back to sensible copy; a raw `{{placeholder}}`,
 *   `undefined`, or `[object Object]` is NEVER shipped in the delivered email.
 * - [ ] SECURITY — a user-supplied value (a name, note, or other free-text
 *   field) interpolated into the template is ESCAPED in the html body: entering
 *   `<script>` / `<img onerror=...>` / `{{amount}}` as a name renders as inert
 *   text, never live markup or a second interpolation (no HTML/template
 *   injection). No secret (API key, transport credential, token) ever appears
 *   in a rendered subject or body.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './defaults.js'
export * from './registry.js'
export * from './render.js'
export * from './send.js'
export * from './types.js'
