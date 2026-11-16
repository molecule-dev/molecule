/**
 * Real-time password-strength meter for Svelte.
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
 * bond is `@molecule/app-locales-password-strength-meter`. It is the Svelte
 * counterpart of `@molecule/app-password-strength-meter-react`: same props
 * and the same DOM for the same input.
 *
 * @remarks
 * `minScore` only surfaces as a `data-meets-min` attribute on the bar — gate
 * your submit button on the `onScore` value yourself (as in the example).
 * Segment colors read `var(--mol-color-error/warning/info/success)` with
 * built-in light fallbacks; molecule scaffolds define these in theme.css.
 * Companion locale bond: `@molecule/app-locales-password-strength-meter`.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PasswordStrengthMeter } from '@molecule/app-password-strength-meter-svelte'
 *
 *   let password = $state('')
 *   let score = $state(0)
 * </script>
 *
 * <input bind:value={password} />
 * <PasswordStrengthMeter
 *   {password}
 *   onScore={(next) => (score = next)}
 *   minScore={2}
 *   showChecklist
 * />
 * <button disabled={score < 2}>Sign up</button>
 * ```
 *
 * @module
 */

export * from './components.js'
export * from './scorer.js'
export * from './types.js'
