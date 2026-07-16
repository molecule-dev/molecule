/**
 * React floating action button (FAB).
 *
 * Exports `<FloatingActionButton>` — fixed-position circular button
 * (or anchor when `href` is set) with an icon slot, native-title
 * tooltip, and four corner-anchoring positions.
 *
 * @example
 * ```tsx
 * import { FloatingActionButton } from '@molecule/app-floating-action-button-react'
 * import { getClassMap } from '@molecule/app-ui'
 * import { Icon } from '@molecule/app-ui-react'
 *
 * function CreateFab() {
 *   const cm = getClassMap()
 *   return (
 *     <FloatingActionButton
 *       icon={<Icon name="plus" size={24} />}
 *       label="Create new item"
 *       position="bottom-right"
 *       onClick={() => setCreateOpen(true)}
 *       className={cm.surface}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * The FAB ships with NO default background, border, or shadow — pass
 * surface styling via `className` (e.g. the ClassMap `surface` class
 * plus your shadow utility) or the button renders as a transparent
 * circle over the page.
 *
 * `label` doubles as an i18n key: it is resolved through
 * `t(label, {}, { defaultValue: label })`, so passing a translation key
 * localizes the aria-label / tooltip, and plain English strings still
 * work as their own fallback. The tooltip is the native `title`
 * attribute (no styled tooltip component).
 *
 * `href` and `onClick` are mutually exclusive — when `href` is set an
 * `<a>` renders and `onClick` is ignored.
 *
 * @module
 */

export * from './FloatingActionButton.js'
