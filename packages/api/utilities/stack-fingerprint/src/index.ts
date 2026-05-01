/**
 * Error stack-trace fingerprinting for `@molecule/api-stack-fingerprint`.
 *
 * Pure functions. Input: an error's `message`, `stack`, and optional
 * class `type`. Output: a stable SHA-1 fingerprint hash plus a
 * grouping key. Use it to dedupe noisy production errors, build
 * issue-tracker UIs (e.g. the `error-tracker` flagship), or implement
 * a Sentry-style "group by stack-trace shape" pipeline.
 *
 * @example
 * ```ts
 * import { fingerprintError, groupErrors } from '@molecule/api-stack-fingerprint'
 *
 * try {
 *   risky()
 * } catch (err) {
 *   const e = err as Error
 *   const id = fingerprintError({
 *     type: e.name,
 *     message: e.message,
 *     stack: e.stack,
 *   })
 *   // -> '8b3a...': stable across runs / machines / Node versions
 * }
 * ```
 *
 * @module
 */

export * from './fingerprintError.js'
export * from './groupErrors.js'
export * from './normalizeFrame.js'
export * from './parseStackFrames.js'
export * from './types.js'
