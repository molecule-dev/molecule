/**
 * Solid primitives for `@molecule/app-keyboard-shortcuts`.
 *
 * {@link useKeyboardShortcut} registers a shortcut with the bonded provider
 * for the life of a component and fires the handler the call gave it, so a
 * component can bind `/` to focus its search box or `mod+k` to open a
 * palette in one line. It is the Solid counterpart of
 * `@molecule/app-keyboard-shortcuts-react`: same names, same options, same
 * provider calls.
 *
 * @example
 * ```tsx
 * import { createSignal, onCleanup } from 'solid-js'
 * import { render } from 'solid-js/web'
 * import { useKeyboardShortcut } from '@molecule/app-keyboard-shortcuts-solid'
 * import { useTranslation } from '@molecule/app-solid'
 *
 * function Search() {
 *   const { t } = useTranslation()
 *   let input!: HTMLInputElement
 *   useKeyboardShortcut('/', () => input.focus(), {
 *     description: t('catalogSearch.focus', undefined, { defaultValue: 'Focus search' }),
 *   })
 *   useKeyboardShortcut('mod+k', () => openPalette())
 *   return <input ref={input} />
 * }
 *
 * render(() => <Search />, document.getElementById('root')!)
 * ```
 *
 * @remarks
 * - **`mod+` means Ctrl on Windows and Linux, Command on macOS** — the
 *   primitive registers both, so never write `ctrl+k` for a shortcut people
 *   expect as `⌘K` on a Mac.
 * - Whether a shortcut fires while an input has focus is the bond's decision
 *   (the hotkeys bond suppresses it, which is what `/` needs). Keys the input
 *   itself should handle — Escape to clear, arrows to move — belong on the
 *   input's own keydown handling, not here.
 * - With no provider bonded the primitive is a no-op rather than an error, so
 *   a shared component still renders in an app that never wired shortcuts.
 * - The `description` is shown by shortcut panels: pass it through `t()`.
 * - Call it in a component body (Solid's lifecycle only works there). A
 *   component body runs once, so pass `keys` or `options` as an accessor when
 *   any part of them can change; keep the handler a stable function that
 *   reads your own accessor when the action can change.
 *
 * @module
 */

export * from './types.js'
export * from './use-keyboard-shortcut.js'
