/**
 * Vue hooks for `@molecule/app-keyboard-shortcuts`.
 *
 * {@link useKeyboardShortcut} registers a shortcut with the bonded provider
 * for the life of a component and always calls the latest handler, so a
 * component can bind `/` to focus its search box or `mod+k` to open a
 * palette in one line. It is the Vue counterpart of
 * `@molecule/app-keyboard-shortcuts-react`: same names, same options, same
 * provider calls.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue'
 * import { useKeyboardShortcut } from '@molecule/app-keyboard-shortcuts-vue'
 * import { useTranslation } from '@molecule/app-vue'
 *
 * const { t } = useTranslation()
 * const input = ref<HTMLInputElement | null>(null)
 * useKeyboardShortcut('/', () => input.value?.focus(), {
 *   description: t('catalogSearch.focus', undefined, { defaultValue: 'Focus search' }),
 * })
 * useKeyboardShortcut('mod+k', () => openPalette())
 * </script>
 *
 * <template>
 *   <input ref="input" />
 * </template>
 * ```
 *
 * @remarks
 * - **`mod+` means Ctrl on Windows and Linux, Command on macOS** — the
 *   composable registers both, so never write `ctrl+k` for a shortcut people
 *   expect as `⌘K` on a Mac.
 * - Whether a shortcut fires while an input has focus is the bond's decision
 *   (the hotkeys bond suppresses it, which is what `/` needs). Keys the input
 *   itself should handle — Escape to clear, arrows to move — belong on the
 *   input's own keydown handling, not here.
 * - With no provider bonded the composable is a no-op rather than an error,
 *   so a shared component still renders in an app that never wired shortcuts.
 * - The `description` is shown by shortcut panels: pass it through `t()`.
 * - Call it in `setup()` (a `<script setup>` block or the `setup()` option).
 *   Pass `keys` or `options` as a ref/getter to follow a change on the same
 *   instance; pass a changing handler as a ref, which is read at call time.
 *
 * @module
 */

export * from './types.js'
export * from './useKeyboardShortcut.js'
