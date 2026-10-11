/**
 * molecule.dev hosted PDF.
 *
 * `fromHTML` renders HTML to PDF through molecule.dev's headless-Chrome
 * renderer; `merge` and `addWatermark` manipulate PDFs on molecule.dev; the
 * response of each call carries the document as base64 plus its page count.
 * `getPageCount` and `getMetadata` are parsed LOCALLY with pdf-lib — they
 * read the bytes already in hand and make no network call.
 *
 * @module
 */

import { PDFDocument } from 'pdf-lib'

import type { PDFMetadata, PDFOptions, PDFProvider, WatermarkOptions } from '@molecule/api-pdf'

import type { MoleculePdfConfig } from './types.js'

/** Default hosted services base URL. */
export const DEFAULT_SERVICES_URL = 'https://api.molecule.dev/api/v1/services'

/**
 * Validates the hosted-services base URL and strips trailing slashes.
 *
 * The project API key rides as a Bearer token on every call, so a plain-http
 * base URL must never send it across the PUBLIC internet in cleartext.
 * Non-https URLs are refused unless the host is loopback (a self-hosted
 * services instance for local development) or a PRIVATE-network endpoint —
 * RFC 1918 addresses and `*.docker.internal`. Duplicated across the molecule
 * service bonds on purpose: they are independent published packages with no
 * shared runtime dependency.
 *
 * @param raw - The configured or defaulted base URL.
 * @returns The validated base URL, without trailing slashes.
 * @throws {Error} When the URL is not https and not loopback/private http.
 */
function resolveServicesUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '')
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch (_error) {
    throw new Error(
      `Invalid MOLECULE_SERVICES_URL "${raw}" — it must be an absolute https URL (default ${DEFAULT_SERVICES_URL}).`,
      { cause: _error },
    )
  }
  const host = parsed.hostname.toLowerCase()
  if (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && isPrivateHttpHost(host))) {
    return trimmed
  }
  throw new Error(
    `MOLECULE_SERVICES_URL "${raw}" must use https: the project API key is sent as a Bearer token on every request and must not cross the public internet in cleartext. ` +
      `Point it at ${DEFAULT_SERVICES_URL} or a private https endpoint; only loopback and private-network (RFC 1918 / *.docker.internal) http is allowed, for a local services instance or an in-sandbox app reaching its own platform.`,
  )
}

/**
 * Whether a plain-http URL to this host never leaves a trusted network.
 *
 * @param host - Lowercased URL hostname.
 * @returns True when plain http to this host is a private-network hop.
 */
function isPrivateHttpHost(host: string): boolean {
  if (host === 'localhost' || host === '[::1]' || host === '::1' || host.startsWith('127.')) {
    return true
  }
  if (host === 'host.docker.internal' || host.endsWith('.docker.internal')) return true
  const octets = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (!octets) return false
  const [a, b, c, d] = octets.slice(1).map(Number)
  if ([a, b, c, d].some((n) => n > 255)) return false
  if (a === 10) return true
  if (a === 172) return b >= 16 && b <= 31
  if (a === 192) return b === 168
  return false
}

/** Per-request limits of the hosted service (mirrored for local refusal). */
export const PDF_SERVICE_LIMITS = {
  maxHtmlChars: 2_000_000,
  maxDocumentBytes: 8 * 1024 * 1024,
  maxMergeInputs: 20,
  maxMergeTotalBytes: 24 * 1024 * 1024,
  maxWatermarkTextChars: 200,
} as const

/** Error thrown for a refused or failed hosted-service call. */
export class MoleculeServiceError extends Error {
  /** HTTP status from molecule.dev. */
  readonly status: number
  /** Stable error key from molecule.dev. */
  readonly errorKey: string | undefined

  /**
   * Create the error.
   *
   * @param message - Human-readable message.
   * @param status - HTTP status.
   * @param errorKey - Stable error key, when the service sent one.
   * @param cause - The underlying error, if any.
   */
  constructor(message: string, status: number, errorKey?: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause })
    this.name = 'MoleculeServiceError'
    this.status = status
    this.errorKey = errorKey
  }
}

