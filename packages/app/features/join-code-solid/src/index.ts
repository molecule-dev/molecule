/**
 * Solid multi-slot join-code input.
 *
 * Exports `<JoinCode>` — N-slot single-character input with auto-advance,
 * paste-to-fill, alphabet validation, and `onComplete` notification. It is the
 * Solid counterpart of `@molecule/app-join-code-react`: same props (React
 * names), same DOM for the same input, so an app switches framework by changing
 * only the package name in its imports.
 *
 * Companion locale bond: `@molecule/app-locales-join-code`.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { render } from 'solid-js/web'
 * import { JoinCode } from '@molecule/app-join-code-solid'
 *
 * function Verify() {
 *   const [code, setCode] = createSignal('')
 *   return (
 *     <JoinCode
 *       length={6}
 *       alphabet="alphanumeric"
 *       value={code()}
 *       onChange={(next) => setCode(next)}
 *       onComplete={(next) => verifyCode(next)}
 *     />
 *   )
 * }
 *
 * render(() => <Verify />, document.getElementById('app')!)
 * ```
 *
 * @remarks
 * - Requires the app's i18n provider (any `@molecule/app-solid` wiring) so the
 *   group and slot aria-labels translate; the keys are `joinCode.label` and
 *   `joinCode.slotAriaLabel`.
 * - Styling is delegated to `getClassMap()` — no Tailwind utility strings live
 *   in this package.
 * - `onChange` is the React-named callback prop; it receives the whole current
 *   code (which may be shorter than `length`), not the slot's character.
 *
 * @module
 */

export * from './JoinCode.jsx'
export * from './types.js'
