/**
 * Solid kebab / overflow action menu.
 *
 * Exports `ActionMenu` — a compact popover menu with close-on-outside-click and
 * Escape key support — and the `ActionMenuItem` / `ActionMenuProps` types. It
 * is the Solid counterpart of `@molecule/app-action-menu-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { ActionMenu } from '@molecule/app-action-menu-solid'
 *
 * export function RowActions() {
 *   return (
 *     <ActionMenu
 *       items={[
 *         { id: 'edit', label: 'Edit', onClick: () => console.log('edit') },
 *         {
 *           id: 'duplicate',
 *           label: 'Duplicate',
 *           onClick: () => console.log('duplicate'),
 *           divider: true,
 *         },
 *         { id: 'delete', label: 'Delete', onClick: () => console.log('delete'), destructive: true },
 *       ]}
 *       align="right"
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and renders
 *   through `@molecule/app-ui-solid`'s `Button`.
 * - Pure uncontrolled: the component manages its own open state. For external
 *   control use `<Dropdown>` from `@molecule/app-ui-solid`.
 * - Item labels and icons, and the `trigger`, are Solid JSX values.
 *
 * @module
 */

export * from './ActionMenu.jsx'
export * from './types.js'
