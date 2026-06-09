# @molecule/app-typing-indicator-react

Three-dot typing indicator for chat UIs.

Exports `<TypingIndicator>` — CSS-only three-dot pulse animation.

## Quick Start

```tsx
import { TypingIndicator } from '@molecule/app-typing-indicator-react'

// Show while the remote participant is composing
<TypingIndicator visible={isTyping} ariaLabel="Alice is typing…" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-typing-indicator-react
```

## API

### Functions

#### `TypingIndicator(root0, root0, root0, root0, root0, root0)`

Three-dot "typing…" animation. CSS-only (no library dependency) —
uses `@keyframes` defined via inline style tag. Renders three dots
that pulse in sequence.

```typescript
function TypingIndicator({
  visible = true,
  dotSize = 6,
  durationMs = 1200,
  ariaLabel = 'Typing…',
  className,
}: TypingIndicatorProps): JSX.Element | null
```

- `root0` — *
- `root0` — .visible
- `root0` — .dotSize
- `root0` — .durationMs
- `root0` — .ariaLabel
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
