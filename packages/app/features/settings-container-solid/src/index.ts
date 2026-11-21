/**
 * Solid Settings-page scaffold (layout chrome only).
 *
 * Exports:
 * - `SettingsLayout` — two-column [sidebar, content] with an optional `header`
 *   slot rendered above both.
 * - `SettingsSidebar` — controlled side-nav (`items`, `activeId`, `onSelect`,
 *   optional `footer`); `SettingsSidebarItem` is `{ id, label, icon? }`.
 * - `SettingsContent` — stacked wrapper for the right column.
 * - `SettingsSection` — Card-wrapped titled section (`title`, `description?`,
 *   `footer?` action row, `dataMolId?`).
 *
 * It is the Solid counterpart of `@molecule/app-settings-container-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 *
 * import {
 *   SettingsContent,
 *   SettingsLayout,
 *   SettingsSection,
 *   SettingsSidebar,
 * } from '@molecule/app-settings-container-solid'
 *
 * const NAV = [
 *   { id: 'profile', label: 'Profile' },
 *   { id: 'notifications', label: 'Notifications' },
 * ]
 *
 * export function SettingsPage() {
 *   const [active, setActive] = createSignal('profile')
 *   return (
 *     <SettingsLayout
 *       header={<h1>Settings</h1>}
 *       sidebar={<SettingsSidebar items={NAV} activeId={active()} onSelect={setActive} />}
 *     >
 *       <SettingsContent>
 *         <SettingsSection title="Profile" description="Update your display name and avatar.">
 *           <p>Form fields go here.</p>
 *         </SettingsSection>
 *       </SettingsContent>
 *     </SettingsLayout>
 *   )
 * }
 * ```
 *
 * @remarks
 * - The `header` slot is rendered above the columns but is NOT sticky —
 *   apply your own sticky positioning if you need it pinned.
 * - The two columns do not collapse responsively — swap the sidebar for a
 *   drawer on small screens yourself.
 * - Requires a bonded ClassMap. Labels are your own JSX values (translate
 *   upstream); the sidebar nav's `aria-label="Settings"` is hardcoded
 *   English.
 * - Don't confuse with `@molecule/app-settings-panel-solid`: that package is
 *   the batteries-included panel (prebuilt Account/Auth/Billing/… sections
 *   wired to molecule APIs). THIS package is empty layout chrome for building
 *   your own settings pages.
 *
 * @module
 */

export * from './SettingsContent.jsx'
export * from './SettingsLayout.jsx'
export * from './SettingsSection.jsx'
export * from './SettingsSidebar.jsx'
export * from './types.js'
