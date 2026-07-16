/**
 * `@molecule/app-settings-panel-react` — composable, batteries-included
 * settings panel.
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
 * } from '@molecule/app-settings-panel-react'
 *
 * function SettingsPanel({ onClose }: { onClose: () => void }) {
 *   return (
 *     <SettingsContainer onClose={onClose}>
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
 * - Wiring prereqs: sections need the standard `@molecule/app-react`
 *   provider stack — `<I18nProvider>`, `<HttpProvider>` (authenticated
 *   client), `<AuthProvider>`, `<ThemeProvider>` (AppearanceSection), push +
 *   device providers (NotificationsSection/ThisDeviceSection) — plus a
 *   bonded ClassMap. `<BillingSection>` and `<LogOutDeleteSection>` also
 *   call react-router's `useNavigate()` and throw outside a `<Router>`.
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
