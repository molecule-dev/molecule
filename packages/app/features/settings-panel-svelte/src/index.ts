/**
 * `@molecule/app-settings-panel-svelte` — the Svelte counterpart of
 * `@molecule/app-settings-panel-react`: composable, batteries-included
 * settings panel, with the same prop names, the same rendered DOM and the
 * same behavior for the same input.
 *
 * `<SettingsContainer onClose={…}>` owns the layout and publishes `onClose`
 * through Svelte context; each section component is independent and loads
 * its own data through the `@molecule/app-svelte` hooks:
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
 * ```svelte
 * <script lang="ts">
 *   import { setMoleculeContext } from '@molecule/app-svelte'
 *   import {
 *     AccountSection,
 *     AppearanceSection,
 *     AuthSection,
 *     BillingSection,
 *     DevicesSection,
 *     LogOutDeleteSection,
 *     NotificationsSection,
 *     SettingsContainer,
 *     ThisDeviceSection,
 *     TiersUpgradeSection,
 *   } from '@molecule/app-settings-panel-svelte'
 *
 *   let { onClose }: { onClose: () => void } = $props()
 *
 *   // Wire the standard molecule services once in the root layout; the
 *   // sections read them through the binding's hooks.
 *   setMoleculeContext({ http, auth, theme, router, i18n })
 * </script>
 *
 * <SettingsContainer {onClose}>
 *   <AccountSection />
 *   <AppearanceSection />
 *   <AuthSection />
 *   <NotificationsSection />
 *   <TiersUpgradeSection />
 *   <DevicesSection />
 *   <ThisDeviceSection />
 *   <LogOutDeleteSection />
 * </SettingsContainer>
 * ```
 *
 * @remarks
 * - Wiring prereqs: sections need the standard `@molecule/app-svelte`
 *   composition root — `setMoleculeContext({ i18n, http, auth, theme,
 *   router })` once in the root layout — plus a bonded ClassMap, device
 *   provider and push provider.
 *   `<BillingSection>` and `<LogOutDeleteSection>` also call the router and
 *   throw outside a composition root that carries one.
 * - Section components throw if rendered outside `<SettingsContainer>`
 *   (they read its context for `onClose`).
 * - Server contract: the molecule API surface from
 *   `@molecule/api-resource-user`, `@molecule/api-resource-device`,
 *   `@molecule/api-two-factor`, and the billing endpoints (`/api/billing/*`)
 *   wired by the payments stack. Missing read endpoints degrade gracefully
 *   (sections render empty); the mutating actions do not.
 * - Translations: `@molecule/app-locales-settings-panel` companion bond.
 *
 * @module
 */

export { default as AccountSection } from './AccountSection.svelte'
export { default as AppearanceSection } from './AppearanceSection.svelte'
export { default as AuthSection } from './AuthSection.svelte'
export { default as BillingSection } from './BillingSection.svelte'
export type { SettingsPanelContextValue } from './context.js'
export { SettingsPanelContext, useSettingsPanelContext } from './context.js'
export { default as DevicesSection } from './DevicesSection.svelte'
export { default as LogOutDeleteSection } from './LogOutDeleteSection.svelte'
export { default as NotificationsSection } from './NotificationsSection.svelte'
export * from './pushToggle.js'
export { default as SettingsContainer } from './SettingsContainer.svelte'
export { default as ThisDeviceSection } from './ThisDeviceSection.svelte'
export { default as TiersUpgradeSection } from './TiersUpgradeSection.svelte'
export * from './types.js'
