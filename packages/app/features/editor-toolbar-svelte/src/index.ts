/**
 * Svelte editor-top toolbar — the Svelte counterpart of
 * `@molecule/app-editor-toolbar-react`, with the same props and the same DOM.
 *
 * Exports `EditorToolbar` — title + badge + primary/secondary action groups —
 * and the `ToolbarAction` shape. Pair it with `EditorLayout` from
 * `@molecule/app-editor-layout-svelte` as its `topBar` slot.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { EditorToolbar } from '@molecule/app-editor-toolbar-svelte'
 * </script>
 *
 * <EditorToolbar
 *   title="My Blog Post"
 *   primaryActions={[
 *     { id: 'save', label: 'Save', onClick: () => save(), variant: 'outline' },
 *     { id: 'publish', label: 'Publish', onClick: () => publish(), variant: 'solid' },
 *   ]}
 * >
 *   {#snippet badge()}<span>Draft</span>{/snippet}
 * </EditorToolbar>
 * ```
 *
 * @remarks
 * - `sticky` defaults to TRUE and applies `position: sticky; top: 0` with a
 *   TRANSPARENT background — pass a surface class via `className` or page
 *   content will scroll visibly through the toolbar.
 * - Action `label`s render verbatim (into the button and nothing else) — pass
 *   already-translated strings; the component has no `t()` calls or locale
 *   bond of its own.
 * - Prefer `onClick` over `href`: an `href` action wraps the button in a plain
 *   anchor (full page navigation, and invalid button-in-anchor nesting for
 *   assistive tech).
 * - A 1px divider renders between the primary and secondary groups only when
 *   both are non-empty.
 * - Buttons come from `@molecule/app-ui-svelte`; requires a wired ClassMap
 *   bond (standard molecule app setup). Node-valued props (`title`, `badge`,
 *   `leading`) are snippets; an action's node fields are snippets or strings.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
