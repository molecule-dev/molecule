/**
 * Real-time password-strength meter for React.
 *
 * Renders a 5-segment colored bar (red→green), a textual strength
 * label, and an optional rule checklist (length, upper, lower, digit,
 * symbol, no-common). Score is computed by an in-package lightweight
 * scorer — no zxcvbn dependency — using length × char-class entropy
 * with a small built-in common-password dictionary penalty.
 *
 * Used by signup, password-change, and password-manager flows to
 * gate weak passwords before submit. All styling flows through
 * `getClassMap()`; all text flows through `t()`; companion locale
 * bond is `@molecule/app-locales-password-strength-meter`.
 *
 * @remarks
 * `minScore` only surfaces as a `data-meets-min` attribute on the bar — gate
 * your submit button on the `onScore` value yourself (as in the example).
 * Segment colors read `var(--mol-color-error/warning/info/success)` with
 * built-in light fallbacks; molecule scaffolds define these in theme.css.
 * Companion locale bond: `@molecule/app-locales-password-strength-meter`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 * import { PasswordStrengthMeter } from '@molecule/app-password-strength-meter-react'
 *
 * function SignupForm() {
 *   const [password, setPassword] = useState('')
 *   const [score, setScore] = useState(0)
 *   return (
 *     <>
 *       <input value={password} onChange={(e) => setPassword(e.target.value)} />
 *       <PasswordStrengthMeter
 *         password={password}
 *         onScore={setScore}
 *         minScore={2}
 *         showChecklist
 *       />
 *       <button disabled={score < 2}>Sign up</button>
 *     </>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './PasswordStrengthMeter.js'
export * from './scorer.js'
