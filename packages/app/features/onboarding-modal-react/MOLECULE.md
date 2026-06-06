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
npm install @molecule/app-onboarding-modal-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
