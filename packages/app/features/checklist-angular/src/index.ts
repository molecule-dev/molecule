/**
 * Angular onboarding checklist with checkboxes and overall progress bar.
 *
 * Exports `<Checklist>` and the `ChecklistItem` type. It is the Angular
 * counterpart of `@molecule/app-checklist-react`: the same props (React
 * names), the same DOM for the same input, and the same `onToggle` calls, so
 * an app switches framework by changing only the package name in its imports.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { Checklist, type ChecklistItem } from '@molecule/app-checklist-angular'
 *
 * @Component({
 *   selector: 'app-onboarding',
 *   standalone: true,
 *   imports: [Checklist],
 *   template: `
 *     <div
 *       mol-checklist
 *       [items]="items()"
 *       [onToggle]="toggle"
 *       [title]="'Getting started'"
 *     ></div>
 *   `,
 * })
 * export class Onboarding {
 *   readonly items = signal<ChecklistItem[]>([
 *     { id: 'profile', label: 'Complete your profile', completed: true },
 *     { id: 'invite', label: 'Invite a team member', completed: false },
 *     { id: 'project', label: 'Create your first project', completed: false },
 *   ])
 *
 *   readonly toggle = (id: string, next: boolean): void => {
 *     this.items.update((items) =>
 *       items.map((item) => (item.id === id ? { ...item, completed: next } : item)),
 *     )
 *   }
 * }
 * ```
 *
 * @remarks
 * The progress line uses the i18n key `checklist.progress` (`{{done}}`,
 * `{{total}}`), translated by the `@molecule/app-locales-checklist` companion
 * bond. `label`/`description`/`title` are consumer-provided nodes — pass
 * translated strings via `t()`. The component is fully controlled: it never
 * mutates `completed`; persist the toggle in `onToggle(id, next)` and pass
 * updated `items` again.
 *
 * @module
 */

export * from './checklist.component.js'
export * from './types.js'
