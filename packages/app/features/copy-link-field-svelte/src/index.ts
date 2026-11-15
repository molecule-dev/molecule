/**
 * Svelte copy-link field.
 *
 * Exports `<CopyLinkField>` — read-only input + copy-to-clipboard button with
 * "Copied!" feedback. Svelte counterpart of
 * `@molecule/app-copy-link-field-react`: the same props (React names), the
 * same DOM for the same input, the same ClassMap tokens and i18n keys.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import { CopyLinkField } from '@molecule/app-copy-link-field-svelte'
 *
 *   setMoleculeContext({ i18n: i18nProvider })
 * </script>
 *
 * <CopyLinkField
 *   label="Share link"
 *   value="https://example.com/invite/abc123"
 *   onCopy={() => console.log('copied')}
 *   feedbackMs={2000}
 * />
 * ```
 *
 * @remarks
 * Copying uses `navigator.clipboard`, which exists only in secure contexts
 * (HTTPS / localhost) — elsewhere the button silently does nothing and
 * `onCopy` never fires. The input is read-only and selects its content on
 * focus, so manual Ctrl/Cmd+C still works as the fallback. Labels use
 * `copyLink.*` i18n keys (companion bond:
 * `@molecule/app-locales-copy-link-field`), read through the binding's
 * `useTranslation()` — the bonded `@molecule/app-i18n` provider satisfies it,
 * so the static `t` works wherever the provider is bonded. Styling routes
 * through ClassMap tokens (`cm.stack(1)`, `cm.flex`, `cm.input()`,
 * `cm.flex1`) and requires a bonded ClassMap (e.g.
 * `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
