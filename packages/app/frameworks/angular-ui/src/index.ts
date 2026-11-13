/**
 * Angular UI components for molecule.dev.
 *
 * Provides standalone Angular components at parity with `@molecule/app-ui-react`:
 * every React export exists here under the same name, with the same props, the
 * same rendered DOM (ClassMap classes, attributes, inline styles, text) and the
 * same behaviour. The shared conformance kit
 * (`@molecule/app-framework-conformance`) proves the parity.
 *
 * React-named exports include `Button`, `Card` (+ `CardHeader`, `CardTitle`,
 * `CardDescription`, `CardContent`, `CardFooter`), `Input`, `Select`,
 * `Textarea`, `Checkbox`, `RadioGroup`, `Switch`, `Accordion`, `Alert`,
 * `Avatar`, `Badge`, `EmptyState`, `Icon`, `Label`, `Progress`, `Separator`,
 * `Skeleton`, `Spinner`, `Tabs`, `Table`, `Pagination`, `Tooltip`, `Modal`,
 * `Toast` (+ `ToastContainer`, `ToastProvider`), `ConfirmDialog`,
 * `PromptDialog`, `Dropdown` (+ `DropdownLabel`, `DropdownSeparator`),
 * `Form`, `FormField`, `LanguagePicker`, `PageHeader`, `PageShell`,
 * `ResponsiveAppShell` (+ its `TopBar`, `Sidebar`, `Drawer`, `Content`
 * parts), `SidebarUserCard`, `UserMenu`, `UserMenuPopover` (+ its `Trigger`,
 * `Panel`, `SignOut` parts), `AuthGuard`, `ConfirmButton`,
 * `OptimisticToggleButton`, `ThemeToggle`, and the hooks `useToast`,
 * `usePanelClose`, `useIsDesktop` and `useUserMenuPopoverClose`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { Button, Input } from '@molecule/app-ui-angular'
 *
 * // Once at startup, before the first component renders:
 * setClassMap(classMap)
 *
 * @Component({
 *   selector: 'app-save-panel',
 *   standalone: true,
 *   imports: [Button, Input],
 *   template: `
 *     <input mol-input placeholder="Name" [value]="name" (change)="onName($event)" />
 *     <button mol-button color="primary" [loading]="saving" (click)="save()">Save</button>
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
 * - A component's selector names the native element React renders at its root (an attribute
 *   selector such as `button[mol-button]`), so the host IS the root element. Components whose
 *   React root is a fragment or portal use an element selector whose host is
 *   `display: contents`.
 * - Hooks (`useToast`, `usePanelClose`, `useIsDesktop`, `useUserMenuPopoverClose`) are called in
 *   an injection context (a component field initializer or constructor).
 * - The original first-pass components remain exported under their `Molecule*` names
 *   (`MoleculeButton`, `MoleculeInput`, `MoleculeModal`, …) as deprecated aliases.
 *
 * @module
 */

export * from './components/index.js'
export * from './hooks/index.js'
export * from './types.js'
export * from './utilities/index.js'