/** What to tell the developer for each refusal the service can return. */
const HINTS: Record<number, string> = {
  401: 'Check MOLECULE_API_KEY: it must be a molecule project API key with the "broker" or "broker:pdf" scope, and not revoked.',
  402: "The molecule project's owner has used the included allowance. Enable usage billing on molecule.dev, or bond your own PDF provider (e.g. @molecule/api-pdf-puppeteer).",
  413: 'HTML is limited to 2,000,000 characters, documents to 8 MB, merges to 20 documents.',
  429: 'Too many requests for this project right now. Slow down and retry.',
  503: 'molecule.dev has paused this service briefly. Retry after the Retry-After delay.',
}

/** The response the hosted PDF service returns for every operation. */
export interface PdfResult {
  /** The PDF document, base64-encoded — no `data:` URL prefix. */
  data: string
  /** MIME type of the returned document (`application/pdf`). */
  mimeType: string
  /** Number of pages in the returned document. */
  pageCount: number
  /** Size in bytes. */
  bytes: number
}

/**
 * PDF provider backed by molecule.dev's hosted service.
 *
 * `fromTemplate` is NOT hosted: templating is string interpolation the caller
 * does in its own code (escape interpolated values, then call `fromHTML`) —
 * the service renders the HTML it is given.
 */
export class MoleculePdfProvider implements PDFProvider {
  readonly name = 'molecule'

  private readonly apiKey: string
  private readonly servicesUrl: string
  private readonly timeoutMs: number

  /**
   * Create the provider.
   *
   * @param config - Options; each falls back to its env var.
   */
  constructor(config: MoleculePdfConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.MOLECULE_API_KEY ?? ''
    this.servicesUrl = resolveServicesUrl(
      config.servicesUrl ?? process.env.MOLECULE_SERVICES_URL ?? DEFAULT_SERVICES_URL,
    )
    this.timeoutMs = config.timeoutMs ?? 60_000
  }

