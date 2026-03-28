# @molecule/api-pdf-puppeteer

Puppeteer PDF provider for molecule.dev.

High-fidelity HTML-to-PDF rendering powered by headless Chrome via Puppeteer,
with PDF manipulation (merge, watermark, metadata) via pdf-lib.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-pdf-puppeteer
```

## Usage

```typescript
import { setProvider } from '@molecule/api-pdf'
import { provider } from '@molecule/api-pdf-puppeteer'

setProvider(provider)
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

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-pdf` ^1.0.0
