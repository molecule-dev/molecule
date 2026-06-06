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
npm install @molecule/app-password-strength-meter-react
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

### Types

#### `PasswordScore`

Numeric password strength score, zxcvbn-style.

- `0` very weak, `1` weak, `2` fair, `3` good, `4` strong.

```typescript
type PasswordScore = 0 | 1 | 2 | 3 | 4
```

### Functions

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

## Translations

Translation strings are provided by `@molecule/app-locales-password-strength-meter-react`.
