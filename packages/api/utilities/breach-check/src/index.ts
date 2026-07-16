/**
 * Have-I-Been-Pwned (HIBP) k-anonymity password breach check for molecule.dev.
 *
 * Computes a SHA-1 hash of a plaintext password locally, transmits only the
 * first 5 hex characters of the hash to the HIBP password range API, and
 * scans the response locally for a match. The full hash is never sent.
 *
 * @example
 * ```ts
 * import { checkPassword } from '@molecule/api-breach-check'
 *
 * const result = await checkPassword('hunter2')
 * if (result.pwned) {
 *   throw new Error(`password seen in ${result.count} breaches`)
 * }
 * ```
 *
 * @remarks
 * Privacy contract: the plaintext password and its full SHA-1 hash never
 * leave the calling process. Only the 5-character k-anonymity prefix is
 * transmitted. The optional `padding` flag (default `true`) instructs HIBP
 * to pad responses to thwart traffic analysis. An optional cache adapter
 * (compatible with `@molecule/api-cache`) can be supplied to coalesce
 * repeated lookups for the same prefix.
 *
 * Network + failure mode: each uncached call makes one outbound HTTPS GET to
 * `https://api.pwnedpasswords.com/range/{prefix}` (override host via
 * `options.apiUrl`; 5 s default timeout). The check FAILS CLOSED — on any
 * non-2xx, timeout, or network failure `checkPassword` THROWS instead of
 * returning "not breached". Callers must choose a policy: wrap in try/catch
 * and either block the flow or allow-with-logging while HIBP is unreachable —
 * never let the raw error take signup down, and never swallow it into an
 * implicit "safe". In environments that force egress through an HTTP proxy
 * (e.g. molecule.dev sandboxes), Node's built-in fetch ignores
 * HTTP_PROXY/HTTPS_PROXY — pass a proxy-aware implementation via
 * `options.fetch`, and ensure the HIBP host is on the egress allowlist.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './checkPassword.js'
export * from './sha1Prefix.js'
export * from './types.js'
