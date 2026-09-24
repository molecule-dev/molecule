/**
 * Text/code diff viewer.
 *
 * Exports `<DiffViewer>` (unified or split mode). Pure JS line diff (LCS,
 * no external library) with add/remove row highlighting, optional line
 * numbers, and an optional filename header.
 *
 * @example
 * ```tsx
 * import { DiffViewer } from '@molecule/app-diff-viewer-react'
 *
 * export function ConfigChange() {
 *   const before = ['const retries = 1', 'const timeoutMs = 5000', 'export { retries }'].join('\n')
 *   const after = ['const retries = 3', 'const timeoutMs = 5000', 'export { retries, timeoutMs }'].join('\n')
 *   return <DiffViewer before={before} after={after} filename="src/config.ts" mode="unified" showLineNumbers />
 * }
 * ```
 *
 * @remarks
 * - `before`/`after` are whole strings split on `\n` — not arrays of lines, not a patch. Pass
 *   them as JS expressions (curly braces): a quoted JSX attribute (`before="a\nb"`) does NOT
 *   interpret `\n` — you would diff one line containing a literal backslash-n.
 * - It is a LINE diff only (no intra-line/word highlighting, no syntax highlighting, no
 *   collapsing of unchanged lines). A changed line shows as a `-` row followed by a `+` row.
 * - In `'unified'` mode (default) the line numbers are ROW numbers of the diff output, not the
 *   original/new file line numbers. `'split'` shows before (context + removed) and after
 *   (context + added) side by side, each numbered from 1.
 * - The diff is an O(n*m) dynamic program — fine for typical UI diffs; for very large inputs
 *   (10k+ lines) chunk or virtualize upstream.
 * - Highlight colors are fixed translucent green/red (rgba) rather than theme tokens; they read
 *   on light and dark surfaces but are not themeable via ClassMap.
 * - No user-facing text of its own (only +/- glyphs), so no locale bond is needed. Styling
 *   resolves through `getClassMap()` — `setClassMap(classMap)` from `@molecule/app-ui` must run
 *   at startup (it throws otherwise).
 *
 * @module
 */

export * from './DiffViewer.js'
