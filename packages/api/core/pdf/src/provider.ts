/**
 * PDF provider bond accessor and convenience functions.
 *
 * Bond packages (e.g. `@molecule/api-pdf-puppeteer`) call `setProvider()` during setup.
 * Application code uses the convenience functions which delegate to the bonded provider.
 *
 * @module
 */

import { bond, expectBond, isBonded, require as bondRequire } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type {
  PDFMetadata,
  PDFOptions,
  PDFProvider,
  RenderOptions,
  WatermarkOptions,
} from './types.js'

const BOND_TYPE = 'pdf'
expectBond(BOND_TYPE)

/**
 * Registers a PDF provider as the active singleton. Called by bond
 * packages during application startup.
 *
 * @param provider - The PDF provider implementation to bond.
 */
export const setProvider = (provider: PDFProvider): void => {
  bond(BOND_TYPE, provider)
}

/**
 * Retrieves the bonded PDF provider, throwing if none is configured.
 *
 * @returns The bonded PDF provider.
 * @throws {Error} If no PDF provider has been bonded.
 */
export const getProvider = (): PDFProvider => {
  try {
    return bondRequire<PDFProvider>(BOND_TYPE)
  } catch {
    throw new Error(
      t('pdf.error.noProvider', undefined, {
        defaultValue: 'PDF provider not configured. Call setProvider() first.',
      }),
    )
  }
}

/**
 * Checks whether a PDF provider is currently bonded.
 *
 * @returns `true` if a PDF provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Generates a PDF from an HTML string.
 *
 * @param html - The HTML content to render as a PDF.
 * @param options - PDF generation options (page size, margins, etc.).
 * @returns The generated PDF as a Buffer.
 * @throws {Error} If no PDF provider has been bonded.
 */
export const fromHTML = async (html: string, options?: PDFOptions): Promise<Buffer> => {
  return getProvider().fromHTML(html, options)
}

/**
 * Generates a PDF from a template string with data interpolation.
 *
 * @param template - The template string.
 * @param data - Data to interpolate into the template.
 * @param options - PDF generation options.
 * @returns The generated PDF as a Buffer.
 * @throws {Error} If no PDF provider has been bonded.
 */
export const fromTemplate = async (
  template: string,
  data: Record<string, unknown>,
  options?: PDFOptions,
): Promise<Buffer> => {
  return getProvider().fromTemplate(template, data, options)
}

/**
 * Merges multiple PDF buffers into a single PDF document.
 *
 * @param pdfs - An array of PDF buffers to merge.
 * @returns The merged PDF as a Buffer.
 * @throws {Error} If no PDF provider has been bonded.
 */
export const merge = async (pdfs: Buffer[]): Promise<Buffer> => {
  return getProvider().merge(pdfs)
}

/**
 * Adds a text watermark to every page of a PDF.
 *
 * @param pdf - The source PDF buffer.
 * @param text - The watermark text.
 * @param options - Watermark styling and placement options.
 * @returns The watermarked PDF as a Buffer.
 * @throws {Error} If no PDF provider has been bonded.
 */
export const addWatermark = async (
  pdf: Buffer,
  text: string,
  options?: WatermarkOptions,
): Promise<Buffer> => {
  return getProvider().addWatermark(pdf, text, options)
}

/**
 * Returns the total number of pages in a PDF.
 *
 * @param pdf - The PDF buffer.
 * @returns The page count.
 * @throws {Error} If no PDF provider has been bonded.
 */
export const getPageCount = async (pdf: Buffer): Promise<number> => {
  return getProvider().getPageCount(pdf)
}

/**
 * Extracts metadata from a PDF buffer.
 *
 * @param pdf - The PDF buffer.
 * @returns Metadata about the PDF document.
 * @throws {Error} If no PDF provider has been bonded or the provider does not support metadata extraction.
 */
export const getMetadata = async (pdf: Buffer): Promise<PDFMetadata> => {
  const provider = getProvider()
  if (!provider.getMetadata) {
    throw new Error(
      t('pdf.error.getMetadataNotSupported', undefined, {
        defaultValue: 'The bonded PDF provider does not support metadata extraction.',
      }),
    )
  }
  return provider.getMetadata(pdf)
}

/**
 * Renders PDF pages as image buffers.
 *
 * @param pdf - The PDF buffer.
 * @param options - Rendering options (format, DPI, specific pages).
 * @returns An array of image buffers, one per rendered page.
 * @throws {Error} If no PDF provider has been bonded or the provider does not support rendering to images.
 */
export const toImages = async (pdf: Buffer, options?: RenderOptions): Promise<Buffer[]> => {
  const provider = getProvider()
  if (!provider.toImages) {
    throw new Error(
      t('pdf.error.toImagesNotSupported', undefined, {
        defaultValue: 'The bonded PDF provider does not support rendering to images.',
      }),
    )
  }
  return provider.toImages(pdf, options)
}
