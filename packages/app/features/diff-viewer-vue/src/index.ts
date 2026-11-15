/**
 * Vue text/code diff viewer.
 *
 * Exports `<DiffViewer>` (unified or split mode) — the Vue counterpart of
 * `@molecule/app-diff-viewer-react`, with the same props (React names), the
 * same ClassMap tokens and the same DOM for the same input. Pure JS line diff
 * (LCS, no external library) with add/remove row highlighting, optional line
 * numbers, and an optional filename header.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 *
 * import { DiffViewer } from '@molecule/app-diff-viewer-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const before = ref('const x = 1\nconsole.log(x)')
 *     const after = ref('const x = 2\nconsole.log(x)')
 *     return () =>
 *       h(DiffViewer, {
 *         before: before.value,
 *         after: after.value,
 *         filename: 'src/config.ts',
 *         mode: 'unified',
 *         showLineNumbers: true,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - The diff is an O(n*m) dynamic program — fine for typical UI diffs;
 *   for very large inputs (10k+ lines) chunk or virtualize upstream.
 * - Highlight colors are fixed translucent green/red (rgba) rather than
 *   theme tokens; they read on light and dark surfaces but are not
 *   themeable via ClassMap.
 * - No user-facing text of its own (only +/- glyphs), so no locale bond is
 *   needed. Styling resolves through `getClassMap()` — requires a wired
 *   ClassMap bond (standard molecule app setup).
 *
 * @module
 */

export * from './DiffViewer.js'
export * from './types.js'
