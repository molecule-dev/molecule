/**
 * AWS Textract implementation of OcrProvider.
 *
 * Calls Amazon Textract's synchronous DetectDocumentText with the image bytes
 * and assembles the result from Textract's LINE blocks (Textract's reading
 * order), with the mean LINE confidence as the page score.
 *
 * @module
 */

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'
import { DetectDocumentTextCommand, TextractClient } from '@aws-sdk/client-textract'
import { defaultProvider } from '@aws-sdk/credential-provider-node'

import { trackBondFailure } from '@molecule/api-analytics'
import { getLogger } from '@molecule/api-bond'
import type { OcrInput, OcrOptions, OcrProvider, OcrResult } from '@molecule/api-ocr'
import { getProxyAgents } from '@molecule/api-proxy-agent'

import type { AwsCredentials, TextractOcrConfig } from './types.js'

const logger = getLogger()

/**
 * MIME types DetectDocumentText accepts as raw bytes (AWS "Document" type:
 * "The document bytes must be in PNG or JPEG format"). `image/jpg` is the
 * common non-standard alias for `image/jpeg`.
 */
const ACCEPTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg'])

/**
 * Maximum document bytes for the `Bytes` input (AWS documents 5 MB for a
 * blob-provided document — the synchronous API has no S3 path in this bond).
 */
const MAX_BYTES = 5 * 1024 * 1024

/**
 * Resolves the region at CLIENT-CONSTRUCTION time, not import time, so a
 * region resolved into `process.env` after this module loads (late secrets
 * resolution via a secrets bond) is honored — the SES bond's lesson.
 *
 * @param config - Explicit config, when the provider was created with one.
 * @returns The region to call Textract in.
 */
export function resolveRegion(config?: TextractOcrConfig): string {
  return (
    config?.region ?? (process.env.AWS_TEXTRACT_REGION || process.env.AWS_REGION || 'us-east-1')
  )
}

/**
 * Builds a Textract client from a config (or the environment when omitted).
 *
 * The AWS SDK v3 builds its own `https.Agent` and reads no proxy variable, so
 * on a host whose only egress path is a proxy every call fails with a bare
 * connection error unless the agent is passed in via `requestHandler` — the
 * SES bond's fix, mirrored here.
 *
 * @param config - Explicit config. Omitted keys fall back to the environment
 *   (`AWS_TEXTRACT_REGION` → `AWS_REGION` → `us-east-1`; `AWS_TEXTRACT_ENDPOINT`).
 * @returns The configured client.
 */
export function buildTextractClient(config?: TextractOcrConfig): TextractClient {
  const region = resolveRegion(config)
  const endpoint = config?.endpoint ?? process.env.AWS_TEXTRACT_ENDPOINT
  const credentials: AwsCredentials | undefined = config?.credentials
  const proxy = getProxyAgents(endpoint || `https://textract.${region}.amazonaws.com`)
  return new TextractClient({
    region,
    ...(credentials ? { credentials } : { credentialDefaultProvider: defaultProvider }),
    ...(endpoint ? { endpoint } : {}),
    ...(proxy ? { requestHandler: proxy } : {}),
  })
}

/**
 * Validates the image against what DetectDocumentText accepts BEFORE any
 * upstream call, so a wrong-format or oversized image fails fast and free.
 *
 * @param input - The caller's image.
 * @throws {Error} When the MIME type or size is outside Textract's contract.
 */
function assertAccepted(input: OcrInput): void {
  if (!ACCEPTED_MIME_TYPES.has(input.mimeType)) {
    throw new Error(
      `AWS Textract accepts PNG or JPEG images only, got ${JSON.stringify(input.mimeType)}. ` +
        'Convert the image first (TIFF/BMP/PDF need the asynchronous Textract APIs, which this bond does not cover).',
    )
  }
  if (input.data.byteLength > MAX_BYTES) {
    throw new Error(
      `AWS Textract accepts documents up to 5 MB, got ${(input.data.byteLength / 1024 / 1024).toFixed(1)} MB. ` +
        'Downscale or re-encode the image before recognizing.',
    )
  }
}

/**
 * OCR provider backed by Amazon Textract.
 */
class TextractOcrProvider implements OcrProvider {
  readonly name = 'textract'

  /** Built on first recognize — NOT at construction — and memoized. */
  private client: TextractClient | null = null

  private readonly config?: TextractOcrConfig

  constructor(config?: TextractOcrConfig) {
    this.config = config
  }

  /**
   * Recognize text in one image with DetectDocumentText.
   *
   * @param input - The image bytes and MIME type (PNG or JPEG, up to 5 MB).
   * @param _options - Unused: DetectDocumentText takes no language hint
   *   (it finds printed text regardless of language; handwriting support is
   *   limited and outside this bond's control).
   * @returns The recognized text, one page.
   */
  async recognize(input: OcrInput, _options?: OcrOptions): Promise<OcrResult> {
    assertAccepted(input)
    try {
      if (!this.client) this.client = buildTextractClient(this.config)
      const response = await this.client.send(
        new DetectDocumentTextCommand({ Document: { Bytes: input.data } }),
      )
      const lines = (response.Blocks ?? []).filter((block) => block.BlockType === 'LINE')
      const text = lines.map((line) => line.Text ?? '').join('\n')
      const scored = lines.filter((line) => typeof line.Confidence === 'number')
      const confidence =
        scored.length > 0
          ? scored.reduce((sum, line) => sum + (line.Confidence ?? 0), 0) / scored.length / 100
          : undefined
      return {
        text,
        pages: [{ pageNumber: 1, text, confidence }],
      }
    } catch (error) {
      trackBondFailure({ bond: 'ocr-textract', operation: 'recognize', error })
      logger.error('Textract recognize error:', error)
      throw error
    }
  }
}

/**
 * Creates a Textract OCR provider instance.
 *
 * @param config - AWS-specific configuration (region, endpoint, credentials).
 * @returns An `OcrProvider` backed by Amazon Textract.
 */
export function createProvider(config?: TextractOcrConfig): OcrProvider {
  return new TextractOcrProvider(config)
}

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: OcrProvider | null = null
/**
 * The provider implementation.
 */
export const provider: OcrProvider = new Proxy({} as OcrProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
