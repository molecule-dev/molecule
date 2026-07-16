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
 * @module
 */

export * from './browser-guard.js'
export * from './defaults.js'
export * from './registry.js'
export * from './render.js'
export * from './send.js'
export * from './types.js'
