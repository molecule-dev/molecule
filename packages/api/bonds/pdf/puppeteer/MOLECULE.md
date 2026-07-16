# @molecule/api-pdf-puppeteer

Puppeteer PDF provider for molecule.dev.

High-fidelity HTML-to-PDF rendering powered by headless Chrome via Puppeteer,
with PDF manipulation (merge, watermark, metadata) via pdf-lib.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-pdf'
import { provider } from '@molecule/api-pdf-puppeteer'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-pdf-puppeteer @molecule/api-pdf pdf-lib puppeteer
```

## API

### Interfaces

#### `PuppeteerPDFConfig`

Configuration options for the Puppeteer PDF provider.

```typescript
interface PuppeteerPDFConfig {
  /**
   * Custom Puppeteer launch arguments passed to `puppeteer.launch()`.
   * Useful for running in Docker or CI environments.
   *
   * @example `['--no-sandbox', '--disable-setuid-sandbox']`
   */
  launchArgs?: string[]

  /**
   * Path to a custom Chromium/Chrome executable.
   * If omitted, Puppeteer uses its bundled browser.
   */
  executablePath?: string

  /**
   * Whether to run in headless mode. Defaults to `true`.
   */
  headless?: boolean

  /**
   * Timeout in milliseconds for page navigation and PDF generation.
   * Defaults to `30000` (30 seconds).
   */
  timeout?: number

  /**
   * Whether to reuse a single browser instance across calls.
   * Improves performance for batch operations. Defaults to `true`.
   */
  reuseBrowser?: boolean

  /**
   * Opening delimiter for simple template interpolation in `fromTemplate`.
   * Defaults to `'{{'`.
   */
  templateOpenDelimiter?: string

  /**
   * Closing delimiter for simple template interpolation in `fromTemplate`.
   * Defaults to `'}}'`.
   */
  templateCloseDelimiter?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Puppeteer-backed PDF provider.

```typescript
function createProvider(config?: PuppeteerPDFConfig): PDFProvider
```

- `config` — Optional provider configuration (launch args, executable path, etc.).

**Returns:** A `PDFProvider` backed by Puppeteer and pdf-lib.

### Constants

#### `provider`

The provider implementation, lazily initialized with default config.

```typescript
const provider: PDFProvider
```

## Core Interface
Implements `@molecule/api-pdf` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-pdf'
import { provider } from '@molecule/api-pdf-puppeteer'

export function setupPdfPuppeteer(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-pdf` ^1.0.0

### Runtime Dependencies

- `@molecule/api-pdf`
- `pdf-lib`
- `puppeteer`

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual documents (invoice, report, receipt,
contract) and check every box off one by one. A box you can't check is an
integration bug to fix — not a skip:
- [ ] Every document the app generates has a working Download/Export control
  that returns a REAL PDF — not an HTML error page or a JSON-stringified
  Buffer. Inspect the actual response: `Content-Type` is `application/pdf`
  and the body's first bytes are the `%PDF` magic (hex `25 50 44 46`). Fetch
  the endpoint and check both — a body that starts with `<` or `{` is a
  failure dressed up as a download.
- [ ] Opening the downloaded PDF shows the record's real values (names, line
  items, dates, totals) — not placeholder/template text or a blank page.
- [ ] Edit a record and re-export: the new PDF reflects the changed values,
  and two different records produce two visibly different PDFs (not the same
  cached bytes for every id).
- [ ] If the app shows page previews or reads document info, it feature-detects
  (`getProvider().toImages` / `.getMetadata`) or bonds a provider that supports
  them — both are OPTIONAL and THROW on bonds that lack them (e.g. PDFKit), so a
  preview built on an unsupporting bond errors at runtime, not compile time.
- [ ] Styled output (CSS layout, backgrounds, web fonts) actually renders —
  which requires a browser-engine bond (Puppeteer). On PDFKit the same HTML
  collapses to a plain-text approximation; if the design matters, that's the wrong bond.
- [ ] Export is authorized: a signed-in user cannot fetch another user's
  document by guessing or incrementing an id — the endpoint scopes every PDF to
  its owner (a guessed id returns 403/404, never someone else's invoice).
