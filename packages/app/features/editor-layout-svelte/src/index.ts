/**
 * Svelte editor layout scaffold.
 *
 * Exports `EditorLayout` — sticky top bar + main canvas + optional side
 * panel. It is the Svelte counterpart of `@molecule/app-editor-layout-react`:
 * the same props (React names) and the same DOM for the same input. Used for
 * blog post editors, product editors, bot flow editors, etc.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { EditorLayout } from '@molecule/app-editor-layout-svelte'
 *   import { EditorToolbar } from '@molecule/app-editor-toolbar-svelte'
 *   import ArticleEditor from './ArticleEditor.svelte'
 *   import MetadataPanel from './MetadataPanel.svelte'
 * </script>
 *
 * <EditorLayout sidePanelOpen={true}>
 *   {#snippet topBar()}
 *     <EditorToolbar title="Untitled post" />
 *   {/snippet}
 *   {#snippet canvas()}
 *     <ArticleEditor />
 *   {/snippet}
 *   {#snippet sidePanel()}
 *     <MetadataPanel />
 *   {/snippet}
 * </EditorLayout>
 * ```
 *
 * @remarks
 * - The scaffold claims the FULL viewport height (h-screen flex column).
 *   Render it as the page root; nesting it below another fixed-height app
 *   shell produces double scrollbars.
 * - The side panel container sets flex-shrink 0 but NO width — your
 *   `sidePanel` content must define its own width.
 * - `topBar` is wrapped in a sticky container by the layout itself (unlike
 *   `<DetailPageLayout>`); the slot does not need its own stickiness, but
 *   should bring a surface background.
 * - `ArticleEditor` and `MetadataPanel` above are your own components.
 * - Styling resolves through `getClassMap()` — requires a wired ClassMap
 *   bond (standard molecule app setup). No text of its own.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
