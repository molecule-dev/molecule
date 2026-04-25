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
 * @module
 */

export * from './types.js'
export * from './defaults.js'
export * from './registry.js'
export * from './render.js'
export * from './send.js'
