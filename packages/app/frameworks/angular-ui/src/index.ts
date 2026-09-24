/**
 * Angular UI components for molecule.dev.
 *
 * Provides standalone Angular components implementing a SUBSET of the
 * `@molecule/app-ui` component interfaces, styled through the UIClassMap
 * abstraction. Ships 12 components — `MoleculeAlert`, `MoleculeBadge`,
 * `MoleculeButton`, `MoleculeCheckbox`, `MoleculeInput`, `MoleculeModal`,
 * `MoleculeRadioGroup`, `MoleculeSelect`, `MoleculeSpinner`,
 * `MoleculeSwitch`, `MoleculeToast`, `MoleculeTooltip` — each a standalone
 * component with a `mol-*` selector. Layout/data components (Card, Table,
 * Tabs, Accordion, Dropdown, Icon, …) are not implemented for Angular yet;
 * compose them from ClassMap classes via `getClassMap()`.
 *
 * @example
 * ```typescript
 * // main.ts
 * import { Component } from '@angular/core'
 * import { bootstrapApplication } from '@angular/platform-browser'
 *
 * import { registerLocaleModule, t } from '@molecule/app-i18n'
 * import { setIconSet } from '@molecule/app-icons'
 * import { iconSet } from '@molecule/app-icons-molecule'
 * import * as commonLocales from '@molecule/app-locales-common'
 * import { setClassMap } from '@molecule/app-ui'
 * import { MoleculeAlert, MoleculeButton, MoleculeInput } from '@molecule/app-ui-angular'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Once, BEFORE bootstrapApplication: components throw without a ClassMap, and
 * // mol-alert / mol-input render icons from the bonded icon set.
 * setClassMap(classMap)
 * setIconSet(iconSet)
 * registerLocaleModule(commonLocales) // translations for the `form.*` / `common.*` keys below
 *
 * @Component({
 *   selector: 'app-root',
 *   imports: [MoleculeAlert, MoleculeButton, MoleculeInput],
 *   template: `
 *     <mol-input [label]="nameLabel" [value]="name" (handleInput)="onName($event)"></mol-input>
 *     <mol-button color="primary" testId="save-profile" (handleClick)="save()">{{ saveLabel }}</mol-button>
 *     @if (savedName) {
 *       <mol-alert status="success">{{ savedMessage }}</mol-alert>
 *     }
 *   `,
 * })
 * class ProfileForm {
 *   name = ''
 *   savedName = ''
 *
 *   get nameLabel(): string {
 *     return t('form.displayName', undefined, { defaultValue: 'Display name' })
 *   }
 *   get saveLabel(): string {
 *     return t('common.saveProfile', undefined, { defaultValue: 'Save profile' })
 *   }
 *   get savedMessage(): string {
 *     return t('common.profileSavedPeriod', undefined, { defaultValue: 'Profile saved.' })
 *   }
 *
 *   // Outputs emit the raw DOM event — read the value from its target.
 *   onName(event: Event): void {
 *     this.name = (event.target as HTMLInputElement).value
 *   }
 *   save(): void {
 *     this.savedName = this.name
 *   }
 * }
 *
 * // index.html contains <app-root></app-root>.
 * await bootstrapApplication(ProfileForm)
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before any component renders** — every component resolves its
 *   classes through `getClassMap()`, which THROWS until a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) is set. Call it in `main.ts` before `bootstrapApplication`.
 * - **`mol-alert` (status icon) and `mol-input` (`clearable`) render icons** through
 *   `@molecule/app-icons` — call `setIconSet(iconSet)` (e.g. `@molecule/app-icons-molecule`)
 *   at startup too, or they throw on first render.
 * - **Known gap: those icons do not currently show.** `mol-alert`, `mol-toast` and the `mol-input`
 *   clear button bind the icon SVG STRING to `[innerHTML]`, so Angular's sanitizer strips the
 *   `<svg>` (dev console: "sanitizing HTML stripped some content"); only `mol-modal`'s close
 *   icon (which uses `DomSanitizer`) renders. The text, status classes and outputs work.
 * - Components are standalone — add them to the `imports` array of the consuming component or
 *   route; there is no NgModule.
 * - Event outputs are `handle*`, not the DOM names: `(handleClick)` on `mol-button`,
 *   `(handleInput)`/`(handleChange)` on `mol-input` (both emit the raw DOM event — read the
 *   value from `$event.target`). The host element uses `display: contents`, so the real
 *   `<button>`/`<input>` lives inside the template.
 *
 * @module
 */

export * from './components/index.js'
export * from './types.js'
export * from './utilities/index.js'
