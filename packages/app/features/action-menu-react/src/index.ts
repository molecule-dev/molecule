/**
 * Kebab / overflow action menu.
 *
 * Exports `<ActionMenu>` — compact popover menu with close-on-outside-click
 * and Escape key support. `ActionMenuItem` type.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ActionMenu } from '@molecule/app-action-menu-react'
 * import { t } from '@molecule/app-i18n'
 *
 * export function ProjectRow() {
 *   const [lastAction, setLastAction] = useState('none')
 *   return (
 *     <div>
 *       <span>{lastAction}</span>
 *       <ActionMenu
 *         triggerAriaLabel={t('nav.actions', undefined, { defaultValue: 'Actions' })}
 *         align="right"
 *         items={[
 *           { id: 'edit', label: t('common.edit', undefined, { defaultValue: 'Edit' }), onClick: () => setLastAction('edit') },
 *           { id: 'share', label: t('common.share', undefined, { defaultValue: 'Share' }), href: '/projects/42/share', divider: true },
 *           { id: 'delete', label: t('common.delete', undefined, { defaultValue: 'Delete' }), onClick: () => setLastAction('delete'), destructive: true },
 *         ]}
 *       />
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs a ClassMap bond.** It styles itself via `getClassMap()`, which throws unless the app
 *   called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with `@molecule/app-ui-tailwind`)
 *   at startup. The trigger is `Button` from `@molecule/app-ui-react` (a peer dependency).
 * - **Uncontrolled only** — there is no `open`/`onOpenChange` prop. The list is not in the DOM
 *   until the trigger (`data-mol-id="action-menu-trigger"`) is clicked; each item gets
 *   `data-mol-id="action-menu-item-<id>"`. Use `<Dropdown>` from `@molecule/app-ui-react` for
 *   external control.
 * - Every item needs a unique `id`. An item with `href` renders an `<a>` and its `onClick` is
 *   ignored; `disabled` items never fire `onClick`.
 * - The trigger's aria-label defaults to the untranslated English `'Actions'` — pass
 *   `triggerAriaLabel` through `t()`.
 *
 * @module
 */

export * from './ActionMenu.js'
