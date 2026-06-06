/**
 * Kebab / overflow action menu.
 *
 * Exports `<ActionMenu>` — compact popover menu with close-on-outside-click
 * and Escape key support. `ActionMenuItem` type.
 *
 * @example
 * ```tsx
 * import { ActionMenu } from '@molecule/app-action-menu-react'
 *
 * <ActionMenu
 *   items={[
 *     { id: 'edit', label: 'Edit', onClick: () => console.log('edit') },
 *     { id: 'duplicate', label: 'Duplicate', onClick: () => console.log('duplicate'), divider: true },
 *     { id: 'delete', label: 'Delete', onClick: () => console.log('delete'), destructive: true },
 *   ]}
 *   align="right"
 * />
 * ```
 *
 * @module
 */

export * from './ActionMenu.js'
