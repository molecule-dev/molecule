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
 * ```ts
 * import { Component } from '@angular/core'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { MoleculeButton, MoleculeInput } from '@molecule/app-ui-angular'
 *
 * // Once at startup, before the first component renders:
 * setClassMap(classMap)
 *
 * @Component({
 *   selector: 'app-save-panel',
 *   standalone: true,
 *   imports: [MoleculeButton, MoleculeInput],
 *   template: `
 *     <mol-input placeholder="Name" [value]="name" (handleInput)="onName($event)"></mol-input>
 *     <mol-button color="primary" [loading]="saving" (handleClick)="save()">Save</mol-button>
 *   `,
 * })
 * class SavePanel {
 *   name = ''
 *   saving = false
 *   onName(event: Event): void {
 *     this.name = (event.target as HTMLInputElement).value
 *   }
 *   save(): void {}
 * }
 * ```
 *
 * @remarks
 * - **`setClassMap()` must run before any component renders** — every component resolves its
 *   classes through `getClassMap()`, which THROWS until a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) is set. Call it in `main.ts` before `bootstrapApplication`.
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
