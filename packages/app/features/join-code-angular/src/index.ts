/**
 * Angular multi-slot join-code input — the counterpart of
 * `@molecule/app-join-code-react`: the same props (React names) and the same
 * DOM for the same input, so an app switches framework by changing only the
 * package name in its imports.
 *
 * Exports `<JoinCode>` — N-slot single-character input with auto-advance,
 * paste-to-fill, alphabet validation, and `onComplete` notification.
 *
 * Companion locale bond: `@molecule/app-locales-join-code`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { JoinCode } from '@molecule/app-join-code-angular'
 *
 * @Component({
 *   selector: 'app-verify',
 *   standalone: true,
 *   imports: [JoinCode],
 *   template: `
 *     <div
 *       mol-join-code
 *       [length]="6"
 *       [alphabet]="'alphanumeric'"
 *       [value]="code"
 *       [onChange]="setCode"
 *       [onComplete]="verifyCode"
 *     ></div>
 *   `,
 * })
 * export class Verify {
 *   code = ''
 *   readonly setCode = (next: string): void => {
 *     this.code = next
 *   }
 *   readonly verifyCode = (next: string): void => {
 *     // …
 *   }
 * }
 * ```
 *
 * @remarks
 * - The host IS the outer `<div>` (`div[mol-join-code]`), matching React's root
 *   element exactly.
 * - Requires the app's i18n provider so the group and slot aria-labels
 *   translate; the keys are `joinCode.label` and `joinCode.slotAriaLabel`.
 * - Styling is delegated to `getClassMap()` — no Tailwind utility strings live
 *   in this package.
 * - `onChange` is the React-named callback input; it receives the whole current
 *   code (which may be shorter than `length`), not the slot's character.
 *
 * @module
 */

export * from './join-code.component.js'
export * from './types.js'
