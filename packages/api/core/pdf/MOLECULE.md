# @molecule/api-pdf

Provider-agnostic PDF generation and manipulation interface for molecule.dev.

Defines the `PDFProvider` interface for generating PDFs from HTML or templates,
merging documents, adding watermarks, counting pages, and rendering pages as images.
Bond packages (Puppeteer, PDFKit, etc.) implement this interface. Application code
uses the convenience functions (`fromHTML`, `fromTemplate`, `merge`, `addWatermark`,
`getPageCount`, `getMetadata`, `toImages`) which delegate to the bonded provider.

## Quick Start

```typescript
import { setProvider, fromHTML, merge, getPageCount } from '@molecule/api-pdf'
import { provider as puppeteer } from '@molecule/api-pdf-puppeteer'

setProvider(puppeteer)
const pdf = await fromHTML('<h1>Hello World</h1>', { format: 'A4', margin: { top: '1cm' } })
const pageCount = await getPageCount(pdf)
const merged = await merge([pdf, anotherPdf])
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-pdf
```

## API

### Interfaces

#### `Margin`

Page margin specification in CSS-style units (e.g., `'1cm'`, `'0.5in'`, `'20px'`).

```typescript
interface Margin {
  /** Top margin. */
  top?: string

  /** Right margin. */
  right?: string

  /** Bottom margin. */
  bottom?: string

  /** Left margin. */
  left?: string
}
```

#### `PDFMetadata`

Metadata extracted from a PDF buffer.

```typescript
interface PDFMetadata {
  /** Total number of pages. */
  pageCount: number

  /** Document title, if set. */
  title?: string

  /** Document author, if set. */
  author?: string

  /** Document subject, if set. */
  subject?: string

  /** Document creator application, if set. */
  creator?: string

  /** Document creation date, if available. */
  creationDate?: Date

  /** Document modification date, if available. */
  modificationDate?: Date
}
```

#### `PDFOptions`

Options for PDF generation.

```typescript
interface PDFOptions {
  /** Page size format. Defaults to `'A4'`. */
  format?: PageFormat

  /** Whether to use landscape orientation. Defaults to `false`. */
  landscape?: boolean

  /** Page margins. */
  margin?: Margin

  /** HTML template for the page header. */
  headerTemplate?: string

  /** HTML template for the page footer. */
  footerTemplate?: string

  /** Whether to print background graphics. Defaults to `false`. */
  printBackground?: boolean

  /** Paper width in CSS units (overrides `format`). */
  width?: string

  /** Paper height in CSS units (overrides `format`). */
  height?: string

  /** Page ranges to print (e.g., `'1-5'`, `'1,3,5-7'`). */
  pageRanges?: string

  /** Scale of the webpage rendering. Defaults to `1`. Must be between 0.1 and 2. */
  scale?: number
}
```

#### `PDFProvider`

PDF generation and manipulation provider interface.

All PDF providers must implement this interface.
Bond packages (Puppeteer, PDFKit, etc.) provide concrete implementations.

```typescript
interface PDFProvider {
  /**
   * Generates a PDF from an HTML string.
   *
   * @param html - The HTML content to render as a PDF.
   * @param options - PDF generation options (page size, margins, etc.).
   * @returns The generated PDF as a Buffer.
   */
  fromHTML(html: string, options?: PDFOptions): Promise<Buffer>

  /**
   * Generates a PDF from a template string with data interpolation.
   *
   * The template format is provider-dependent (e.g., Handlebars, Mustache).
   * Providers should document their supported template syntax.
   *
   * @param template - The template string.
   * @param data - Data to interpolate into the template.
   * @param options - PDF generation options.
   * @returns The generated PDF as a Buffer.
   */
  fromTemplate(
    template: string,
    data: Record<string, unknown>,
    options?: PDFOptions,
  ): Promise<Buffer>

  /**
   * Merges multiple PDF buffers into a single PDF document.
   *
   * @param pdfs - An array of PDF buffers to merge.
   * @returns The merged PDF as a Buffer.
   */
  merge(pdfs: Buffer[]): Promise<Buffer>

  /**
   * Adds a text watermark to every page of a PDF.
   *
   * @param pdf - The source PDF buffer.
   * @param text - The watermark text.
   * @param options - Watermark styling and placement options.
   * @returns The watermarked PDF as a Buffer.
   */
  addWatermark(pdf: Buffer, text: string, options?: WatermarkOptions): Promise<Buffer>

  /**
   * Returns the total number of pages in a PDF.
   *
   * @param pdf - The PDF buffer.
   * @returns The page count.
   */
  getPageCount(pdf: Buffer): Promise<number>

  /**
   * Extracts metadata from a PDF buffer.
   *
   * @param pdf - The PDF buffer.
   * @returns Metadata about the PDF document.
   */
  getMetadata?(pdf: Buffer): Promise<PDFMetadata>

  /**
   * Renders PDF pages as image buffers.
   *
   * @param pdf - The PDF buffer.
   * @param options - Rendering options (format, DPI, specific pages).
   * @returns An array of image buffers, one per rendered page.
   */
  toImages?(pdf: Buffer, options?: RenderOptions): Promise<Buffer[]>
}
```

