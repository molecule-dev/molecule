# @molecule/app-stepper-react

React multi-step progress indicator.

Exports:
- `<Stepper>` — steps with `dots` / `bar` / `cards` variants and horizontal / vertical orientations.
- `StepperStep`, `StepStatus` types.

Use for checkout flows, onboarding wizards, course module progress,
multi-page forms.

## Quick Start

```tsx
import { Stepper } from '@molecule/app-stepper-react'

const steps = [
  { id: 'account', label: 'Account' },
  { id: 'plan', label: 'Choose plan' },
  { id: 'payment', label: 'Payment' },
]

<Stepper steps={steps} currentStep={1} variant="dots" />
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-stepper-react
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
