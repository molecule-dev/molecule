/**
 * Solid editor-top toolbar.
 *
 * Exports `EditorToolbar` — title + badge + primary/secondary action groups —
 * and the `ToolbarAction` shape. It is the Solid counterpart of
 * `@molecule/app-editor-toolbar-react`: the same props and the same DOM for
 * the same input.
 *
 * @example
 * ```tsx
 * import { EditorToolbar } from '@molecule/app-editor-toolbar-solid'
 *
 * export function Page() {
 *   return (
 *     <EditorToolbar
 *       title="My Blog Post"
 *       badge={<span>Draft</span>}
 *       primaryActions={[
 *         { id: 'save', label: 'Save', onClick: () => save(), variant: 'outline' },
 *         {
 *           id: 'publish',
 *           label: 'Publish',
 *           onClick: () => publish(),
 *           variant: 'solid',
 *           color: 'primary',
 *         },
 *       ]}
 *     />
 *   )
 * }
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
 * - Buttons come from `@molecule/app-ui-solid`; requires a wired ClassMap bond
 *   (standard molecule app setup). Node-valued props are Solid JSX values.
 *
 * @module
 */

export * from './EditorToolbar.jsx'
export * from './types.js'
