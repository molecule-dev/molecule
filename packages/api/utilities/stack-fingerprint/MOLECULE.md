# @molecule/api-stack-fingerprint

Error stack-trace fingerprinting for `@molecule/api-stack-fingerprint`.

Pure functions. Input: an error's `message`, `stack`, and optional
class `type`. Output: a stable SHA-1 fingerprint hash plus a
grouping key. Use it to dedupe noisy production errors, build
issue-tracker UIs (e.g. the `error-tracker` flagship), or implement
a Sentry-style "group by stack-trace shape" pipeline.

## Quick Start

```ts
import { fingerprintError, groupErrors } from '@molecule/api-stack-fingerprint'

try {
  risky()
} catch (err) {
  const e = err as Error
  const id = fingerprintError({
    type: e.name,
    message: e.message,
    stack: e.stack,
  })
  // -> '8b3a...': stable across runs / machines / Node versions
}
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-stack-fingerprint
```

## API

### Interfaces

#### `ErrorGroup`

Result of {@link groupErrors} — one entry per fingerprint, with the
count and a representative sample preserved.

```typescript
interface ErrorGroup<T extends FingerprintInput = FingerprintInput> {
  /**
   * SHA-1 hex fingerprint shared by every error in this group.
   */
  fingerprint: string

  /**
   * Number of errors in the group.
   */
  count: number

  /**
   * The first error encountered for this fingerprint — useful as a
   * UI-facing exemplar.
   */
  sampleError: T
}
```

#### `FingerprintInput`

Input to {@link fingerprintError}. Mirrors the surface of a thrown
`Error` but allows passing the bits manually (e.g. when the error
arrived via JSON over the wire).

```typescript
interface FingerprintInput {
  /**
   * Error message. Not included in the fingerprint by default — two
   * errors at the same call-site often differ only in interpolated
   * values (`User 17 not found` vs `User 42 not found`) and we want
   * those to group together.
   */
  message?: string

  /**
   * Multi-line stack trace as produced by `Error#stack`. The first
   * line (the message) is tolerated and stripped.
   */
  stack?: string

  /**
   * Error class name (e.g. `TypeError`, `RangeError`). Included in the
   * fingerprint by default so `TypeError` and `RangeError` at the same
   * call-site produce different groups.
   */
  type?: string
}
```

#### `FingerprintOptions`

Options controlling stack-frame normalization and fingerprinting.

```typescript
interface FingerprintOptions {
  /**
   * Number of top frames to include in the fingerprint. Defaults to
   * `5`. Frames below this depth are ignored; this is what makes the
   * fingerprint stable across unrelated bottom-of-stack noise (e.g.
   * test runners, Node internals).
   */
  topFrames?: number

  /**
   * Custom path normalizers, applied in order after the built-ins.
   * Use these to strip project-specific noise (e.g. monorepo absolute
   * paths, content-hashed bundles) from frame `file` strings.
   *
   * Each function receives the partially-normalized path and returns
   * a further-normalized one. Returning the same string is fine.
   */
  pathNormalizers?: ((path: string) => string)[]

  /**
   * When `true` (the default), the error `type` (e.g. `TypeError`) is
   * mixed into the fingerprint. Set to `false` to group purely by stack
   * shape regardless of class.
   */
  includeType?: boolean

  /**
   * When `true`, the error `message` is mixed into the fingerprint.
   * Defaults to `false` so dynamic messages don't fragment groups.
   */
  includeMessage?: boolean
}
```

#### `NormalizedFrame`

A frame that has been normalized for fingerprinting. Line / column
numbers and version-specific path noise have been stripped.

```typescript
interface NormalizedFrame {
  /**
   * Normalized function name. `<anonymous>` for nameless frames; eval
   * frames are flattened to `<eval>`.
   */
  function: string

  /**
   * Normalized file. Tmp dirs, absolute build paths, hash suffixes and
   * version segments have been stripped. Empty string when the original
   * frame had no file.
   */
  file: string
}
```

#### `StackFrame`

One parsed frame from a stack trace. Whatever the source format
(V8 or SpiderMonkey), parsing produces this shape.

```typescript
interface StackFrame {
  /**
   * Function name (or `<anonymous>` if the frame has no name —
   * e.g. arrow callbacks at top level).
   */
  function: string

