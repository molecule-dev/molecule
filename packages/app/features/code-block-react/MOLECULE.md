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
npm install @molecule/app-code-block-react
```

## API

### Functions

#### `CodeBlock(root0, root0, root0, root0, root0, root0, root0)`

Read-only code block with an optional header (filename + language tag),
optional line numbers, and a copy-to-clipboard button.

Does NOT perform syntax highlighting — pair with an external
highlighter (e.g. `prismjs`, `shiki`) by passing already-highlighted
HTML through the `code` prop or by wrapping this component. The
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

- `root0` — *
- `root0` — .code
- `root0` — .language
- `root0` — .showLineNumbers
- `root0` — .showCopy
- `root0` — .filename
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
