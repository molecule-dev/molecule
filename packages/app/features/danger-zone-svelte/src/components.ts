/**
 * The package's components: one Svelte 5 component per React component in
 * `@molecule/app-danger-zone-react`, under the same React name.
 *
 * `ConfirmDialog` is the Svelte bundle's own (the React package re-exports
 * the component promoted to `@molecule/app-ui-react` the same way), so the
 * value is identical across consumers.
 *
 * @module
 */

export { default as DangerZoneSection } from './DangerZoneSection.svelte'
export type { ConfirmDialogProps } from '@molecule/app-ui-svelte'
export { ConfirmDialog } from '@molecule/app-ui-svelte'
