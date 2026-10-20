/**
 * Ambient module declaration for `turndown-plugin-gfm` — the plugin ships no
 * types of its own. It exports one plain-object of Turndown plugins (`gfm`,
 * `tables`, `strikethrough`, `taskListItems`, `highlightedCodeBlock`), each a
 * `(service: TurndownService) => void`.
 *
 * @module
 */

declare module 'turndown-plugin-gfm' {
  import type TurndownService from 'turndown'

  type TurndownPlugin = (service: TurndownService) => void

  /** The whole GFM set: tables, strikethrough, task lists, highlighted code. */
  export const gfm: TurndownPlugin
  /** GFM tables (`| a | b |` with the `---` divider row). */
  export const tables: TurndownPlugin
  /** GFM `~~strikethrough~~`. */
  export const strikethrough: TurndownPlugin
  /** GFM `- [x] task list` items. */
  export const taskListItems: TurndownPlugin
  /** Fenced code blocks carrying a highlight language. */
  export const highlightedCodeBlock: TurndownPlugin
}
