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
 * @example
 * ```tsx
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
