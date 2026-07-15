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
npm install @molecule/app-help-button-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Functions

#### `HelpButton(root0, root0, root0, root0, root0, root0, root0, root0, root0)`

Floating (or inline) help button — opens a support panel, chat
widget, or docs. Default icon is "?" but apps can swap in their own.

Use `position="inline"` inside other UI to drop the fixed
positioning and render as a normal in-flow button.

```typescript
function HelpButton({
  icon,
  label,
  onClick,
  href,
  size = 'md',
  position = 'bottom-right',
  hasNotification,
  className,
}: HelpButtonProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `root0` — *
- `root0` — .icon
- `root0` — .label
- `root0` — .onClick
- `root0` — .href
- `root0` — .size
- `root0` — .position
- `root0` — .hasNotification
- `root0` — .className

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
