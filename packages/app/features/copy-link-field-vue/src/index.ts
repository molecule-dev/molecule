/**
 * Vue copy-link field.
 *
 * Exports `<CopyLinkField>` — read-only input + copy-to-clipboard button with
 * "Copied!" feedback. Vue counterpart of `@molecule/app-copy-link-field-react`:
 * the same props (React names), the same DOM for the same input, the same
 * ClassMap tokens and i18n keys.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { moleculePlugin } from '@molecule/app-vue'
 * import { CopyLinkField } from '@molecule/app-copy-link-field-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(CopyLinkField, {
 *         label: 'Share link',
 *         value: 'https://example.com/invite/abc123',
 *         onCopy: () => console.log('copied'),
 *         feedbackMs: 2000,
 *       })
 *   },
 * })
 *
 * const app = createApp(App)
 * app.use(moleculePlugin, { i18n: i18nProvider })
 * app.mount('#app')
 * ```
 *
 * @remarks
 * The copy button copies through `@molecule/app-clipboard`
 * (`copyTextWithFallback` — the bonded clipboard provider first, then a
 * legacy copy fallback — which resolves `false` instead of throwing), so it
 * works on insecure (non-HTTPS) contexts too; the copied feedback shows and
 * `onCopy` fires only when the copy succeeded. The input is read-only and
 * selects its content on focus, so manual Ctrl/Cmd+C still works as the
 * fallback. Labels use `copyLink.*` i18n keys (companion bond:
 * `@molecule/app-locales-copy-link-field`), read through the binding's
 * `useTranslation()` — the bonded `@molecule/app-i18n` provider satisfies it,
 * so the static `t` works wherever the provider is bonded. Styling routes
 * through ClassMap tokens (`cm.stack(1)`, `cm.flex`, `cm.input()`,
 * `cm.flex1`) and requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './CopyLinkField.js'
export * from './types.js'
