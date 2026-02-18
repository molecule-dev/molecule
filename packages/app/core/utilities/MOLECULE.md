# @molecule/app-utilities

Common utilities for molecule.dev frontend applications.

Provides helper functions for string manipulation, validation,
formatting, and other common operations.

## Type
`core`

## Installation
```bash
npm install @molecule/app-utilities
```

## API

### Interfaces

#### `AlphanumericOptions`

Alphanumeric validation options.

```typescript
interface AlphanumericOptions {
  /**
   * Allow spaces.
   */
  allowSpaces?: boolean

  /**
   * Allow dashes.
   */
  allowDashes?: boolean

  /**
   * Allow underscores.
   */
  allowUnderscores?: boolean

  /**
   * Minimum length.
   */
  minLength?: number

  /**
   * Maximum length.
   */
  maxLength?: number
}
```

#### `PromiseState`

State of an async operation.

```typescript
interface PromiseState<T> {
  /**
   * Current status.
   */
  status: PromiseStatus

  /**
   * Resolved value.
   */
  value: T | null

  /**
   * Rejection error.
   */
  error: Error | null
}
```

### Types

#### `PromiseStatus`

Status of an async operation.

```typescript
type PromiseStatus = 'idle' | 'pending' | 'resolved' | 'rejected'
```

### Functions

#### `alphanumeric(value, options)`

Strips non-alphanumeric characters from a string, keeping only
letters and digits (plus optionally spaces, dashes, or underscores).

```typescript
function alphanumeric(value: string, options?: AlphanumericOptions): string
```

- `value` — The string to clean.
- `options` — Optional flags to preserve spaces, dashes, or underscores.

**Returns:** The cleaned string with disallowed characters removed.

#### `copyToClipboard(text)`

Copies text to the system clipboard. Uses the Clipboard API when
available, with a `document.execCommand('copy')` fallback for
older browsers.

```typescript
function copyToClipboard(text: string): Promise<boolean>
```

- `text` — The text to copy to the clipboard.

**Returns:** `true` if the copy succeeded, `false` on failure.

#### `debounce(fn, delay)`

Wraps a function so that it is only invoked after it stops being called
for the specified delay. Useful for search inputs and resize handlers.

```typescript
function debounce(fn: T, delay: number): (...args: Parameters<T>) => void
```

- `fn` — The function to debounce.
- `delay` — The quiet period in milliseconds before the function fires.

**Returns:** A debounced version of `fn` that resets its timer on each call.

#### `formatCurrency(value, currency, locale)`

Formats a number as a currency string using `Intl.NumberFormat`.

```typescript
function formatCurrency(value: number, currency?: string, locale?: string): string
```

- `value` — The monetary amount.
- `currency` — The ISO 4217 currency code (default: `'USD'`).
- `locale` — The BCP 47 locale string (default: `'en-US'`).

**Returns:** The formatted currency string (e.g. `"$1,234.56"`).

#### `formatNumber(value, locale)`

Formats a number with locale-appropriate thousand separators
using `Intl.NumberFormat`.

```typescript
function formatNumber(value: number, locale?: string): string
```

- `value` — The number to format.
- `locale` — The BCP 47 locale string (default: `'en-US'`).

**Returns:** The formatted number string (e.g. `"1,234,567"`).

#### `formatPercent(value, decimals, locale)`

Formats a number as a percentage string using `Intl.NumberFormat`.
The input value should be a decimal (e.g. `0.75` for 75%).

```typescript
function formatPercent(value: number, decimals?: number, locale?: string): string
```

- `value` — The decimal value to format as a percentage.
- `decimals` — The number of decimal places (default: 0).
- `locale` — The BCP 47 locale string (default: `'en-US'`).

**Returns:** The formatted percentage string (e.g. `"75%"`).

#### `getErrorMessage(error, customMessages, t)`

Extracts a user-friendly error message from an unknown error value.
Handles strings, `Error` instances, and objects with `code`/`message`/`error`
properties. Recognizes `TypeError` (fetch failures) as network errors
and `AbortError` as timeouts.

When a translation function `t` is provided, error messages are
passed through it for i18n support.

```typescript
function getErrorMessage(error: unknown, customMessages?: Record<string, string>, t?: TranslateFn): string
```

- `error` — The error value (string, Error, or object with code/message).
- `customMessages` — Optional map of error codes to custom message strings that override defaults.
- `t` — Optional i18n translation function for localizing error messages.

