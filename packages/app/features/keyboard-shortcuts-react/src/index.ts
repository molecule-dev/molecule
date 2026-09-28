/**
 * React hook for `@molecule/app-keyboard-shortcuts`.
 *
 * {@link useKeyboardShortcut} registers a shortcut with the bonded provider
 * for the life of a component and always calls the latest handler, so a
 * component can bind `/` to focus its search box or `mod+k` to open a
 * palette in one line.
 *
 * @example
 * ```tsx
 * import { useRef } from 'react'
 * import { useKeyboardShortcut } from '@molecule/app-keyboard-shortcuts-react'
 *
 * function Search() {
 *   const input = useRef<HTMLInputElement>(null)
 *   useKeyboardShortcut('/', () => input.current?.focus(), {
 *     description: t('search.shortcut', undefined, { defaultValue: 'Focus search' }),
 *   })
 *   useKeyboardShortcut('mod+k', () => openPalette())
 *   return <input ref={input} />
 * }
 * ```
 *
 * @remarks
 * - **`mod+` means Ctrl on Windows and Linux, Command on macOS** — the hook
 *   registers both, so never write `ctrl+k` for a shortcut people expect as
 *   `⌘K` on a Mac.
 * - Whether a shortcut fires while an input has focus is the bond's decision
 *   (the hotkeys bond suppresses it, which is what `/` needs). Keys the input
 *   itself should handle — Escape to clear, arrows to move — belong on the
 *   input's `onKeyDown`, not here.
 * - With no provider bonded the hook is a no-op rather than an error, so a
 *   shared component still renders in an app that never wired shortcuts.
 * - The `description` is shown by shortcut panels: pass it through `t()`.
 *
 * @module
 */

export * from './useKeyboardShortcut.js'
