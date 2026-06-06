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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