  /**
   * The script / module path. May be `file://`, `node:`, a bare module
   * specifier, an HTTP(S) URL, or `<eval>` / `<anonymous>` for synthetic
   * frames. Empty string when the source format omits a file.
   */
  file: string

  /**
   * 1-based line number, or `undefined` if not present in the source.
   */
  line?: number

  /**
   * 1-based column number, or `undefined` if not present in the source.
   */
  column?: number

  /**
   * Whether the frame originated inside an `eval(...)` call. V8 marks
   * these with `at eval (eval at ...)` and SpiderMonkey with `> eval` /
   * `> Function`. Eval frames are collapsed to a single canonical token
   * during normalization so that two evals at different call sites still
   * group together.
   */
  isEval: boolean

  /**
   * Whether the frame represents a Node native / `node:` builtin module.
   */
  isNative: boolean

  /**
   * The original raw line from the stack string (whitespace-trimmed).
   * Preserved so callers can show un-normalized output to humans.
   */
  raw: string
}
```

### Functions

#### `fingerprintError(input, options)`

Compute a deterministic SHA-1 fingerprint for an error.

The fingerprint is a hex SHA-1 of:
  1. The error `type` (e.g. `TypeError`), if `includeType` (default).
  2. The error `message`, if `includeMessage` (default `false`).
  3. The top N normalized frames as `function|file` lines.

Two errors thrown from the same call-site will produce the same
fingerprint across runs, machines, Node versions, and tmp dirs —
use this as the grouping key in an issue tracker.

If `stack` is missing or unparseable, the fingerprint falls back to
a hash of `(type ?? '') + '\n' + (message ?? '')` so identical "bare"
errors still group together. A wholly empty input hashes the empty
string — callers should treat that as the "no fingerprint" sentinel.

```typescript
function fingerprintError(input: FingerprintInput, options?: FingerprintOptions): string
```

- `input` — Error fields. Pass a thrown `Error` after copying its
- `options` — Override frame count / path normalizers / what

**Returns:** Lowercase 40-char SHA-1 hex string.

#### `groupErrors(errors, options)`

Group a batch of errors by fingerprint. Returns one entry per
fingerprint, ordered by descending `count` (so the noisiest errors
surface first), with a sample of the first error encountered.

```typescript
function groupErrors(errors: Iterable<T>, options?: FingerprintOptions): ErrorGroup<T>[]
```

- `errors` — Iterable of error inputs. Order is preserved when
- `options` — Forwarded to {@link fingerprintError}.

**Returns:** One {@link ErrorGroup} per distinct fingerprint, sorted by
 *   `count` (descending). Ties are broken by first-seen order.

#### `normalizeFrame(frame, options)`

Normalize a single parsed frame for fingerprinting. Strips line and
column numbers, applies built-in path normalizers, then any custom
normalizers from {@link FingerprintOptions.pathNormalizers}.

Eval frames collapse to `function='<eval>'`, `file='<eval>'` so two
evals at different positions still group together. Unknown frames
(parser fall-through) keep their raw text so they still contribute
deterministically.

```typescript
function normalizeFrame(frame: StackFrame, options?: FingerprintOptions): NormalizedFrame
```

- `frame` — Parsed frame from {@link parseStackFrames}.
- `options` — Fingerprint options. Only

**Returns:** Frame with `function` + normalized `file` only — line and
 *   column are intentionally omitted.

#### `parseStackFrames(stack)`

Parse a multi-line stack-trace string into structured frames.

Handles V8 (Node, Chromium, Edge) and SpiderMonkey (Firefox) frame
formats. Lines that don't match either format are still emitted as
`StackFrame`s with `function = '<unknown>'`, `file = ''`, and the
original line preserved in `raw` — fingerprinting still works on
them, it just loses structure.

The first line of `stack` is tolerated and skipped if it looks like
an error header (`SomeError: message`) — V8's stack format includes
the error message at the top, while SpiderMonkey's does not.

```typescript
function parseStackFrames(stack: string | null | undefined): StackFrame[]
```

- `stack` — Multi-line stack-trace text. Returns `[]` for empty

**Returns:** Parsed frames in original (top-to-bottom) order.
