/**
 * Angular sticky Save/Cancel bar with "Saved" timestamp + loading state for
 * settings and form pages.
 *
 * Exports `SettingsActionsBar`. Props: `onSave` (required; sync or async),
 * `onCancel?` (Cancel hidden when omitted), `loading?` (disables Save and
 * shows "Saving…"), `disabled?`, `savedAt?` (epoch ms → "Saved 3m ago"),
 * `error?` (inline text, or `[slot=error]` content), `sticky?` (default true),
 * `leading?` (`[slot=leading]` content before the status), `className?`.
 *
 * This is the Angular counterpart of `@molecule/app-settings-actions-bar-react`:
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { SettingsActionsBar } from '@molecule/app-settings-actions-bar-angular'
 *
 * @Component({
 *   selector: 'app-profile-actions',
 *   standalone: true,
 *   imports: [SettingsActionsBar],
 *   template: `
 *     <div mol-settings-actions-bar
 *       [onSave]="save"
 *       [onCancel]="reset"
 *       [loading]="saving()"
 *       [savedAt]="savedAt()"
 *     ></div>
 *   `,
 * })
 * export class ProfileActions {
 *   saving = signal(false)
 *   savedAt = signal<number | null>(null)
 *   save = async (): Promise<void> => {
 *     this.saving.set(true)
 *     try {
 *       await this.api.saveProfile()
 *       this.savedAt.set(Date.now())
 *     } finally {
 *       this.saving.set(false)
 *     }
 *   }
 *   reset = (): void => this.form.reset()
 * }
 * ```
 *
 * @remarks
 * - The bar ships with an opaque theme surface (`cm.surface`) + top border
 *   (`cm.borderT`), so when `sticky` is on, page content no longer shows
 *   through it while scrolling. Pass `className` to layer on more styling.
 * - The "Saved …" time is English-shorthand ("3m ago"), computed once per
 *   render — it does not tick while mounted; re-render (or bump `savedAt`)
 *   to refresh it.
 * - `error` renders as plain unstyled text — style/color the node yourself.
 * - Requires a bonded ClassMap and i18n provider — rendering throws otherwise.
 *   Translations: `@molecule/app-locales-settings-actions-bar`.
 *
 * @module
 */

export * from './settings-actions-bar.component.js'
export * from './types.js'
