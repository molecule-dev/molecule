# @molecule/app-e2e-fixtures-default

Shared Playwright `test` + `expect` with auto-attached browser
console-error / pageerror guard.

Every fleet app's e2e specs import `test` and `expect` from this
module (re-exported through their per-app `_helpers.ts`) instead of
`@playwright/test` directly. The custom `test` includes a
`consoleGuard` fixture with `{ auto: true }`, so every test
automatically subscribes to the browser's `pageerror` event and
`console.error` messages, then asserts the buffer is empty at test
teardown.

This catches the failure mode where React (or any other client-side
module) throws on mount but the spec only asserts against
`page.request.get/post`, leaving the test green while the rendered
page is blank. A single quill-delta ESM/CJS interop error sat for
four days like this before we noticed — the replay videos were
17 KB of nothing and the JSON reported PASS.

To intentionally let a known error through (rare — almost always a
smell that should be fixed in the app), use
`test.info().annotations.push({ type: 'allow-console-error', description: 'why' })`
inside the test body BEFORE the error fires. The `description` is
matched against the error text as a regular expression; if it is not
a valid regex it is matched as a plain substring instead (so literal
error text with `[`/`(` can be pasted verbatim). An annotation with
no description allows every error — always provide one.

A small, fixed set of browser-noise patterns are ALWAYS ignored regardless
of `allow-console-error` (Vite HMR reconnect chatter, service-worker 404s
in headless Chrome, and a real Chrome DevTools "failed to load SourceMap"
message for any `https://`-hosted bundle — e.g. Stripe/Google Maps CDN
scripts shipped without source maps). That last pattern is verified
against the actual Chrome message text and constrained to `https://` so it
can never silence a genuinely broken source map in the app's OWN bundle
(served over plain `http://localhost` in dev/preview).

## Quick Start

```ts
// In fleet apps, the per-app `./_helpers.ts` re-exports these:
import { test, expect } from '@molecule/app-e2e-fixtures-default'

test('login lands on dashboard', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill('user@example.com')
  // ...
})
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-e2e-fixtures-default @playwright/test
```

## API

### Interfaces

#### `ConsoleErrorEntry`

```typescript
interface ConsoleErrorEntry {
  type: 'pageerror' | 'console.error'
  text: string
  location?: string
}
```

### Constants

#### `expect`

```typescript
const expect: Expect<{}>
```

#### `test`

Custom Playwright `test` with an auto-attached browser console-error
guard. Drop-in replacement for `import { test } from '@playwright/test'`.

```typescript
const test: TestType<PlaywrightTestArgs & PlaywrightTestOptions & { consoleGuard: void; }, PlaywrightWorkerArgs & PlaywrightWorkerOptions>
```

## Injection Notes

### Requirements

Peer dependencies:
- `@playwright/test` ^1.50.0

### Runtime Dependencies

- `@playwright/test`