**Returns:** A user-friendly error message string.

#### `getHumanFileSize(bytes, decimals)`

Formats a byte count as a human-readable file size string
(e.g. `"1.5 MB"`, `"0 B"`, `"-3.2 GB"`).

```typescript
function getHumanFileSize(bytes: number, decimals?: number): string
```

- `bytes` — The number of bytes to format (supports negative values).
- `decimals` — The number of decimal places (default: 2).

**Returns:** A formatted file size string with the appropriate unit.

#### `handleAnchorClick(event, navigate)`

Intercepts an anchor element click for SPA client-side navigation.
Skips interception when modifier keys are held, when `target="_blank"`,
or when the link points to an external URL.

```typescript
function handleAnchorClick(event: MouseEvent, navigate: (url: string) => void): boolean
```

- `event` — The mouse click event from a click listener.
- `navigate` — The SPA router's navigation function to call with the href.

**Returns:** `true` if the click was intercepted and handled, `false` if it should proceed normally.

#### `isAlphanumeric(value, options)`

Tests whether a string contains only alphanumeric characters
(and optionally spaces, dashes, or underscores). Supports
length constraints via `minLength` and `maxLength` options.

```typescript
function isAlphanumeric(value: string, options?: AlphanumericOptions): boolean
```

- `value` — The string to test.
- `options` — Optional flags to allow spaces, dashes, underscores, and length constraints.

**Returns:** `true` if the string matches the alphanumeric pattern.

#### `isEmail(value)`

Validates an email address against a simplified RFC 5322 pattern.

```typescript
function isEmail(value: string): boolean
```

- `value` — The string to validate as an email address.

**Returns:** `true` if the string matches the email pattern.

#### `isInternalUrl(url)`

Checks whether a URL points to the same origin as the current page.
Relative URLs (not starting with `http://` or `https://`) are considered internal.

```typescript
function isInternalUrl(url: string): boolean
```

- `url` — The URL to check (absolute or relative).

**Returns:** `true` if the URL is same-origin or relative.

#### `isUrl(value)`

Validates whether a string is a well-formed URL using the `URL` constructor.

```typescript
function isUrl(value: string): boolean
```

- `value` — The string to validate as a URL.

**Returns:** `true` if the string can be parsed as a valid URL.

#### `openUrl(url, options, options, options)`

Opens a URL by navigating in the current tab or opening a new
window/tab with `noopener,noreferrer` for security.

```typescript
function openUrl(url: string, options?: { newWindow?: boolean; target?: string; }): void
```

- `url` — The URL to open.
- `options` — Navigation options.
- `options` — .newWindow - When `true`, opens in a new window/tab instead of navigating.
- `options` — .target - The window target name (default: `'_blank'` when `newWindow` is true).

#### `parseQueryString(queryString)`

Parses a URL query string into a key-value object. Keys that appear
multiple times are returned as arrays.

```typescript
function parseQueryString(queryString: string): Record<string, string | string[]>
```

- `queryString` — The query string to parse (with or without leading `?`).

**Returns:** An object where each key maps to a single string or an array of strings.

#### `randomString(length, charset)`

Generates a random string by picking characters from the given charset.
Uses `Math.random()` — not suitable for cryptographic purposes.

```typescript
function randomString(length?: number, charset?: string): string
```

- `length` — The desired string length (default: 16).
- `charset` — The character set to sample from (default: alphanumeric A-Z, a-z, 0-9).

**Returns:** A random string of the specified length.

#### `readFromClipboard()`

Reads text from the system clipboard using the Clipboard API.

```typescript
function readFromClipboard(): Promise<string | null>
```

**Returns:** The clipboard text content, or `null` if reading is not supported or fails.

#### `retry(fn, options, options, options, options, options)`

Retries an async function with exponential backoff. Each failed attempt
waits `initialDelay * backoffFactor^(attempt-1)` ms, capped at `maxDelay`.

```typescript
function retry(fn: () => Promise<T>, options?: { maxAttempts?: number; initialDelay?: number; maxDelay?: number; backoffFactor?: number; }): Promise<T>
```

- `fn` — The async function to retry.
- `options` — Retry configuration.
- `options` — .maxAttempts - Maximum number of attempts (default: 3).
- `options` — .initialDelay - Delay in ms before the first retry (default: 1000).
- `options` — .maxDelay - Maximum delay cap in ms (default: 30000).
- `options` — .backoffFactor - Multiplier applied to the delay after each attempt (default: 2).

