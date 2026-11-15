/**
 * Angular click-to-edit inline field — the counterpart of
 * `@molecule/app-inline-edit-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<InlineEdit>`: the value rendered as text, with a click (or Tab +
 * Enter) swapping in an input or textarea plus Save/Cancel buttons. Enter
 * submits (Cmd/Ctrl+Enter for the textarea variant), Escape cancels.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { InlineEdit } from '@molecule/app-inline-edit-angular'
 *
 * @Component({
 *   selector: 'app-deal',
 *   standalone: true,
 *   imports: [InlineEdit],
 *   template: `
 *     <mol-inline-edit
 *       [value]="title()"
 *       [onSubmit]="saveTitle"
 *       placeholder="Enter deal title"
 *     />
 *   `,
 * })
 * export class Deal {
 *   readonly title = signal('Acme renewal')
 *   saveTitle = async (next: string): Promise<void> => {
 *     this.title.set(next)
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond and `@molecule/app-angular`'s i18n
 *   provider above it — `getClassMap()` and `useTranslation()` both throw
 *   before wiring. Pair with `@molecule/app-locales-inline-edit` for the
 *   placeholder / button strings in 79 languages.
 * - Return a Promise from `onSubmit` to disable the buttons while saving.
 *   If `onSubmit` REJECTS, the editor stays open with the draft intact but
 *   the error is not displayed — catch and surface errors inside your
 *   `onSubmit` (toast, form error, etc.).
 * - The draft re-syncs from `value` whenever the input changes, including
 *   mid-edit — avoid mutating `value` while the user is typing.
 * - React's `renderRead` render prop is an `ng-template` receiving the value
 *   as `$implicit` / `a0`.
 *
 * @module
 */

export * from './inline-edit.component.js'
export * from './types.js'
