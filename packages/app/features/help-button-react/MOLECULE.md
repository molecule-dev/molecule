# @molecule/app-help-button-react

Floating / inline help button.

Exports `<HelpButton>` — circular FAB-style button or inline button
for launching help, support chat, or docs.

## Quick Start

```tsx
import { HelpButton } from '@molecule/app-help-button-react'

// Floating bottom-right FAB that opens a support panel
<HelpButton
  position="bottom-right"
  size="md"
  hasNotification={false}
  onClick={() => setSupportOpen(true)}
/>

// Inline variant that links to docs
<HelpButton position="inline" size="sm" href="https://docs.example.com" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-help-button-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
