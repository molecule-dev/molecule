/**
 * Type definitions for PDF generation core interface.
 *
 * @module
 */

/**
 * Standard page size formats.
 */
export type PageFormat = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal' | 'Tabloid'

/**
 * Page margin specification in CSS-style units (e.g., `'1cm'`, `'0.5in'`, `'20px'`).
 */
export interface Margin {
  /** Top margin. */
  top?: string

  /** Right margin. */
  right?: string

  /** Bottom margin. */
  bottom?: string

  /** Left margin. */
  left?: string
}

/**
 * Options for PDF generation.
 */
export interface PDFOptions {
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

/**
 * Options for watermark placement.
 */
export interface WatermarkOptions {
  /** Font size in points. Defaults to `48`. */
  fontSize?: number

  /** Text color (CSS color string). Defaults to `'rgba(0, 0, 0, 0.15)'`. */
  color?: string

  /** Rotation angle in degrees. Defaults to `-45`. */
  rotation?: number

  /** Opacity (0–1). Defaults to `0.15`. */
  opacity?: number
}

/**
 * Options for rendering PDF pages to images.
 */
export interface RenderOptions {
  /** Output image format. Defaults to `'png'`. */
  format?: 'png' | 'jpeg'

  /** DPI resolution. Defaults to `150`. */
  dpi?: number

  /** Specific page numbers to render (1-based). If omitted, all pages are rendered. */
  pages?: number[]

  /** Quality percentage for JPEG output (1–100). Defaults to `80`. */
  quality?: number
}

/**
 * Metadata extracted from a PDF buffer.
 */
export interface PDFMetadata {
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

/**
 * PDF generation and manipulation provider interface.
 *
 * All PDF providers must implement this interface.
 * Bond packages (Puppeteer, PDFKit, etc.) provide concrete implementations.
 */
export interface PDFProvider {
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
