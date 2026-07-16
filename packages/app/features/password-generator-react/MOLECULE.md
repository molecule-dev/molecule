# @molecule/app-password-generator-react

React password generator feature for molecule.dev.

Exports `<PasswordGenerator>` — a configurable, cryptographically-secure
password generator UI (length slider, character-class toggles, copy +
regenerate buttons, optional `onPick` for wiring into forms /
password-manager save flows).

## Quick Start

```tsx
import { useState } from 'react'
import { PasswordGenerator } from '@molecule/app-password-generator-react'

function NewLoginForm() {
  const [password, setPassword] = useState('')
  return (
    <>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <PasswordGenerator
        defaultLength={24}
        autoCopy
        onPick={(generated) => setPassword(generated)}
      />
    </>
  )
}
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-password-generator-react @molecule/app-i18n @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
```

## API

### Interfaces

#### `PasswordCharsetOptions`

Character-class options that toggle which alphabets the generator
draws from. At least one of these must be `true` for the generator to
produce a password — when all four are off, the generator falls back
to lowercase + digits to avoid an empty alphabet.

```typescript
interface PasswordCharsetOptions {
  /** Include uppercase letters A-Z. Defaults to `true`. */
  uppercase: boolean
  /** Include lowercase letters a-z. Defaults to `true`. */
  lowercase: boolean
  /** Include digits 0-9. Defaults to `true`. */
  digits: boolean
  /** Include common symbols (`!@#$%^&*()-_=+[]{};:,.<>/?`). Defaults to `true`. */
  symbols: boolean
  /** Skip visually-similar glyphs (`0`, `O`, `o`, `1`, `l`, `I`). Defaults to `false`. */
  noSimilar: boolean
  /** Skip ambiguous specials (space + `'"~\``). Defaults to `false`. */
  noAmbiguous: boolean
}
```

#### `PasswordGeneratorProps`

Props for `<PasswordGenerator>`.

```typescript
interface PasswordGeneratorProps {
  /** Initial password length. Clamped to `[8, 64]`. Defaults to `20`. */
  defaultLength?: number
  /**
   * Optional initial charset overrides. Anything you don't supply
   * inherits the default (`uppercase`, `lowercase`, `digits`, `symbols`
   * all `true`; `noSimilar` and `noAmbiguous` `false`).
   */
  defaultCharset?: Partial<PasswordCharsetOptions>
  /**
   * Called when the user clicks "Use this password". Consumer wires
   * this to whatever form/secret store should receive the password.
   */
  onPick?: (password: string) => void
  /**
   * If `true`, every freshly-generated password is also written to the
   * clipboard automatically. Defaults to `false`.
   */
  autoCopy?: boolean
  /** Optional aria-label override on the read-only password output. */
  ariaLabel?: string
  /** Optional `data-mol-id` attribute on the root element. */
  dataMolId?: string
  /** Extra wrapper classes. */
  className?: string
}
```

### Functions

#### `buildCharset(charset)`

Build the character pool for the supplied charset settings. If every
inclusion toggle is off, falls back to lowercase + digits so the
generator never has an empty alphabet to draw from.

```typescript
function buildCharset(charset: PasswordCharsetOptions): string
```

- `charset` — Charset toggles.

**Returns:** Concatenated allowed-character pool, deduplicated.

#### `clampLength(n)`

Clamp `n` into the `[MIN_LENGTH, MAX_LENGTH]` range.

```typescript
function clampLength(n: number): number
```

#### `generatePassword(length, charset)`

Generate one cryptographically-secure password of the requested
length using the supplied charset.

Uses rejection sampling on each 32-bit integer to avoid modulo bias —
any value above `floor(2^32 / pool) * pool` is discarded and
resampled.

```typescript
function generatePassword(length: number, charset: PasswordCharsetOptions): string
```

- `length` — Password length. Clamped to `[8, 64]`.
- `charset` — Charset toggles.

**Returns:** A freshly-generated password.

#### `PasswordGenerator(props, props, props, props, props, props, props, props)`

Cryptographically-secure password generator UI.

Renders a length slider (`MIN_LENGTH`-`MAX_LENGTH`), six character-class
toggles (uppercase / lowercase / digits / symbols / no-similar /
no-ambiguous), a copyable read-only output, a regenerate button, and
a "Use this password" picker that fires `onPick(password)`.

Randomness is sourced via `crypto.getRandomValues` (see `./generator.ts`).
All styling flows through `getClassMap()` and all user-visible strings
through `t()` — no Tailwind class strings, no hardcoded text.

```typescript
function PasswordGenerator({
  defaultLength = 20,
  defaultCharset,
  onPick,
  autoCopy = false,
  ariaLabel,
  dataMolId,
  className,
}: PasswordGeneratorProps): JSX.Element
```

- `props` — Component props.
- `props` — .defaultLength
- `props` — .defaultCharset
- `props` — .onPick
- `props` — .autoCopy
- `props` — .ariaLabel
- `props` — .dataMolId
- `props` — .className

**Returns:** The rendered password generator.

### Constants

#### `DEFAULT_CHARSET`

Default charset settings.

```typescript
const DEFAULT_CHARSET: PasswordCharsetOptions
```

#### `MAX_LENGTH`

Maximum allowed length for the slider.

```typescript
const MAX_LENGTH: 64
```

#### `MIN_LENGTH`

Minimum / maximum allowed length for the slider.

```typescript
const MIN_LENGTH: 8
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-i18n`
- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Companion locale bond: `@molecule/app-locales-password-generator`.
Copy/autoCopy use the async Clipboard API, which is unavailable on insecure
(non-HTTPS, non-localhost) origins — the write fails silently and no
"Copied!" confirmation appears; the user can still select the read-only
field or click "Use this password". Generation itself needs
`crypto.getRandomValues` (browsers + Node 20; it throws where WebCrypto is
missing, e.g. very old SSR runtimes).

## Translations

Translation strings are provided by `@molecule/app-locales-password-generator`.
