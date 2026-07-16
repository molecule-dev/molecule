# @molecule/api-breach-check

Have-I-Been-Pwned (HIBP) k-anonymity password breach check for molecule.dev.

Computes a SHA-1 hash of a plaintext password locally, transmits only the
first 5 hex characters of the hash to the HIBP password range API, and
scans the response locally for a match. The full hash is never sent.

## Quick Start

```ts
import { checkPassword } from '@molecule/api-breach-check'

const result = await checkPassword('hunter2')
if (result.pwned) {
  throw new Error(`password seen in ${result.count} breaches`)
}
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-breach-check
```

## API

### Interfaces

#### `BreachCheckCache`

Minimal cache contract — compatible with `@molecule/api-cache` providers.
Only `get`/`set` of string keys to string values is required.

```typescript
interface BreachCheckCache {
  /**
   * Get a previously cached value, or `undefined` if not present.
   */
  get(key: string): Promise<string | undefined> | string | undefined

  /**
   * Set a value with an optional TTL in milliseconds.
   */
  set(key: string, value: string, ttlMs?: number): Promise<void> | void
}
```

#### `BreachCheckResult`

Result of a password breach check via the HIBP k-anonymity API.

```typescript
interface BreachCheckResult {
  /**
   * Whether the password has appeared in any known breach corpus.
   */
  pwned: boolean

  /**
   * Number of times the password's SHA-1 hash has been observed in breaches.
   * Zero when the hash was not present in the API response.
   */
  count: number
}
```

#### `CheckPasswordOptions`

Options for {@link checkPassword}.

```typescript
interface CheckPasswordOptions {
  /**
   * Custom `fetch` implementation. Defaults to the global `fetch`. Useful for
   * tests, custom retry/timeout logic, or running behind an HTTP proxy.
   */
  fetch?: typeof globalThis.fetch

  /**
   * Override the HIBP password range API endpoint. Defaults to
   * `https://api.pwnedpasswords.com/range`. Trailing slash optional.
   */
  apiUrl?: string

  /**
   * `User-Agent` header sent with the request. HIBP requires a descriptive
   * UA per their documentation. Defaults to `molecule-api-breach-check`.
   */
  userAgent?: string

  /**
   * When `true`, sends `Add-Padding: true` so the API returns padded results
   * to thwart traffic-analysis attacks. Defaults to `true` (privacy-safe).
   */
  padding?: boolean

  /**
   * Optional cache adapter. When provided, results for a given hash prefix
   * are cached and re-used on subsequent calls. Compatible with
   * `@molecule/api-cache` providers (any object with `get`/`set` returning
   * the prefix response body).
   */
  cache?: BreachCheckCache

  /**
   * TTL in milliseconds for cached entries. Defaults to 60_000 (1 minute).
   * Only applied when {@link CheckPasswordOptions.cache} is set.
   */
  cacheTtlMs?: number

  /**
   * Request timeout in milliseconds. Defaults to 5_000 (5 seconds).
   * Implemented via `AbortController`.
   */
  timeoutMs?: number
}
```

#### `Sha1Split`

Result of {@link sha1Split}.

```typescript
interface Sha1Split {
  /**
   * The first 5 hex characters of the SHA-1 digest (uppercase). This is
   * what gets transmitted to HIBP — never the full hash.
   */
  prefix: string

  /**
   * The remaining 35 hex characters of the SHA-1 digest (uppercase). Used
   * locally to scan the response for a match.
   */
  suffix: string
}
```

### Functions

#### `checkPassword(plaintext, options)`

Check whether a plaintext password has appeared in known breach corpora
via the Have-I-Been-Pwned (HIBP) password range API, using k-anonymity
so the full password hash is never transmitted.

The function computes a SHA-1 hash of the password locally, sends only
the first 5 hex characters of the hash to HIBP, then scans the response
locally for a match of the remaining 35 hex characters. Optionally
enables `Add-Padding` to thwart traffic-analysis attacks and supports
pluggable caching via the {@link CheckPasswordOptions.cache} option.

```typescript
function checkPassword(plaintext: string, options?: CheckPasswordOptions): Promise<BreachCheckResult>
```

- `plaintext` — The plaintext password to check.
- `options` — Optional behavior overrides — see {@link CheckPasswordOptions}.

**Returns:** Promise resolving to a {@link BreachCheckResult} with `pwned`
 *   (true when count > 0) and `count` (number of breach occurrences).

#### `findCountForSuffix(body, suffix)`

Parse the body of a HIBP password range response and return the count
associated with `suffix`, or `0` if the suffix is not listed.

The body is a CRLF-separated list of `SUFFIX:COUNT` pairs, where `SUFFIX`
is the remaining 35 hex chars (uppercase) and `COUNT` is the number of
times that hash has appeared in known breaches. With `padding` enabled,
the response also contains synthetic entries with `COUNT=0` — those are
treated as "not found".

```typescript
function findCountForSuffix(body: string, suffix: string): number
```

- `body` — Raw response text from the HIBP API.
- `suffix` — The uppercase 35-char suffix to look up.

**Returns:** Breach count, or `0` if the suffix is not present (or padded).

#### `sha1Split(plaintext)`

Compute the uppercase SHA-1 hex digest of a plaintext string and split it
into the 5-character k-anonymity prefix and the 35-character suffix.

Privacy contract: only the {@link Sha1Split.prefix} is ever transmitted to
the HIBP password range API. The {@link Sha1Split.suffix} is compared
client-side against the lines in the response body.

```typescript
function sha1Split(plaintext: string): Sha1Split
```

- `plaintext` — The password (or any string) to hash.

**Returns:** Object containing the uppercase SHA-1 `prefix` (length 5) and
 *   `suffix` (length 35).

## Injection Notes

Privacy contract: the plaintext password and its full SHA-1 hash never
leave the calling process. Only the 5-character k-anonymity prefix is
transmitted. The optional `padding` flag (default `true`) instructs HIBP
to pad responses to thwart traffic analysis. An optional cache adapter
(compatible with `@molecule/api-cache`) can be supplied to coalesce
repeated lookups for the same prefix.

Network + failure mode: each uncached call makes one outbound HTTPS GET to
`https://api.pwnedpasswords.com/range/{prefix}` (override host via
`options.apiUrl`; 5 s default timeout). The check FAILS CLOSED — on any
non-2xx, timeout, or network failure `checkPassword` THROWS instead of
returning "not breached". Callers must choose a policy: wrap in try/catch
and either block the flow or allow-with-logging while HIBP is unreachable —
never let the raw error take signup down, and never swallow it into an
implicit "safe". In environments that force egress through an HTTP proxy
(e.g. molecule.dev sandboxes), Node's built-in fetch ignores
HTTP_PROXY/HTTPS_PROXY — pass a proxy-aware implementation via
`options.fetch`, and ensure the HIBP host is on the egress allowlist.
