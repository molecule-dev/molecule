/**
 * Vue Settings-page scaffold (layout chrome only).
 *
 * Exports:
 * - `<SettingsLayout>` — two-column [sidebar, content] with an optional
 *   `header` slot rendered above both.
 * - `<SettingsSidebar>` — controlled side-nav (`items`, `activeId`,
 *   `onSelect`, optional `footer`); `SettingsSidebarItem` is
 *   `{ id, label, icon? }`.
 * - `<SettingsContent>` — stacked wrapper for the right column.
 * - `<SettingsSection>` — Card-wrapped titled section (`title`,
 *   `description?`, `footer?` action row, `dataMolId?`).
 *
 * It is the Vue counterpart of `@molecule/app-settings-container-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input, so an app moves between frameworks by changing the package name
 * in its imports.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 *
 * import {
 *   SettingsContent,
 *   SettingsLayout,
 *   SettingsSection,
 *   SettingsSidebar,
 * } from '@molecule/app-settings-container-vue'
 *
 * const NAV = [
 *   { id: 'profile', label: 'Profile' },
 *   { id: 'notifications', label: 'Notifications' },
 * ]
 *
 * export const SettingsPage = defineComponent({
 *   setup() {
 *     const active = ref('profile')
 *     return () =>
 *       h(SettingsLayout, null, {
 *         sidebar: () => [
 *           h(SettingsSidebar, {
 *             items: NAV,
 *             activeId: active.value,
 *             onSelect: (id: string) => (active.value = id),
 *           }),
 *         ],
 *         default: () => [
 *           h(SettingsContent, null, {
 *             default: () => [
 *               h(
 *                 SettingsSection,
 *                 {
 *                   title: 'Profile',
 *                   description: 'Update your display name and avatar.',
 *                 },
 *                 { default: () => [h('p', null, 'Form fields go here.')] },
 *               ),
 *             ],
 *           }),
 *         ],
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - The `header` slot is rendered above the columns but is NOT sticky —
 *   apply your own sticky positioning if you need it pinned.
 * - The two columns do not collapse responsively — swap the sidebar for a
 *   drawer on small screens yourself.
 * - Requires a bonded ClassMap. Labels are your own nodes (translate
 *   upstream); the sidebar nav's `aria-label="Settings"` is hardcoded
 *   English.
 * - Don't confuse with `@molecule/app-settings-panel-vue`: that package is the
 *   batteries-included panel (prebuilt Account/Auth/Billing/… sections wired
 *   to molecule APIs). THIS package is empty layout chrome for building your
 *   own settings pages.
 * - Node-valued props (`header`, `sidebar`, `footer`, `title`, `description`)
 *   arrive as a prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './SettingsContent.js'
export * from './SettingsLayout.js'
export * from './SettingsSection.js'
export * from './SettingsSidebar.js'
export * from './types.js'
