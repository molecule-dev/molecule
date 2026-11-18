/**
 * Vue password generator feature for molecule.dev.
 *
 * Exports `PasswordGenerator` — a configurable, cryptographically-secure
 * password generator UI (length slider, character-class toggles, copy +
 * regenerate buttons, optional `onPick` for wiring into forms /
 * password-manager save flows).
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { PasswordGenerator } from '@molecule/app-password-generator-vue'
 *
 * const NewLoginForm = defineComponent({
 *   setup() {
 *     const password = ref('')
 *     return () =>
 *       h('div', [
 *         h('input', {
 *           type: 'password',
 *           value: password.value,
 *           onInput: (event: Event) => {
 *             password.value = (event.target as HTMLInputElement).value
 *           },
 *         }),
 *         h(PasswordGenerator, {
 *           defaultLength: 24,
 *           autoCopy: true,
 *           onPick: (generated: string) => {
 *             password.value = generated
 *           },
 *         }),
 *       ])
 *   },
 * })
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-password-generator`.
 * Copy/autoCopy go through `@molecule/app-clipboard`'s
 * `copyTextWithFallback()`: the bonded clipboard provider (the Clipboard API
 * plus a selection-and-copy fallback) or the legacy copy command when no
 * provider is bonded. It never throws, and when no copy happened no
 * "Copied!" confirmation appears — the user can still select the read-only
 * field or click "Use this password". Generation itself needs
 * `crypto.getRandomValues` (browsers + Node 20; it throws where WebCrypto is
 * missing, e.g. very old SSR runtimes).
 *
 * @module
 */

export * from './generator.js'
export * from './PasswordGenerator.js'
export * from './types.js'
