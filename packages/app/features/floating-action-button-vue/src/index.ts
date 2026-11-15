/**
 * Vue floating action button (FAB).
 *
 * Exports `<FloatingActionButton>` — fixed-position circular button
 * (or anchor when `href` is set) with an icon slot, native-title tooltip, and
 * four corner-anchoring positions. It is the Vue counterpart of
 * `@molecule/app-floating-action-button-react`: same props and the same DOM
 * for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { FloatingActionButton } from '@molecule/app-floating-action-button-vue'
 * import { Icon } from '@molecule/app-ui-vue'
 *
 * const CreateFab = defineComponent({
 *   setup() {
 *     const open = ref(false)
 *     return () =>
 *       h(
 *         FloatingActionButton,
 *         {
 *           label: 'Create new item',
 *           position: 'bottom-right',
 *           onClick: () => {
 *             open.value = true
 *           },
 *         },
 *         { icon: () => [h(Icon, { name: 'plus', size: 24 })] },
 *       )
 *   },
 * })
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
 * renders and `onClick` is ignored. The `icon` prop takes a VNode or a
 * same-named slot; every other prop keeps its React name.
 *
 * @module
 */

export * from './FloatingActionButton.js'
export * from './types.js'
