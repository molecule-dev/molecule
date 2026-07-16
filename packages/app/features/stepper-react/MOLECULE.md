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
npm install @molecule/app-stepper-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `StepperProps`

Props for the {@link Stepper} component.

```typescript
interface StepperProps {
  /** Steps to render. */
  steps: StepperStep[]
  /** Index of the current step (0-based). */
  currentStep: number
  /** Visual variant. */
  variant?: 'dots' | 'bar' | 'cards'
  /** Layout orientation. */
  orientation?: 'horizontal' | 'vertical'
  /**
   * Optional navigation click handler. Variant-dependent: in `cards` it
   * fires only for completed steps (others render disabled); in `dots`
   * it fires for ANY step — guard inside the handler if backward-only
   * navigation is required. The `bar` variant is not clickable.
   */
  onStepClick?: (stepId: string, index: number) => void
  /** Extra classes. */
  className?: string
}
```

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

#### `Stepper(props)`

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

- `props` — Component props (see {@link StepperProps}).

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

- Purely visual and unrelated to `@molecule/app-stepper` (the headless
  step-STATE core with its own bond) — do NOT wire `bond('stepper')`
  for this component; you own `currentStep` in app state and this
  package only renders it.
- Requires a wired ClassMap bond (`getClassMap()` throws before
  bonding). Step labels are ReactNode — pass translated strings.
- Status is derived from `currentStep` unless a step sets an explicit
  `status`. The `'error'` member of `StepStatus` currently renders
  IDENTICALLY to `'pending'` (no error styling is implemented).
- `onStepClick` behavior differs by variant: in `cards` only completed
  steps are clickable (others are disabled); in `dots` the handler
  fires for ANY step — guard inside your handler if backward-only
  navigation is required. The `bar` variant is not clickable.
- Dots show state via checkmark/number and label weight only — there
  is no color fill per status.
