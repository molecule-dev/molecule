/**
 * Public types for `@molecule/app-embed-snippet-react`.
 *
 * @module
 */

/** Language used to format the rendered snippet. */
export type EmbedSnippetLanguage = 'html' | 'react' | 'iframe'

/** User-editable values that get substituted into a snippet template. */
export interface EmbedSnippetValues {
  /** Width of the embedded widget. May be a CSS length (`'600px'`) or a number (interpreted as px). */
  width?: string | number
  /** Height of the embedded widget. May be a CSS length (`'400px'`) or a number (interpreted as px). */
  height?: string | number
  /** Theme token forwarded into the snippet (e.g. `'light'`, `'dark'`). */
  theme?: string
}

/** Inline-control configuration: which knobs render alongside the snippet. */
export interface EmbedSnippetControls {
  /** Render a width input. */
  width?: boolean
  /** Render a height input. */
  height?: boolean
  /**
   * Render a theme selector. Either `true` (uses default theme options) or
   * an array of `{ value, label }` choices.
   */
  theme?: boolean | EmbedSnippetThemeOption[]
}

/** A single option for the theme `<select>` control. */
export interface EmbedSnippetThemeOption {
  /** Underlying value substituted into the snippet template. */
  value: string
  /** Human-readable label shown in the dropdown. Already translated by the caller. */
  label: string
}

/**
 * Props for `<EmbedSnippet>` — the copy-embed-code panel used by
 * 3d-model-viewer, status-page, embeddable-chat-widget, charts, etc.
 */
export interface EmbedSnippetProps {
  /**
   * Snippet template string with `{{width}}`, `{{height}}`, `{{theme}}`
   * placeholders that get substituted with the current `values`. Anything
   * not referenced is preserved verbatim.
   */
  template: string
  /** Optional inline controls (width / height / theme) bound to `values`. */
  controls?: EmbedSnippetControls
  /** Current control values. Required when `controls` is supplied. */
  values?: EmbedSnippetValues
  /** Called whenever the user changes a control value. */
  onChange?: (next: EmbedSnippetValues) => void
  /** Snippet language token, surfaced in the eyebrow + aria-label. Defaults to `'html'`. */
  language?: EmbedSnippetLanguage
  /** Optional heading override (defaults to a translated `Embed code`). */
  heading?: string
  /** Optional eyebrow override (defaults to a translated `Copy embed code`). */
  eyebrow?: string
  /** Called after a successful clipboard copy. */
  onCopy?: (rendered: string) => void
  /** How long the "Copied!" feedback lingers, in ms. Defaults to `1500`. */
  feedbackMs?: number
  /** Stable `data-mol-id` token for the panel root. Defaults to `'embed-snippet'`. */
  molId?: string
  /** Extra class string appended to the panel root. */
  className?: string
}
