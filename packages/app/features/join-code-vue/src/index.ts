/**
 * Vue multi-slot join-code input.
 *
 * Exports `<JoinCode>` — N-slot single-character input with auto-advance,
 * paste-to-fill, alphabet validation, and `onComplete` notification. It is the
 * Vue counterpart of `@molecule/app-join-code-react`: same props (React names),
 * same DOM for the same input, so an app switches framework by changing only
 * the package name in its imports.
 *
 * Companion locale bond: `@molecule/app-locales-join-code`.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { JoinCode } from '@molecule/app-join-code-vue'
 *
 * const Verify = defineComponent({
 *   setup() {
 *     const code = ref('')
 *     return () =>
 *       h(JoinCode, {
 *         length: 6,
 *         alphabet: 'alphanumeric',
 *         value: code.value,
 *         onChange: (next: string) => (code.value = next),
 *         onComplete: (next: string) => verifyCode(next),
 *       })
 *   },
 * })
 *
 * createApp(Verify).mount('#app')
 * ```
 *
 * @remarks
 * - Requires the app's i18n provider (any `@molecule/app-vue` plugin wiring) so
 *   the group and slot aria-labels translate; the keys are `joinCode.label` and
 *   `joinCode.slotAriaLabel`.
 * - Styling is delegated to `getClassMap()` — no Tailwind utility strings live
 *   in this package.
 * - `onChange` is the React-named callback prop; it receives the whole current
 *   code (which may be shorter than `length`), not the slot's character.
 *
 * @module
 */

export * from './JoinCode.js'
export * from './types.js'
