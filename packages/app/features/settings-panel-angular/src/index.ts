/**
 * `@molecule/app-settings-panel-angular` — the Angular counterpart of
 * `@molecule/app-settings-panel-react`: the same runtime export names, the
 * same props, and the same DOM for the same input. A composable,
 * batteries-included settings panel.
 *
 * `<SettingsContainer [onClose]="…">` owns the layout and publishes `onClose`
 * via the settings-panel context; each section component is standalone and
 * loads its own data through the binding's hooks:
 * - `AccountSection` (as `<section mol-settings-account>`) — name/email edit
 *   (`PATCH /api/users/:id` over the auth client's profile transport).
 * - `AppearanceSection` — dark-mode toggle (`useTheme()`).
 * - `AuthSection` — password change + TOTP two-factor
 *   (`POST /api/users/:id/verify-two-factor`).
 * - `NotificationsSection` — web-push toggle (see the exported
 *   `enablePushOnCurrentDevice` / `disablePushOnCurrentDevice` helpers and
 *   their documented device-row contract).
 * - `BillingSection` — read-only plan display (`GET /api/billing/status`),
 *   or `TiersUpgradeSection` — full Stripe upgrade/cancel flow
 *   (`/api/billing/tiers|checkout|cancel`). Use one or the other, not both.
 * - `DevicesSection` / `ThisDeviceSection` — device list + current device
 *   (`GET/DELETE /api/devices`).
 * - `LogOutDeleteSection` — sign out + delete account
 *   (`DELETE /api/users/:id`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   AccountSection,
 *   AppearanceSection,
 *   AuthSection,
 *   BillingSection,
 *   DevicesSection,
 *   LogOutDeleteSection,
 *   NotificationsSection,
 *   SettingsContainer,
 *   ThisDeviceSection,
 * } from '@molecule/app-settings-panel-angular'
 *
 * @Component({
 *   selector: 'app-settings-panel',
 *   standalone: true,
 *   imports: [
 *     AccountSection,
 *     AppearanceSection,
 *     AuthSection,
 *     BillingSection,
 *     DevicesSection,
 *     LogOutDeleteSection,
 *     NotificationsSection,
 *     SettingsContainer,
 *     ThisDeviceSection,
 *   ],
 *   template: `
 *     <!-- Pick sections, order them, and interleave custom ones. -->
 *     <div mol-settings-container [onClose]="close">
 *       <section mol-settings-account></section>
 *       <section mol-settings-appearance></section>
 *       <mol-auth-section></mol-auth-section>
 *       <section mol-settings-notifications></section>
 *       <section mol-settings-billing></section>
 *       <section mol-settings-devices></section>
 *       <section mol-settings-this-device></section>
 *       <mol-log-out-delete-section></mol-log-out-delete-section>
 *     </div>
 *   `,
 * })
 * export class SettingsPanel {
 *   close(): void {
 *     // dismiss the drawer / panel hosting the settings
 *   }
 * }
 * ```
 *
 * @remarks
 * - Wiring prereqs: sections need the standard `@molecule/app-angular`
 *   provider stack — `provideI18n`, `provideHttp` (authenticated client),
 *   `provideAuth`, `provideTheme` (AppearanceSection), the bonded device and
 *   push providers (NotificationsSection/ThisDeviceSection) — plus a bonded
 *   ClassMap. `BillingSection` and `LogOutDeleteSection` also need the
 *   binding's router (`provideRouter`) and throw outside one.
 * - Section components throw if rendered outside `<SettingsContainer>`
 *   (they read its context for `onClose`).
 * - Server contract: the molecule API surface from
 *   `@molecule/api-resource-user`, `@molecule/api-resource-device`,
 *   `@molecule/api-two-factor`, and the billing endpoints
 *   (`/api/billing/*`) wired by the payments stack. Missing read endpoints
 *   degrade gracefully (sections render empty); the mutating actions do not.
 * - Translations: `@molecule/app-locales-settings-panel` companion bond.
 *
 * @module
 */

export * from './account-section.component.js'
export * from './appearance-section.component.js'
export * from './auth-section.component.js'
export * from './billing-section.component.js'
export * from './context.js'
export * from './devices-section.component.js'
export * from './log-out-delete-section.component.js'
export * from './notifications-section.component.js'
export * from './push-toggle.js'
export * from './settings-container.component.js'
export * from './this-device-section.component.js'
export * from './tiers-upgrade-section.component.js'
export * from './types.js'
