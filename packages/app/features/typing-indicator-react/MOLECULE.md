# @molecule/app-typing-indicator-react

Three-dot typing indicator for chat UIs.

Exports `<TypingIndicator>` — CSS-only three-dot pulse animation.

## Quick Start

```tsx
import { TypingIndicator } from '@molecule/app-typing-indicator-react'

const isTyping = true

<TypingIndicator visible={isTyping} ariaLabel="Alice is typing…" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-typing-indicator-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `TypingIndicatorProps`

Props for the {@link TypingIndicator} component.

```typescript
interface TypingIndicatorProps {
  /** Whether to render. Defaults to true. */
  visible?: boolean
  /** Dot diameter in pixels. Defaults to 6. */
  dotSize?: number
  /** Animation duration in ms. Defaults to 1200. */
  durationMs?: number
  /** Accessible label. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `TypingIndicator(props)`

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

- `props` — Component props (see {@link TypingIndicatorProps}).

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

Dots use `currentColor`, so the indicator inherits the surrounding text
color — wrap it in a muted-text container to dim it. The default
`ariaLabel` is hardcoded English 'Typing…' and there is no companion
locale bond: pass a translated `ariaLabel` in non-English apps. Each
instance injects its own `<style>` tag for the keyframes (fine for a chat
view; avoid hundreds at once). Props (documented on the exported
`TypingIndicatorProps` interface): visible (default true), dotSize (px,
default 6), durationMs (default 1200), ariaLabel, className.
