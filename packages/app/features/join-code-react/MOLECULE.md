# @molecule/app-join-code-react

React multi-slot join-code input.

Exports:
- `<JoinCode>` — N-slot single-character input with auto-advance, paste-to-fill,
  alphabet validation, and `onComplete` notification.
- `JoinCodeProps`, `JoinCodeAlphabet` — public types.

Companion locale bond: `@molecule/app-locales-join-code`.

## Type
`feature`

## Installation
```bash
npm install @molecule/app-join-code-react
```

## API

### Interfaces

#### `JoinCodeProps`

Props for the `<JoinCode>` component.

```typescript
interface JoinCodeProps {
  /** Number of slots / characters in the code. Defaults to `6`. */
  length?: number
  /**
   * Controlled value. When provided, the component is controlled and ignores
   * `defaultValue`. The value may be shorter than `length`; missing slots
   * render empty.
   */
  value?: string
  /**
   * Initial value when uncontrolled. Ignored when `value` is provided.
   */
  defaultValue?: string
  /**
   * Called whenever the code changes (typing, paste, backspace).
   * The argument is the *current* code (may be shorter than `length`).
   */
  onChange?: (code: string) => void
  /**
   * Called when the code reaches the configured `length` and every character
   * passes alphabet validation. Fires once per completion (re-fires when the
   * code is cleared and re-completed).
   */
  onComplete?: (code: string) => void
  /**
   * Whether to fire `onComplete` automatically when `length` is reached.
   * Defaults to `true`.
   */
  autoSubmit?: boolean
  /** Allowed character set. Defaults to `'alphanumeric'`. */
  alphabet?: JoinCodeAlphabet
  /** Whether the input is disabled. */
  disabled?: boolean
  /** Optional className applied to the outer wrapper. */
  className?: string
}
```

### Types

#### `JoinCodeAlphabet`

Alphabet a join code may use.

- `'numeric'` — `0-9` only.
- `'letters'` — `A-Z` only (case-insensitive on input, normalised to upper-case).
- `'alphanumeric'` — `A-Z` + `0-9` (case-insensitive, normalised to upper-case).

```typescript
type JoinCodeAlphabet = 'numeric' | 'letters' | 'alphanumeric'
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-i18n` ^1.0.0
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
