# @molecule/app-code-block-react

React code block display.

Exports `<CodeBlock>` — read-only code panel with optional filename +
language header, line numbers, and copy-to-clipboard button.

## Quick Start

```tsx
import { CodeBlock } from '@molecule/app-code-block-react'

<CodeBlock
  code={`const greet = (name: string) => \`Hello, \${name}!\``}
  language="ts"
  filename="greet.ts"
  showLineNumbers
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-code-block-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `CodeBlockProps`

```typescript
interface CodeBlockProps {
  /** Source code to display. */
  code: string
  /** Language tag (`"ts"`, `"bash"`, …). Shown in the header and used as a hint by external highlighters. */
  language?: string
  /** Show line numbers. Defaults to true. */
  showLineNumbers?: boolean
  /** Show a copy-to-clipboard button. Defaults to true. */
  showCopy?: boolean
  /** Optional custom filename / caption shown left of the language. */
  filename?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `CodeBlock(props)`

Read-only code block with an optional header (filename + language tag),
optional line numbers, and a copy-to-clipboard button.

Does NOT perform syntax highlighting, and `code` is always rendered as
escaped plain text — passing pre-highlighted HTML displays literal tags.
To highlight, wrap or replace this component with your highlighter's
(e.g. `prismjs`, `shiki`) own renderer. The
component keeps the no-hidden-dependency contract typical of
`@molecule/*` features.

```typescript
function CodeBlock({
  code,
  language,
  showLineNumbers = true,
  showCopy = true,
  filename,
  className,
}: CodeBlockProps): JSX.Element
```

- `props` — Component props (see {@link CodeBlockProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

`code` is rendered as PLAIN TEXT — there is no syntax highlighting and no
HTML parsing, so do not pass pre-highlighted HTML (it will display as
literal tags). To highlight, wrap or replace this component with one that
renders your highlighter's output; `language` is only a header label. The
copy button uses `navigator.clipboard` and silently does nothing on
insecure (non-HTTPS) contexts. Copy/Copied labels are translated via the
`codeBlock.*` keys (companion bond: `@molecule/app-locales-code-block`).

## Translations

Translation strings are provided by `@molecule/app-locales-code-block`.
