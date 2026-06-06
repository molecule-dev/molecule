/**
 * Email subscribe form.
 *
 * Exports `<NewsletterSignup>` with inline + stacked layouts.
 *
 * @example
 * ```tsx
 * import { NewsletterSignup } from '@molecule/app-newsletter-signup-react'
 *
 * <NewsletterSignup
 *   title="Stay in the loop"
 *   description="Get weekly updates delivered to your inbox."
 *   onSubscribe={async (email) => { await api.subscribe(email) }}
 *   layout="inline"
 *   successContent={<p>Thanks for subscribing!</p>}
 * />
 * ```
 * @module
 */

export * from './NewsletterSignup.js'
