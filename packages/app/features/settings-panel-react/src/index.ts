/**
 * `@molecule/app-settings-panel-react` — composable settings panel.
 *
 * `<SettingsContainer>` owns the panel layout + `onClose` context;
 * each section component (`<AccountSection>`, `<AuthSection>`,
 * `<NotificationsSection>`, `<BillingSection>`, `<DevicesSection>`,
 * `<ThisDeviceSection>`, `<LogOutDeleteSection>`) is independent and
 * reads its own state from hooks. Apps compose via JSX children —
 * picking which sections to include, in what order, and interleaving
 * their own custom sections.
 *
 * @example
 * ```tsx
 * import {
 *   SettingsContainer,
 *   AccountSection,
 *   AuthSection,
 *   NotificationsSection,
 *   BillingSection,
 *   DevicesSection,
 *   ThisDeviceSection,
 *   LogOutDeleteSection,
 * } from '@molecule/app-settings-panel-react'
 *
 * import { Footer } from './Footer.js'
 *
 * export function SettingsPanel({ onClose }: { onClose: () => void }) {
 *   return (
 *     <SettingsContainer onClose={onClose}>
 *       <AccountSection />
 *       <AuthSection />
 *       <NotificationsSection />
 *       <BillingSection />
 *       <DevicesSection />
 *       <ThisDeviceSection />
 *       <LogOutDeleteSection />
 *       <Footer />
 *     </SettingsContainer>
 *   )
 * }
 * ```
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
