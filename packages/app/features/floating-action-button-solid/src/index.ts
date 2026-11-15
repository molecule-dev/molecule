/**
 * Solid floating action button (FAB).
 *
 * Exports `FloatingActionButton` — the Solid counterpart of
 * `@molecule/app-floating-action-button-react` with the same props and the
 * same DOM: a fixed-position circular button (or anchor when `href` is set)
 * with an icon slot, native-title tooltip, and four corner-anchoring
 * positions.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { FloatingActionButton } from '@molecule/app-floating-action-button-solid'
 * import { Icon } from '@molecule/app-ui-solid'
 *
 * export function CreateFab() {
 *   const [open, setOpen] = createSignal(false)
 *   return (
 *     <FloatingActionButton
 *       icon={<Icon name="plus" size={24} />}
 *       label="Create new item"
 *       position="bottom-right"
 *       onClick={() => setOpen(true)}
 *     />
 *   )
 * }
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
 * renders and `onClick` is ignored.
 *
 * @module
 */

export * from './FloatingActionButton.jsx'
export * from './types.js'
