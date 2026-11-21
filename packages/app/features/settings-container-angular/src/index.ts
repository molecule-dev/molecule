/**
 * Angular Settings-page scaffold (layout chrome only) — the counterpart of
 * `@molecule/app-settings-container-react`: the same props and the same DOM
 * for the same input.
 *
 * Exports:
 * - `<SettingsLayout>` (`div[mol-settings-layout]`) — two-column [sidebar,
 *   content] with an optional `[slot=header]` above both.
 * - `<SettingsSidebar>` (`nav[mol-settings-sidebar]`) — controlled side-nav
 *   (`items`, `activeId`, `onSelect`, optional `[slot=footer]`).
 * - `<SettingsContent>` (`div[mol-settings-content]`) — stacked wrapper for
 *   the right column.
 * - `<SettingsSection>` (`div[mol-settings-section]`) — Card-wrapped titled
 *   section (`[slot=title]`, `[slot=description]`, body and
 *   `[slot=footer]`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   SettingsContent,
 *   SettingsLayout,
 *   SettingsSection,
 *   SettingsSidebar,
 * } from '@molecule/app-settings-container-angular'
 *
 * @Component({
 *   selector: 'app-settings-page',
 *   standalone: true,
 *   imports: [SettingsLayout, SettingsSidebar, SettingsContent, SettingsSection],
 *   template: `
 *     <div mol-settings-layout [dataMolId]="'settings'">
 *       <h1 slot="header">Settings</h1>
 *       <nav
 *         slot="sidebar"
 *         mol-settings-sidebar
 *         [items]="nav"
 *         [activeId]="active"
 *         [onSelect]="select.bind(this)"
 *       ></nav>
 *       <div mol-settings-content>
 *         <div mol-settings-section>
 *           <strong slot="title">Profile</strong>
 *           <em slot="description">Update your display name and avatar.</em>
 *           <p>Form fields go here.</p>
 *         </div>
 *       </div>
 *     </div>
 *   `,
 * })
 * export class SettingsPage {
 *   active = 'profile'
 *   nav = [
 *     { id: 'profile', label: 'Profile' },
 *     { id: 'notifications', label: 'Notifications' },
 *   ]
 *
 *   select(id: string): void {
 *     this.active = id
 *   }
 * }
 * ```
 *
 * @remarks
 * - Node props are projected content: `[slot=header]`, `[slot=sidebar]`,
 *   `[slot=footer]`, `[slot=title]` and `[slot=description]` — everything
 *   else lands in the default projection. Text-only values (`title`,
 *   `description`, `footer`) may also be passed as inputs.
 * - The `header` is rendered above the columns but is NOT sticky — apply your
 *   own sticky positioning if you need it pinned.
 * - The two columns do not collapse responsively — swap the sidebar for a
 *   drawer on small screens yourself.
 * - Requires a bonded ClassMap. Labels are your own nodes (translate
 *   upstream); the sidebar nav's `aria-label="Settings"` is hardcoded English.
 * - Don't confuse with `@molecule/app-settings-panel-angular`: that package is
 *   the batteries-included panel (prebuilt Account/Auth/Billing/… sections
 *   wired to molecule APIs). THIS package is empty layout chrome for building
 *   your own settings pages.
 *
 * @module
 */

export * from './settings-content.component.js'
export * from './settings-layout.component.js'
export * from './settings-section.component.js'
export * from './settings-sidebar.component.js'
export * from './types.js'
