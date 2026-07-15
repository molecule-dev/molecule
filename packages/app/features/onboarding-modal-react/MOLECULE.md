# @molecule/app-onboarding-modal-react

Multi-step onboarding overlay.

Exports `<OnboardingModal>` and `OnboardingStep` type.

## Quick Start

```tsx
import { OnboardingModal, OnboardingStep } from '@molecule/app-onboarding-modal-react'

const steps: OnboardingStep[] = [
  { id: 'welcome', title: 'Welcome!', body: 'Let us show you around.' },
  { id: 'features', title: 'Key Features', body: 'Build apps in minutes.' },
  { id: 'done', title: "You're all set", body: 'Start your first project.' },
]

<OnboardingModal
  open={showOnboarding}
  steps={steps}
  onClose={() => setShowOnboarding(false)}
  onComplete={() => router.push('/dashboard')}
/>
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

#### `OnboardingModal(root0, root0, root0, root0, root0, root0, root0)`

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

- `root0` — *
- `root0` — .open
- `root0` — .onClose
- `root0` — .steps
- `root0` — .onComplete
- `root0` — .allowSkip
- `root0` — .defaultStep

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
