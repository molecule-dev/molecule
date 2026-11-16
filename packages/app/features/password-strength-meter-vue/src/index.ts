/**
 * Real-time password-strength meter for Vue.
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
 * bond is `@molecule/app-locales-password-strength-meter`. It is the Vue
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
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { PasswordStrengthMeter } from '@molecule/app-password-strength-meter-vue'
 *
 * const SignupForm = defineComponent({
 *   setup() {
 *     const password = ref('')
 *     const score = ref(0)
 *     return () =>
 *       h('form', [
 *         h('input', {
 *           value: password.value,
 *           onInput: (event: Event) =>
 *             (password.value = (event.target as HTMLInputElement).value),
 *         }),
 *         h(PasswordStrengthMeter, {
 *           password: password.value,
 *           onScore: (next: number) => (score.value = next),
 *           minScore: 2,
 *           showChecklist: true,
 *         }),
 *         h('button', { disabled: score.value < 2 }, 'Sign up'),
 *       ])
 *   },
 * })
 * ```
 *
 * @module
 */

export * from './PasswordStrengthMeter.js'
export * from './scorer.js'
export * from './types.js'
