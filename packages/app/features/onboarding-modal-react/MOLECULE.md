# @molecule/app-onboarding-modal-react

Multi-step onboarding overlay.

Exports `<OnboardingModal>` and `OnboardingStep` type.

## Quick Start

```tsx
import { useState } from 'react'

import { OnboardingModal, type OnboardingStep } from '@molecule/app-onboarding-modal-react'

const steps: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
  { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
  { id: 'done', title: "You're all set", body: 'Start your first project.' },
]

function Onboarding() {
  const [open, setOpen] = useState(true)
  return (
    <OnboardingModal
      open={open}
      steps={steps}
      onClose={() => setOpen(false)}
      onComplete={() => setOpen(false)}
    />
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-onboarding-modal-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `OnboardingModalProps`

```typescript
interface OnboardingModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Called when closing (skip / X / completion). */
  onClose: () => void
  /** Onboarding steps. */
  steps: OnboardingStep[]
  /** Called when the user clicks "Done" on the last step. */
  onComplete?: () => void
  /** Show "Skip" link in the footer. Defaults to true. */
  allowSkip?: boolean
  /** Initial step index (uncontrolled). */
  defaultStep?: number
}
```

#### `OnboardingStep`

A single step in an onboarding flow, with a title, body, and optional media.

```typescript
interface OnboardingStep {
  id: string
  title: ReactNode
  body: ReactNode
  /** Optional media / illustration. */
  media?: ReactNode
}
```

### Functions

#### `OnboardingModal(props)`

Multi-step onboarding overlay — title + body + media, with prev/next
navigation and an optional Skip link. Tracks its own step state.

```typescript
function OnboardingModal({
  open,
  onClose,
  steps,
  onComplete,
  allowSkip = true,
  defaultStep = 0,
}: OnboardingModalProps): JSX.Element | null
```

- `props` — Component props (see {@link OnboardingModalProps}).

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

Requires a wired ClassMap bond and a React `I18nProvider` ancestor —
the composed `Modal` / `Button` (from `@molecule/app-ui-react`) and
`useTranslation()` all depend on them. Pair with
`@molecule/app-locales-onboarding-modal` for the Skip / Back / Next /
Get-started strings in 79 languages.

Step position is UNCONTROLLED and persists across close/reopen — a
user who closed on step 3 reopens on step 3. Remount the component
(e.g. `key={openCount}`) to restart from `defaultStep`. `onComplete`
fires only from the final-step button; closing via Skip or the
backdrop calls `onClose` alone — persist "onboarding seen" in
`onClose` if skipping should count as done.

## Translations

Translation strings are provided by `@molecule/app-locales-onboarding-modal`.