  /**
   * Renders HTML to PDF through the hosted service and returns the decoded
   * document plus its page count. Prefer this over `fromHTML` when the page
   * count matters — it is the same single round trip.
   *
   * @param html - The HTML to render.
   * @param options - Page size, margins, scale, header/footer templates.
   * @returns The rendered PDF plus its metadata.
   */
  async render(html: string, options?: PDFOptions): Promise<PdfResult> {
    if (typeof html !== 'string' || html.length === 0) {
      throw new MoleculeServiceError(
        '"html" must be non-empty text.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (html.length > PDF_SERVICE_LIMITS.maxHtmlChars) {
      throw new MoleculeServiceError(
        `The HTML is ${html.length} characters; the limit is ${PDF_SERVICE_LIMITS.maxHtmlChars}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    return this.request('pdf/from-html', { html, ...(options !== undefined ? { options } : {}) })
  }

  /** Renders HTML to PDF through the hosted service. */
  async fromHTML(html: string, options?: PDFOptions): Promise<Buffer> {
    const result = await this.render(html, options)
    return Buffer.from(result.data, 'base64')
  }

  /** Not hosted — interpolate the template yourself (escape the values), then call `fromHTML`. */
  fromTemplate(): Promise<Buffer> {
    return Promise.reject(
      new MoleculeServiceError(
        'The hosted PDF service does not serve template interpolation — build the HTML yourself (HTML-escape every interpolated value) and call fromHTML.',
        400,
        'hostedServices.error.invalidInput',
      ),
    )
  }

  /**
   * Merges PDFs on the hosted service.
   *
   * @param pdfs - The documents, in order.
   * @returns The merged PDF.
   */
  async merge(pdfs: Buffer[]): Promise<Buffer> {
    if (!Array.isArray(pdfs) || pdfs.length === 0) {
      throw new MoleculeServiceError(
        '"pdfs" must be a non-empty array of PDF buffers.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (pdfs.length > PDF_SERVICE_LIMITS.maxMergeInputs) {
      throw new MoleculeServiceError(
        `${pdfs.length} documents is over the limit of ${PDF_SERVICE_LIMITS.maxMergeInputs}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    for (const pdf of pdfs) {
      if (!Buffer.isBuffer(pdf) || pdf.length === 0) {
        throw new MoleculeServiceError(
          'Every entry of "pdfs" must be non-empty PDF bytes.',
          400,
          'hostedServices.error.invalidInput',
        )
      }
      if (pdf.length > PDF_SERVICE_LIMITS.maxDocumentBytes) {
        throw new MoleculeServiceError(
          `A document is ${pdf.length} bytes; the per-document limit is ${PDF_SERVICE_LIMITS.maxDocumentBytes}.`,
          413,
          'hostedServices.error.inputTooLarge',
        )
      }
    }
    const total = pdfs.reduce((sum, pdf) => sum + pdf.length, 0)
    if (total > PDF_SERVICE_LIMITS.maxMergeTotalBytes) {
      throw new MoleculeServiceError(
        `The merge totals ${total} bytes; the limit is ${PDF_SERVICE_LIMITS.maxMergeTotalBytes}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    const result = await this.request('pdf/merge', {
      pdfs: pdfs.map((pdf) => pdf.toString('base64')),
    })
    return Buffer.from(result.data, 'base64')
  }

  /**
   * Adds a text watermark to every page on the hosted service.
   *
   * @param pdf - The document to watermark.
   * @param text - The watermark text.
   * @param options - Font size, color, rotation, opacity.
   * @returns The watermarked PDF.
   */
  async addWatermark(pdf: Buffer, text: string, options?: WatermarkOptions): Promise<Buffer> {
    if (!Buffer.isBuffer(pdf) || pdf.length === 0) {
      throw new MoleculeServiceError(
        '"pdf" must be non-empty PDF bytes.',
        400,
        'hostedServices.error.invalidInput',
      )
    }
    if (pdf.length > PDF_SERVICE_LIMITS.maxDocumentBytes) {
      throw new MoleculeServiceError(
        `The document is ${pdf.length} bytes; the limit is ${PDF_SERVICE_LIMITS.maxDocumentBytes}.`,
        413,
        'hostedServices.error.inputTooLarge',
      )
    }
    if (
      typeof text !== 'string' ||
      text.trim().length === 0 ||
      text.length > PDF_SERVICE_LIMITS.maxWatermarkTextChars
    ) {
      throw new MoleculeServiceError(
        `"text" must be 1-${PDF_SERVICE_LIMITS.maxWatermarkTextChars} characters.`,
        400,
        'hostedServices.error.invalidInput',
      )
    }
    const result = await this.request('pdf/watermark', {
      pdf: pdf.toString('base64'),
      text,
      ...(options !== undefined ? { options } : {}),
    })
    return Buffer.from(result.data, 'base64')
  }

  /** Counts pages with a local pdf-lib parse — no network call. */
  async getPageCount(pdf: Buffer): Promise<number> {
    const doc = await PDFDocument.load(pdf, { updateMetadata: false })
    return doc.getPageCount()
  }

  /** Reads document metadata with a local pdf-lib parse — no network call. */
  async getMetadata(pdf: Buffer): Promise<PDFMetadata> {
    const doc = await PDFDocument.load(pdf, { updateMetadata: false })
    return {
      pageCount: doc.getPageCount(),
      title: doc.getTitle(),
      author: doc.getAuthor(),
      subject: doc.getSubject(),
      creator: doc.getCreator(),
      creationDate: doc.getCreationDate(),
      modificationDate: doc.getModificationDate(),
    }
  }

  /** One POST to the hosted service. */
  private async request(path: string, body: Record<string, unknown>): Promise<PdfResult> {
    if (!this.apiKey) {
      throw new MoleculeServiceError(
        'MOLECULE_API_KEY is not set. Create a project API key on molecule.dev (or with `mlcl apikey create`) and put it in the API .env.',
        401,
        'hostedServices.error.tokenInvalid',
      )
    }
    const response = await fetch(`${this.servicesUrl}/${path}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    })
    const text = await response.text()
    let data: unknown
    try {
      data = text ? JSON.parse(text) : {}
    } catch (error) {
      throw new MoleculeServiceError(
        `molecule.dev returned ${response.status} with a non-JSON body.`,
        response.status,
        undefined,
        error,
      )
    }
    if (!response.ok) {
      const err = data as { error?: string; errorKey?: string }
      const hint = HINTS[response.status]
      throw new MoleculeServiceError(
        `molecule.dev ${path} failed (${response.status}): ${err.error ?? 'error'}${hint ? ` ${hint}` : ''}`,
        response.status,
        err.errorKey,
      )
    }
    return data as PdfResult
  }
}

/**
 * Create a hosted PDF provider.
 *
 * @param config - Options; each falls back to its env var.
 * @returns A `PDFProvider` backed by molecule.dev.
 */
export function createProvider(config?: MoleculePdfConfig): PDFProvider {
  return new MoleculePdfProvider(config)
}
