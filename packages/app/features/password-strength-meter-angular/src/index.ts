/**
 * Real-time password-strength meter for Angular.
 *
 * Renders a 5-segment colored bar (red→green), a textual strength
 * label, and an optional rule checklist (length, upper, lower, digit,
 * symbol, no-common). Score is computed by an in-package lightweight
 * scorer — no zxcvbn dependency — using length × character-class entropy
 * with a small built-in common-password dictionary penalty.
 *
 * Used by signup, password-change, and password-manager flows to
 * gate weak passwords before submit. All styling flows through
 * `getClassMap()`; all text flows through `t()`; companion locale
 * bond is `@molecule/app-locales-password-strength-meter`. It is the Angular
 * counterpart of `@molecule/app-password-strength-meter-react`: same props
 * and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { PasswordStrengthMeter } from '@molecule/app-password-strength-meter-angular'
 *
 * @Component({
 *   selector: 'app-signup-form',
 *   standalone: true,
 *   imports: [PasswordStrengthMeter],
 *   template: `
 *     <input [value]="password()" (input)="onInput($event)" />
 *     <div
 *       mol-password-strength-meter
 *       [password]="password()"
 *       [onScore]="setScore"
 *       [minScore]="2"
 *       [showChecklist]="true"
 *     ></div>
 *     <button [disabled]="score() < 2">Sign up</button>
 *   `,
 * })
 * export class SignupForm {
 *   readonly password = signal('')
 *   readonly score = signal(0)
 *   readonly setScore = (next: number): void => this.score.set(next)
 *
 *   onInput(event: Event): void {
 *     this.password.set((event.target as HTMLInputElement).value)
 *   }
 * }
 * ```
 *
 * @remarks
 * `minScore` only surfaces as a `data-meets-min` attribute on the bar — gate
 * your submit button on the `onScore` value yourself (as in the example).
 * Segment colors read `var(--mol-color-error/warning/info/success)` with
 * built-in light fallbacks; molecule scaffolds define these in theme.css.
 * Companion locale bond: `@molecule/app-locales-password-strength-meter`.
 *
 * @module
 */

export * from './password-strength-meter.component.js'
export * from './scorer.js'
export * from './types.js'
