# @molecule/api-pdf-pdfkit

PDFKit programmatic PDF generation provider for molecule.dev.

Uses PDFKit for creating PDFs from HTML or templates, and pdf-lib for
manipulating existing PDFs (merge, watermark, page count, metadata).
Best suited for programmatic PDF generation. For high-fidelity HTML-to-PDF
rendering, use `@molecule/api-pdf-puppeteer` instead.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-pdf-pdfkit
```

## Usage

```typescript
import { setProvider } from '@molecule/api-pdf'
import { provider } from '@molecule/api-pdf-pdfkit'

setProvider(provider)

// Or create with custom config:
import { createProvider } from '@molecule/api-pdf-pdfkit'
const customProvider = createProvider({ defaultFont: 'Helvetica', defaultFontSize: 14 })
setProvider(customProvider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-pdf` ^1.0.0