**Returns:** The resolved value from the first successful attempt.

#### `sleep(ms)`

Returns a promise that resolves after the specified number of milliseconds.

```typescript
function sleep(ms: number): Promise<void>
```

- `ms` — The delay duration in milliseconds.

**Returns:** A promise that resolves after the delay.

#### `throttle(fn, limit)`

Wraps a function so that it fires at most once per `limit` milliseconds.
Unlike debounce, the first call executes immediately.

```typescript
function throttle(fn: T, limit: number): (...args: Parameters<T>) => void
```

- `fn` — The function to throttle.
- `limit` — The minimum interval in milliseconds between invocations.

**Returns:** A throttled version of `fn` that drops calls within the limit window.

#### `timeAgo(time, abbreviate)`

Formats the elapsed time since a given timestamp as a human-readable
relative string (e.g. `"3 hours ago"` or `"3h ago"` when abbreviated).

```typescript
function timeAgo(time: string | number | Date, abbreviate?: boolean): string
```

- `time` — The timestamp as a Unix ms number, ISO date string, or `Date` object.
- `abbreviate` — When `true`, uses short suffixes (`m`, `h`, `d`, `w`, `y`) instead of full words.

**Returns:** A relative time string like `"just now"`, `"5 minutes ago"`, or `"2d ago"`.

#### `toCamelCase(value)`

Converts a kebab-case, snake_case, or space-separated string
to camelCase (e.g. `"my-variable"` becomes `"myVariable"`).

```typescript
function toCamelCase(value: string): string
```

- `value` — The string to convert.

**Returns:** The camelCased string, or an empty string if the input is falsy.

#### `toKebabCase(value)`

Converts a camelCase, PascalCase, snake_case, or space-separated string
to kebab-case (e.g. `"myVariable"` becomes `"my-variable"`).

```typescript
function toKebabCase(value: string): string
```

- `value` — The string to convert.

**Returns:** The kebab-cased string, or an empty string if the input is falsy.

#### `toQueryString(params)`

Converts a key-value object into a URL query string. Array values
are appended as multiple entries for the same key. `null` and
`undefined` values are skipped.

```typescript
function toQueryString(params: Record<string, unknown>): string
```

- `params` — The key-value pairs to serialize.

**Returns:** The query string including the leading `?`, or an empty string if no params.

#### `toTitleCase(value)`

Converts a string to Title Case (capitalizes the first letter of each word).

```typescript
function toTitleCase(value: string): string
```

- `value` — The string to convert.

**Returns:** The title-cased string, or an empty string if the input is falsy.

#### `truncate(value, maxLength, suffix)`

Truncates a string to a maximum length, appending a suffix
(default `"..."`) when the string exceeds the limit.

```typescript
function truncate(value: string, maxLength: number, suffix?: string): string
```

- `value` — The string to truncate.
- `maxLength` — The maximum total length including the suffix.
- `suffix` — The truncation indicator appended when the string is shortened (default: `"..."`).

**Returns:** The original string if within limits, or the truncated string with suffix.

#### `uint8ArrayToUrlBase64(array)`

Converts a `Uint8Array` to a URL-safe base64 string.
The inverse of `urlBase64ToUint8Array`.

```typescript
function uint8ArrayToUrlBase64(array: Uint8Array<ArrayBufferLike>): string
```

- `array` — The byte array to encode.

**Returns:** The URL-safe base64-encoded string (trailing `=` padding removed).

#### `urlBase64ToUint8Array(base64String)`

Converts a URL-safe base64 string to a `Uint8Array`.
Commonly used for decoding VAPID public keys for push notification subscriptions.

```typescript
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBufferLike>
```

- `base64String` — The URL-safe base64-encoded string (uses `-` and `_` instead of `+` and `/`).

**Returns:** The decoded byte array.

#### `uuid()`

Generates a UUID v4 string. Uses `crypto.randomUUID()` when available,
with a `Math.random()` fallback for environments that lack it.

```typescript
function uuid(): string
```

**Returns:** A UUID v4 string (e.g. `"550e8400-e29b-41d4-a716-446655440000"`).

### Constants

#### `defaultErrorMessages`

Default English error messages for each error code, used as fallbacks
when no translation function is provided.

```typescript
const defaultErrorMessages: Record<string, string>
```

## Translations

Translation strings are provided by `@molecule/app-locales-utilities`.
