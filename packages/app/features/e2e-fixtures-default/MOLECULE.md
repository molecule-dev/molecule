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
inside the test body BEFORE the error fires. The fixture ignores
substring matches from those annotations.

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
npm install @molecule/app-e2e-fixtures-default
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
