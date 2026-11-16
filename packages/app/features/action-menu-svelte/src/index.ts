/**
 * Svelte kebab / overflow action menu.
 *
 * Exports `ActionMenu` — a compact popover menu with close-on-outside-click and
 * Escape key support — and the `ActionMenuItem` / `ActionMenuProps` types. It
 * is the Svelte counterpart of `@molecule/app-action-menu-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ActionMenu } from '@molecule/app-action-menu-svelte'
 * </script>
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
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and renders
 *   through `@molecule/app-ui-svelte`'s `Button`.
 * - Pure uncontrolled: the component manages its own open state. For external
 *   control use `<Dropdown>` from `@molecule/app-ui-svelte`.
 * - Node-valued fields are snippets: `trigger`, and each item's `label`/`icon`
 *   take text or a `Snippet`.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