#### `RenderOptions`

Options for rendering PDF pages to images.

```typescript
interface RenderOptions {
  /** Output image format. Defaults to `'png'`. */
  format?: 'png' | 'jpeg'

  /** DPI resolution. Defaults to `150`. */
  dpi?: number

  /** Specific page numbers to render (1-based). If omitted, all pages are rendered. */
  pages?: number[]

  /** Quality percentage for JPEG output (1–100). Defaults to `80`. */
  quality?: number
}
```

#### `WatermarkOptions`

Options for watermark placement.

```typescript
interface WatermarkOptions {
  /** Font size in points. Defaults to `48`. */
  fontSize?: number

  /** Text color (CSS color string). Defaults to `'rgba(0, 0, 0, 0.15)'`. */
  color?: string

  /** Rotation angle in degrees. Defaults to `-45`. */
  rotation?: number

  /** Opacity (0–1). Defaults to `0.15`. */
  opacity?: number
}
```

### Types

#### `PageFormat`

Standard page size formats.

```typescript
type PageFormat = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid'
```

### Functions

#### `addWatermark(pdf, text, options)`

Adds a text watermark to every page of a PDF.

```typescript
function addWatermark(pdf: Buffer<ArrayBufferLike>, text: string, options?: WatermarkOptions): Promise<Buffer<ArrayBufferLike>>
```

- `pdf` — The source PDF buffer.
- `text` — The watermark text.
- `options` — Watermark styling and placement options.

**Returns:** The watermarked PDF as a Buffer.

#### `fromHTML(html, options)`

Generates a PDF from an HTML string.

```typescript
function fromHTML(html: string, options?: PDFOptions): Promise<Buffer<ArrayBufferLike>>
```

- `html` — The HTML content to render as a PDF.
- `options` — PDF generation options (page size, margins, etc.).

**Returns:** The generated PDF as a Buffer.

#### `fromTemplate(template, data, options)`

Generates a PDF from a template string with data interpolation.

```typescript
function fromTemplate(template: string, data: Record<string, unknown>, options?: PDFOptions): Promise<Buffer<ArrayBufferLike>>
```

- `template` — The template string.
- `data` — Data to interpolate into the template.
- `options` — PDF generation options.

**Returns:** The generated PDF as a Buffer.

#### `getMetadata(pdf)`

Extracts metadata from a PDF buffer.

```typescript
function getMetadata(pdf: Buffer<ArrayBufferLike>): Promise<PDFMetadata>
```

- `pdf` — The PDF buffer.

**Returns:** Metadata about the PDF document.

#### `getPageCount(pdf)`

Returns the total number of pages in a PDF.

```typescript
function getPageCount(pdf: Buffer<ArrayBufferLike>): Promise<number>
```

- `pdf` — The PDF buffer.

**Returns:** The page count.

#### `getProvider()`

Retrieves the bonded PDF provider, throwing if none is configured.

```typescript
function getProvider(): PDFProvider
```

**Returns:** The bonded PDF provider.

#### `hasProvider()`

Checks whether a PDF provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if a PDF provider is bonded.

#### `merge(pdfs)`

Merges multiple PDF buffers into a single PDF document.

```typescript
function merge(pdfs: Buffer<ArrayBufferLike>[]): Promise<Buffer<ArrayBufferLike>>
```

- `pdfs` — An array of PDF buffers to merge.

**Returns:** The merged PDF as a Buffer.

#### `setProvider(provider)`

Registers a PDF provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: PDFProvider): void
```

- `provider` — The PDF provider implementation to bond.

#### `toImages(pdf, options)`

Renders PDF pages as image buffers.

```typescript
function toImages(pdf: Buffer<ArrayBufferLike>, options?: RenderOptions): Promise<Buffer<ArrayBufferLike>[]>
```

- `pdf` — The PDF buffer.
- `options` — Rendering options (format, DPI, specific pages).

**Returns:** An array of image buffers, one per rendered page.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
