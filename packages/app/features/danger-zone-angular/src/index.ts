/**
 * Angular destructive-action primitives — the counterpart of
 * `@molecule/app-danger-zone-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<DangerZoneSection>` — Card with title/description/button for
 * delete/reset/revoke — and `<ConfirmDialog>`, the standalone "Are you
 * sure?" modal.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { DangerZoneSection } from '@molecule/app-danger-zone-angular'
 *
 * @Component({
 *   selector: 'app-account',
 *   standalone: true,
 *   imports: [DangerZoneSection],
 *   template: `
 *     <div mol-danger-zone-section
 *       title="Delete account"
 *       description="This permanently removes your account and all data."
 *       actionLabel="Delete account"
 *       (click)="openConfirm()"
 *     ></div>
 *   `,
 * })
 * export class Account {}
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (the Card classes, `cm.card` +
 *   `cm.cardPadding('md')`) — rendering throws otherwise.
 * - Node props are projected content: `title`, `description` and
 *   `actionLabel` are selected by `[slot=title]` / `[slot=description]` /
 *   `[slot=actionLabel]`, everything else lands bare between the header and
 *   the button row as the default projection. String inputs render as text.
 * - `<ConfirmDialog>` does NOT track `onConfirm`'s promise and does NOT
 *   close itself on confirm: set `loading` yourself while the action runs,
 *   then call `onClose()` when it settles — otherwise users can double-fire
 *   the destructive action or be left staring at an open dialog.
 *   Cancel/Confirm fall back to the `confirm.*` i18n keys (companion bond:
 *   `@molecule/app-locales-danger-zone`); pass `confirmLabel`/`cancelLabel`
 *   for action-specific wording ("Delete", "Revoke"). `destructive`
 *   (default true) only switches the confirm button color.
 *
 * @module
 */

export * from './confirm-dialog.js'
export * from './danger-zone-section.component.js'
export * from './types.js'
