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

## API

### Interfaces

#### `StepperStep`

Descriptor for a single step rendered inside a Stepper.

```typescript
interface StepperStep {
  /** Step id. */
  id: string
  /** Step label. */
  label: ReactNode
  /** Optional description. */
  description?: ReactNode
  /** Explicit status — when omitted, derived from `currentStep`. */
  status?: StepStatus
}
```

### Types

#### `StepStatus`

Possible visual/semantic states for a single stepper step.

```typescript
type StepStatus = 'completed' | 'current' | 'pending' | 'error'
```

### Functions

#### `Stepper(root0, root0, root0, root0, root0, root0, root0)`

Multi-step progress indicator — useful for checkout flows, onboarding
wizards, course module progress, etc.

Variants:
- `'dots'` — small numbered circles connected by a line.
- `'bar'` — horizontal filled bar with step labels above.
- `'cards'` — each step is a card with title + description.

```typescript
function Stepper({
  steps,
  currentStep,
  variant = 'dots',
  orientation = 'horizontal',
  onStepClick,
  className,
}: StepperProps): JSX.Element
```

- `root0` — *
- `root0` — .steps
- `root0` — .currentStep
- `root0` — .variant
- `root0` — .orientation
- `root0` — .onStepClick
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
