/**
 * Angular floating / inline help button — a circular button for launching
 * help, support chat, or docs. Fixed bottom-corner positioning by default;
 * `position="inline"` renders a normal in-flow button.
 *
 * Angular counterpart of `@molecule/app-help-button-react`: the same props, and
 * the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { HelpButton } from '@molecule/app-help-button-angular'
 *
 * @Component({
 *   selector: 'app-support',
 *   standalone: true,
 *   imports: [HelpButton],
 *   template: `
 *     <div mol-help-button position="bottom-right" size="md" [onClick]="showHelp">
 *       <span slot="icon" aria-hidden="true">?</span>
 *     </div>
 *     <div mol-help-button position="inline" size="sm" href="https://docs.example.com"></div>
 *   `,
 * })
 * export class Support {
 *   readonly open = signal(false)
 *
 *   showHelp(): void {
 *     this.open.set(true)
 *   }
 * }
 * ```
 *
 * @remarks
 * - The button ships with NO surface styling of its own (no background,
 *   border, or shadow) — pass `className` with your surface classes or it
 *   renders as a bare "?" floating over the page.
 * - `useTranslation()` supplies the default aria-label (`helpButton.label`)
 *   and THROWS outside `@molecule/app-angular`'s i18n providers; `getClassMap()`
 *   needs a bonded ClassMap. Pass `label` to skip i18n for the aria-label.
 * - `href` and `onClick` are mutually exclusive — `href` wins and the root is
 *   an `<a>`; there is no `target="_blank"` handling, add your own anchor if
 *   you need one.
 * - The `icon` prop is projected content (`[slot=icon]`); every other prop
 *   keeps its React name.
 *
 * @module
 */

export * from './help-button.component.js'
export * from './types.js'
