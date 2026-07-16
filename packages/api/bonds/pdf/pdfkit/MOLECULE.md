# @molecule/api-pdf-pdfkit

PDFKit programmatic PDF generation provider for molecule.dev.

Uses PDFKit for creating PDFs from HTML or templates, and pdf-lib for
manipulating existing PDFs (merge, watermark, page count, metadata).
Best suited for programmatic PDF generation. For high-fidelity HTML-to-PDF
rendering, use `@molecule/api-pdf-puppeteer` instead.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-pdf'
import { provider } from '@molecule/api-pdf-pdfkit'

setProvider(provider)

// Or create with custom config:
import { createProvider } from '@molecule/api-pdf-pdfkit'
const customProvider = createProvider({ defaultFont: 'Helvetica', defaultFontSize: 14 })
setProvider(customProvider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-pdf-pdfkit @molecule/api-pdf pdf-lib pdfkit
npm install -D @types/pdfkit
```

## API

### Interfaces

#### `PDFKitConfig`

Configuration options for the PDFKit PDF provider.

```typescript
interface PDFKitConfig {
  /**
   * Default font to use for text rendering.
   * Must be a standard PDF font or a path to a font file.
   * Defaults to `'Helvetica'`.
   */
  defaultFont?: string

  /**
   * Default font size in points.
   * Defaults to `12`.
   */
  defaultFontSize?: number

  /**
   * Default line height multiplier.
   * Defaults to `1.2`.
   */
  lineHeight?: number

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

Creates a PDFKit-backed PDF provider.

```typescript
function createProvider(config?: PDFKitConfig): PDFProvider
```

- `config` — Optional provider configuration.

**Returns:** A `PDFProvider` backed by PDFKit and pdf-lib.

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
import { provider } from '@molecule/api-pdf-pdfkit'

export function setupPdfPdfkit(): void {
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
- `pdfkit`

`fromHTML` is a rudimentary HTML renderer, not a browser. It understands ONLY
`h1`–`h6`, `p`, `br`, `hr`, `b`/`strong`, `i`/`em`, and `ul`/`ol`/`li`; any other
tag renders as its plain text content, and CSS, tables, images, links, and
attributes are ignored entirely. Feed it simple semantic markup (or use
`fromTemplate` with `{{key}}` interpolation); switch to
`@molecule/api-pdf-puppeteer` when the PDF must look like the HTML.

This bond does NOT implement the core contract's optional `toImages()` —
calling it is a runtime "not a function" error. The puppeteer bond implements
it; swap bonds if you need page-to-image rendering.

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
