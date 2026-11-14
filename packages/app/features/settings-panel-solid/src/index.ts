/**
 * `@molecule/app-settings-panel-solid` — the Solid counterpart of
 * `@molecule/app-settings-panel-react`: the same composable, batteries-included
 * settings panel, with the same props, DOM, callbacks, service calls and i18n
 * keys, rendered with Solid.
 *
 * `<SettingsContainer onClose={…}>` owns the layout and publishes `onClose`
 * via context; each section component is independent and loads its own data
 * through hooks:
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
 * Apps compose via JSX children — pick sections, order them, and interleave
 * custom sections.
 *
 * @example
 * ```tsx
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
 * } from '@molecule/app-settings-panel-solid'
 *
 * function SettingsPanel(props: { onClose: () => void }) {
 *   return (
 *     <SettingsContainer onClose={props.onClose}>
 *       <AccountSection />
 *       <AppearanceSection />
 *       <AuthSection />
 *       <NotificationsSection />
 *       <BillingSection />
 *       <DevicesSection />
 *       <ThisDeviceSection />
 *       <LogOutDeleteSection />
 *     </SettingsContainer>
 *   )
 * }
 * ```
 *
 * @remarks
 * - Wiring prereqs: sections need the standard `@molecule/app-solid` provider
 *   stack — `MoleculeProvider` with `i18n`, `http` (authenticated client),
 *   `auth`, `theme` (AppearanceSection), and the bonded device + push
 *   providers (NotificationsSection/ThisDeviceSection) — plus a bonded
 *   ClassMap. `<BillingSection>` and `<LogOutDeleteSection>` also navigate
 *   through the binding's router (`useRouter()`).
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

export * from './AccountSection.jsx'
export * from './AppearanceSection.jsx'
export * from './AuthSection.jsx'
export * from './BillingSection.jsx'
export * from './context.js'
export * from './DevicesSection.jsx'
export * from './LogOutDeleteSection.jsx'
export * from './NotificationsSection.jsx'
export * from './pushToggle.js'
export * from './SettingsContainer.jsx'
export * from './ThisDeviceSection.jsx'
export * from './TiersUpgradeSection.jsx'
export * from './types.js'
