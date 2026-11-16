/**
 * Angular kebab / overflow action menu — the counterpart of
 * `@molecule/app-action-menu-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<ActionMenu>` — a compact popover menu with close-on-outside-click
 * and Escape key support — plus the `ActionMenuItem` / `ActionMenuProps` types.
 * It renders through `@molecule/app-ui-angular`'s `Button`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ActionMenu } from '@molecule/app-action-menu-angular'
 *
 * @Component({
 *   selector: 'app-row-actions',
 *   standalone: true,
 *   imports: [ActionMenu],
 *   template: `
 *     <span
 *       mol-action-menu
 *       align="right"
 *       [items]="[
 *         { id: 'edit', label: 'Edit', onClick: edit },
 *         { id: 'duplicate', label: 'Duplicate', onClick: duplicate, divider: true },
 *         { id: 'delete', label: 'Delete', onClick: remove, destructive: true }
 *       ]"
 *     ></span>
 *   `,
 * })
 * export class RowActions {
 *   edit(): void {}
 *   duplicate(): void {}
 *   remove(): void {}
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()` throws otherwise) and renders
 *   through `@molecule/app-ui-angular`'s `Button` (`button[mol-button]`).
 * - The host IS React's root `<span>` (`span[mol-action-menu]`).
 * - A node `trigger` is projected as `[slot=trigger]` content (or passed as a
 *   template reference input); an item's `label`/`icon` are template
 *   references — put them in an `<ng-template>` and bind it.
 * - Pure uncontrolled: the component manages its own open state.
 *
 * @module
 */

export * from './action-menu.component.js'
export * from './types.js'
