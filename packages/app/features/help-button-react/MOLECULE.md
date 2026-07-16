# @molecule/app-help-button-react

Floating / inline help button — a circular button for launching help,
support chat, or docs. Fixed bottom-corner positioning by default;
`position="inline"` renders a normal in-flow button.

## Quick Start

```tsx
import { useState } from 'react'
import { HelpButton } from '@molecule/app-help-button-react'

function Support() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <HelpButton position="bottom-right" size="md" onClick={() => setOpen(true)} />
      <HelpButton position="inline" size="sm" href="https://docs.example.com" />
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-help-button-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `HelpButtonProps`

```typescript
interface HelpButtonProps {
  /** Optional icon — defaults to "?". */
  icon?: ReactNode
  /** Accessible label — defaults to "Help". */
  label?: string
  /** Click handler — open a help panel, support chat, docs, etc. */
  onClick?: () => void
  /** When provided, clicking navigates to this URL. Mutually exclusive with onClick. */
  href?: string
  /** Visual size. Defaults to `'md'`. */
  size?: 'sm' | 'md' | 'lg'
  /** Position when used as a floating button. Defaults to `'bottom-right'`. */
  position?: 'bottom-right' | 'bottom-left' | 'inline'
  /** Show unread/notification dot in the corner. */
  hasNotification?: boolean
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `HelpButton(props)`

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

- `props` — Component props (see {@link HelpButtonProps}).

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

- The button ships with NO surface styling of its own (no background,
  border, or shadow) — pass `className` with your surface classes or it
  renders as a bare "?" floating over the page.
- `useTranslation()` supplies the default aria-label (`helpButton.label`
  via `@molecule/app-locales-help-button`) and THROWS outside
  `@molecule/app-react`'s `I18nProvider`; `getClassMap()` needs a bonded
  ClassMap. Pass `label` to skip i18n for the aria-label.
- `href` and `onClick` are mutually exclusive — `href` wins and renders an
  `<a>`; there is no `target="_blank"` handling, add your own anchor if you
  need one.

## Translations

Translation strings are provided by `@molecule/app-locales-help-button`.
