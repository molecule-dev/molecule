/**
 * `@molecule/app-settings-panel-vue` — the Vue counterpart of
 * `@molecule/app-settings-panel-react`: a composable, batteries-included
 * settings panel with the same props (React names), the same DOM for the
 * same input, and the same callbacks and service calls.
 *
 * `<SettingsContainer onClose={…}>` owns the layout and publishes `onClose`
 * via Vue injection; each section component is independent and loads its own
 * data through `@molecule/app-vue` composables:
 * - `<AccountSection>` — name/email edit (`PATCH /api/users/:id`).
 * - `<AppearanceSection>` — dark-mode toggle (`useTheme()`).
 * - `<AuthSection>` — password change + TOTP two-factor
 *   (`POST /api/users/:id/verify-two-factor`).
 * - `<NotificationsSection>` — web-push toggle (see the exported
 *   `enablePushOnCurrentDevice` / `disablePushOnCurrentDevice` helpers and
 *   their documented device-row contract).
 * - `<BillingSection>` — read-only plan display (`GET /api/billing/status`),
 *   or `<TiersUpgradeSection>` — full Stripe upgrade/cancel flow
 *   (`/api/billing/tiers|checkout|cancel`). Use one or the other, not both.
 * - `<DevicesSection>` / `<ThisDeviceSection>` — device list + current
 *   device (`GET/DELETE /api/devices`).
 * - `<LogOutDeleteSection>` — sign out + delete account
 *   (`DELETE /api/users/:id`).
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
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
 *   TiersUpgradeSection,
 * } from '@molecule/app-settings-panel-vue'
 *
 * const SettingsPanel = defineComponent({
 *   props: { onClose: { type: Function, required: true } },
 *   setup(props) {
 *     return () =>
 *       h(SettingsContainer, { onClose: props.onClose }, {
 *         default: () => [
 *           h(AccountSection),
 *           h(AppearanceSection),
 *           h(AuthSection),
 *           h(NotificationsSection),
 *           h(BillingSection),
 *           h(DevicesSection),
 *           h(ThisDeviceSection),
 *           h(LogOutDeleteSection),
 *         ],
 *       })
 *   },
 * })
 *
 * createApp(SettingsPanel).mount('#app')
 * ```
 *
 * @remarks
 * - Wiring prereqs: sections need the standard `@molecule/app-vue` plugin
 *   stack — `moleculePlugin` installed with `i18n`, `http` (authenticated
 *   client), `auth`, `theme` (AppearanceSection), and the push + device
 *   providers bonded (`@molecule/app-push` / `@molecule/app-device`,
 *   NotificationsSection/ThisDeviceSection) — plus a bonded ClassMap.
 *   `<BillingSection>` and `<LogOutDeleteSection>` also navigate through the
 *   binding's `useRouter()` and throw outside it.
 * - Section components throw if rendered outside `<SettingsContainer>`
 *   (they read its injection for `onClose`).
 * - Server contract: the molecule API surface from
 *   `@molecule/api-resource-user`, `@molecule/api-resource-device`,
 *   `@molecule/api-two-factor`, and the billing endpoints
 *   (`/api/billing/*`) wired by the payments stack. Missing read endpoints
 *   degrade gracefully (sections render empty); the mutating actions do not.
 * - Translations: `@molecule/app-locales-settings-panel` companion bond.
 *
 * @module
 */

export * from './AccountSection.js'
export * from './AppearanceSection.js'
export * from './AuthSection.js'
export * from './BillingSection.js'
export * from './context.js'
export * from './DevicesSection.js'
export * from './LogOutDeleteSection.js'
export * from './NotificationsSection.js'
export * from './pushToggle.js'
export * from './SettingsContainer.js'
export * from './ThisDeviceSection.js'
export * from './TiersUpgradeSection.js'
export * from './types.js'
