# @molecule/app-embed-snippet-react

`@molecule/app-embed-snippet-react` — `<EmbedSnippet>` component.

Renders a pre-formatted HTML / iframe / React snippet inside a `<pre>`
element with a copy-to-clipboard button and optional inline controls
(width / height / theme) bound to caller-provided state. Reusable across
any embeddable widget — 3d-model-viewer, chat-widget, charts, status-page.

## Quick Start

```tsx
import { EmbedSnippet } from '@molecule/app-embed-snippet-react'

<EmbedSnippet
  template={'<iframe src="https://example.com/embed" width="{{width}}" height="{{height}}" data-theme="{{theme}}" />'}
  controls={{ width: true, height: true, theme: true }}
  values={values}
  onChange={setValues}
  language="iframe"
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-embed-snippet-react
```

## API

### Interfaces

#### `EmbedSnippetControls`

Inline-control configuration: which knobs render alongside the snippet.

```typescript
interface EmbedSnippetControls {
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
```

#### `EmbedSnippetProps`

Props for `<EmbedSnippet>` — the copy-embed-code panel used by
3d-model-viewer, status-page, embeddable-chat-widget, charts, etc.

```typescript
interface EmbedSnippetProps {
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
```

#### `EmbedSnippetThemeOption`

A single option for the theme `<select>` control.

```typescript
interface EmbedSnippetThemeOption {
  /** Underlying value substituted into the snippet template. */
  value: string
  /** Human-readable label shown in the dropdown. Already translated by the caller. */
  label: string
}
```

#### `EmbedSnippetValues`

User-editable values that get substituted into a snippet template.

```typescript
interface EmbedSnippetValues {
  /** Width of the embedded widget. May be a CSS length (`'600px'`) or a number (interpreted as px). */
  width?: string | number
  /** Height of the embedded widget. May be a CSS length (`'400px'`) or a number (interpreted as px). */
  height?: string | number
  /** Theme token forwarded into the snippet (e.g. `'light'`, `'dark'`). */
  theme?: string
}
```

### Types

#### `EmbedSnippetLanguage`

Language used to format the rendered snippet.

```typescript
type EmbedSnippetLanguage = 'html' | 'react' | 'iframe'
```

### Functions

#### `coerceDimension(value)`

Coerce a width/height value into the string form embedded in the
rendered snippet. Numbers become `<n>px`; strings pass through; nullish
values become an empty string.

```typescript
function coerceDimension(value: string | number | null | undefined): string
```

- `value` — The raw value supplied by the caller.

**Returns:** A string ready for substitution.

#### `substituteTemplate(template, values)`

Substitute `{{width}}`, `{{height}}`, `{{theme}}` (case-sensitive,
optional internal whitespace) in a template with the supplied values.

Unknown placeholders are left untouched so callers can freely mix this
with their own templating.

```typescript
function substituteTemplate(template: string, values?: EmbedSnippetValues): string
```

- `template` — Raw snippet template.
- `values` — Values to substitute.

**Returns:** The template with known placeholders replaced.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

All UI text resolves through `useTranslation()` from `@molecule/app-react`
with English fallbacks. Companion locale bond:
`@molecule/app-locales-embed-snippet`.

## Translations

Translation strings are provided by `@molecule/app-locales-embed-snippet-react`.
