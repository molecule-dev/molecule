# @molecule/app-password-strength-meter-react

Real-time password-strength meter for React.

Renders a 5-segment colored bar (red→green), a textual strength
label, and an optional rule checklist (length, upper, lower, digit,
symbol, no-common). Score is computed by an in-package lightweight
scorer — no zxcvbn dependency — using length × char-class entropy
with a small built-in common-password dictionary penalty.

Used by signup, password-change, and password-manager flows to
gate weak passwords before submit. All styling flows through
`getClassMap()`; all text flows through `t()`; companion locale
bond is `@molecule/app-locales-password-strength-meter`.

## Quick Start

```tsx
import { useState } from 'react'
import { PasswordStrengthMeter } from '@molecule/app-password-strength-meter-react'

function SignupForm() {
  const [password, setPassword] = useState('')
  const [score, setScore] = useState(0)
  return (
    <>
      <input value={password} onChange={(e) => setPassword(e.target.value)} />
      <PasswordStrengthMeter
        password={password}
        onScore={setScore}
        minScore={2}
        showChecklist
      />
      <button disabled={score < 2}>Sign up</button>
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-password-strength-meter-react @molecule/app-react @molecule/app-ui react
npm install -D @types/react
```

## API

### Interfaces

#### `PasswordChecklist`

Per-rule checklist outcomes returned by {@link scorePassword}.

```typescript
interface PasswordChecklist {
  /** Whether the password is at least 12 characters long. */
  length: boolean
  /** Whether the password contains an uppercase letter. */
  upper: boolean
  /** Whether the password contains a lowercase letter. */
  lower: boolean
  /** Whether the password contains a digit. */
  digit: boolean
  /** Whether the password contains a non-alphanumeric symbol. */
  symbol: boolean
  /** Whether the password is free of common-password substrings. */
  noCommon: boolean
}
```

#### `PasswordScoreResult`

Result of scoring a password.

```typescript
interface PasswordScoreResult {
  /** Discrete strength bucket from 0–4. */
  score: PasswordScore
  /** Estimated entropy in bits used to derive the score. */
  entropyBits: number
  /** Per-rule outcomes for the optional checklist UI. */
  checklist: PasswordChecklist
}
```

#### `PasswordStrengthMeterProps`

Props accepted by {@link PasswordStrengthMeter}.

```typescript
interface PasswordStrengthMeterProps {
  /** Password value to score (controlled by the parent form). */
  password: string
  /**
   * Fires whenever the score changes — used by signup forms to gate
   * the submit button on `score >= minScore`.
   */
  onScore?: (score: PasswordScore) => void
  /** Minimum acceptable score for surrounding form validation. Default: `2`. */
  minScore?: PasswordScore
  /** Whether the textual strength label (e.g. "Strong") is shown. Default: `true`. */
  showLabel?: boolean
  /** Whether the optional rule checklist is rendered below the bar. Default: `false`. */
  showChecklist?: boolean
  /** Extra classes appended to the outer wrapper. */
  className?: string
}
```

### Types

#### `PasswordScore`

Numeric password strength score, zxcvbn-style.

- `0` very weak, `1` weak, `2` fair, `3` good, `4` strong.

```typescript
type PasswordScore = 0 | 1 | 2 | 3 | 4
```

### Functions

#### `PasswordStrengthMeter(props)`

Real-time password strength meter.

Renders a 5-segment colored bar (red → green) plus an optional textual
label and rule checklist. Scoring is performed by an in-package
lightweight scorer (no zxcvbn dependency). All UI text flows through
`t()` so locale bonds can override translations; all styling flows
through `getClassMap()` so the meter restyles via the wired ClassMap
bond. Colors come from molecule's `--mol-color-*` design tokens.

```typescript
function PasswordStrengthMeter(props: PasswordStrengthMeterProps): ReactElement<unknown, string | JSXElementConstructor<any>>
```

- `props` — {@link PasswordStrengthMeterProps}.

**Returns:** The rendered meter element tree.

#### `scorePassword(password)`

Computes a password's strength score and per-rule checklist.

The score is derived from `length × log2(poolSize)` (Shannon
approximation) and then penalized when the password contains any
common-password substring. Empty passwords return `0` with the
full checklist set to false.

```typescript
function scorePassword(password: string): PasswordScoreResult
```

- `password` — The password to score.

**Returns:** The {@link PasswordScoreResult} for the supplied password.

### Constants

#### `COMMON_PASSWORDS`

Common-password dictionary used by the scorer.

Drawn from public top-100 lists of frequently leaked passwords.
Scoring matches case-insensitively against substrings of length ≥4
so derivatives like `password1!` are still penalized.

```typescript
const COMMON_PASSWORDS: readonly string[]
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `react`

`minScore` only surfaces as a `data-meets-min` attribute on the bar — gate
your submit button on the `onScore` value yourself (as in the example).
Segment colors read `var(--mol-color-error/warning/info/success)` with
built-in light fallbacks; molecule scaffolds define these in theme.css.
Companion locale bond: `@molecule/app-locales-password-strength-meter`.

## Translations

Translation strings are provided by `@molecule/app-locales-password-strength-meter`.
