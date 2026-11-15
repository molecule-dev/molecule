/**
 * Svelte functions for `@molecule/app-keyboard-shortcuts`.
 *
 * {@link useKeyboardShortcut} registers a shortcut with the bonded provider
 * for the life of a component and always calls the latest handler, so a
 * component can bind `/` to focus its search box or `mod+k` to open a
 * palette in one line. It is the Svelte counterpart of
 * `@molecule/app-keyboard-shortcuts-react`: same names, same options, same
 * provider calls.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { useKeyboardShortcut } from '@molecule/app-keyboard-shortcuts-svelte'
 *   import { useTranslation } from '@molecule/app-svelte'
 *
 *   const { t } = useTranslation()
 *   let input: HTMLInputElement | undefined = $state()
 *   useKeyboardShortcut('/', () => input?.focus(), {
 *     description: t('catalogSearch.focus', undefined, { defaultValue: 'Focus search' }),
 *   })
 *   useKeyboardShortcut('mod+k', () => openPalette())
 * </script>
 *
 * <input bind:this={input} />
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
 * - Call it during component init (a component's `<script>` block), where
 *   Svelte's lifecycle works. Pass `keys` or `options` as a readable store
 *   when any part of them can change, and a changing handler as a store too;
 *   both are read at call time.
 *
 * @module
 */

export * from './types.js'
export * from './useKeyboardShortcut.js'
