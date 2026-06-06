/**
 * React multi-slot join-code input.
 *
 * Exports:
 * - `<JoinCode>` — N-slot single-character input with auto-advance, paste-to-fill,
 *   alphabet validation, and `onComplete` notification.
 * - `JoinCodeProps`, `JoinCodeAlphabet` — public types.
 *
 * Companion locale bond: `@molecule/app-locales-join-code`.
 *
 * @example
 * ```tsx
 * import { JoinCode } from '@molecule/app-join-code-react'
 *
 * <JoinCode
 *   length={6}
 *   alphabet="alphanumeric"
 *   onChange={(code) => setCode(code)}
 *   onComplete={(code) => verifyCode(code)}
 * />
 * ```
 * @module
 */

export * from './JoinCode.js'
export * from './types.js'
