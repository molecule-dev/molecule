/**
 * React floating action button (FAB).
 *
 * Exports `<FloatingActionButton>` — fixed-position circular button
 * (or anchor when `href` is set) with an icon slot, native-title
 * tooltip, and four corner-anchoring positions.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { FloatingActionButton } from '@molecule/app-floating-action-button-react'
 * import { Icon } from '@molecule/app-ui-react'
 *
 * export function NotesPage() {
 *   const [notes, setNotes] = useState<string[]>([])
 *   return (
 *     <main>
 *       <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
 *       <FloatingActionButton
 *         icon={<Icon name="plus" size={24} />}
 *         label="Create new note"
 *         position="bottom-right"
 *         onClick={() => setNotes((prev) => [...prev, `Note ${prev.length + 1}`])}
 *       />
 *     </main>
 *   )
 * }
 * ```
 *
 * @remarks
 * `icon` and `label` are REQUIRED — `label` is the button's only accessible
 * name (there is no visible text). It is `position: fixed` 24px from the
 * chosen corner with `z-index: 40`: it overlays content (add bottom padding
 * to scrolling lists so the last row stays reachable) and it is not a
 * speed-dial/menu. An `<Icon>` from `@molecule/app-ui-react` needs an icon
 * set bonded (`setIconSet(iconSet)` from `@molecule/app-icons` +
 * `@molecule/app-icons-molecule`) or it throws at render.
 *
 * It calls `useTranslation()`, so it must render inside `<I18nProvider>` /
 * `<MoleculeProvider>`; `getClassMap()` throws unless
 * `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * The FAB ships with a visible default surface — a primary gradient plus
 * soft elevation (the `gradientPrimary` + `shadowLifted` ClassMap tokens,
 * which also supply a contrasting `on-primary` icon color) — so an
 * out-of-the-box FAB is prominent in both light and dark themes with no
 * extra styling. Pass `className` to override it (e.g. `cm.surface`); caller
 * classes are merged last (tailwind-merge) so they win over the default.
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
