/**
 * Email capture provider for molecule.dev.
 *
 * Records every `sendMail()` call as an activity event. Intercept-only by
 * default (synthetic success); delegates + tees when wrapping a real transport.
 *
 * @example
 * ```typescript
 * import { setTransport } from '@molecule/api-emails'
 * import { provider } from '@molecule/api-emails-capture'
 *
 * setTransport(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
