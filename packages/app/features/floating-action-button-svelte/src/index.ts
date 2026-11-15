/**
 * Svelte floating action button (FAB) — the Svelte counterpart of
 * `@molecule/app-floating-action-button-react`, with the same props and the
 * same DOM.
 *
 * Exports `FloatingActionButton` — a fixed-position circular button (or anchor
 * when `href` is set) with an icon snippet, native-title tooltip, and four
 * corner-anchoring positions.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { FloatingActionButton } from '@molecule/app-floating-action-button-svelte'
 *
 *   let open = $state(false)
 * </script>
 *
 * <FloatingActionButton label="Create new item" position="bottom-right" onClick={() => (open = true)}>
 *   {#snippet icon()}<span aria-hidden="true">+</span>{/snippet}
 * </FloatingActionButton>
 * ```
 *
 * @remarks
 * The FAB ships with a visible default surface — a primary gradient plus
 * soft elevation (the `gradientPrimary` + `shadowLifted` ClassMap tokens,
 * which also supply a contrasting `on-primary` icon color) — so an
 * out-of-the-box FAB is prominent in both light and dark themes with no
 * extra styling. Pass `className` to override it (e.g. `cm.surface`); caller
 * classes are merged last (tailwind-merge) so they win over the default.
 *
 * `label` doubles as an i18n key: it is resolved through
 * `t(label, {}, { defaultValue: label })`, so passing a translation key
 * localizes the aria-label / tooltip, and plain English strings still work as
 * their own fallback. The tooltip is the native `title` attribute (no styled
 * tooltip component).
 *
 * `href` and `onClick` are mutually exclusive — when `href` is set an `<a>`
 * renders and `onClick` is ignored. The `icon` prop is a snippet; every other
 * prop keeps its React name.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
