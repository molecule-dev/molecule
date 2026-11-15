/**
 * Angular functions for `@molecule/app-keyboard-shortcuts`.
 *
 * {@link useKeyboardShortcut} registers a shortcut with the bonded provider
 * for the life of a component and always calls the latest handler, so a
 * component can bind `/` to focus its search box or `mod+k` to open a
 * palette in one line. It is the Angular counterpart of
 * `@molecule/app-keyboard-shortcuts-react`: same names, same options, same
 * provider calls.
 *
 * @example
 * ```typescript
 * import { Component, type ElementRef, viewChild } from '@angular/core'
 * import { useTranslation } from '@molecule/app-angular'
 * import { useKeyboardShortcut } from '@molecule/app-keyboard-shortcuts-angular'
 *
 * @Component({
 *   selector: 'app-search',
 *   template: '<input #input />',
 * })
 * export class Search {
 *   // The binding's t re-runs the template on a locale switch.
 *   protected readonly t = useTranslation().t
 *
 *   readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input')
 *
 *   // A field initializer runs in the injection context.
 *   readonly shortcuts = useKeyboardShortcut('/', () => this.input().nativeElement.focus(), {
 *     description: this.t('catalogSearch.focus', undefined, { defaultValue: 'Focus search' }),
 *   })
 *   readonly palette = useKeyboardShortcut('mod+k', () => openPalette())
 * }
 * ```
 *
 * @remarks
 * - **`mod+` means Ctrl on Windows and Linux, Command on macOS** — the
 *   function registers both, so never write `ctrl+k` for a shortcut people
 *   expect as `⌘K` on a Mac.
 * - Whether a shortcut fires while an input has focus is the bond's decision
 *   (the hotkeys bond suppresses it, which is what `/` needs). Keys the input
 *   itself should handle — Escape to clear, arrows to move — belong on the
 *   input's own keydown handling, not here.
 * - With no provider bonded the function is a no-op rather than an error, so
 *   a shared component still renders in an app that never wired shortcuts.
 * - The `description` is shown by shortcut panels: pass it through `t()`.
 * - Call it in an injection context (a field initializer or constructor).
 *   Pass `keys` or `options` as a signal when any part of them can change,
 *   and a changing handler as a signal too; both are read at call time.
 *
 * @module
 */

export * from './types.js'
export * from './use-keyboard-shortcut.js'
