/**
 * Vue kebab / overflow action menu.
 *
 * Exports `<ActionMenu>` — a compact popover menu with close-on-outside-click
 * and Escape key support — and the `ActionMenuItem` / `ActionMenuProps` types.
 * It is the Vue counterpart of `@molecule/app-action-menu-react`: same props
 * (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { ActionMenu } from '@molecule/app-action-menu-vue'
 *
 * const Row = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ActionMenu, {
 *         items: [
 *           { id: 'edit', label: 'Edit', onClick: () => console.log('edit') },
 *           {
 *             id: 'duplicate',
 *             label: 'Duplicate',
 *             onClick: () => console.log('duplicate'),
 *             divider: true,
 *           },
 *           { id: 'delete', label: 'Delete', onClick: () => console.log('delete'), destructive: true },
 *         ],
 *         align: 'right',
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and renders
 *   through `@molecule/app-ui-vue`'s `Button`.
 * - Pure uncontrolled: the component manages its own open state. For external
 *   control use `<Dropdown>` from `@molecule/app-ui-vue`.
 * - The `trigger` node is accepted as a prop or as the same-named slot.
 *
 * @module
 */

export * from './ActionMenu.js'
export * from './types.js'
