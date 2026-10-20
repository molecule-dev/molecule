/**
 * Mozilla Readability implementation of WebContentProvider.
 *
 * Fetches a URL in this process (bounded global fetch) and extracts readable
 * content with Mozilla Readability + Turndown (GFM), or extracts from HTML
 * the caller already has — no browser, no JS execution, no vendor account.
 *
 * @remarks
 * **A `url:` fetch runs from YOUR machine's network with NO egress guard.**
 * The fetch follows redirects wherever they point — a user-supplied URL can
 * reach `169.254.169.254`, `localhost`, or your private network from inside
 * your server, and `http://` URLs cross the internet in cleartext. Only
 * fetch URLs you control (or allowlist the host yourself). The hosted
 * molecule.dev provider (`@molecule/api-web-content-molecule`) runs the same
 * read behind an egress guard that dials public addresses only — prefer it
 * when the URL is untrusted.
 *
 * `mode: 'browser'` is REFUSED here on purpose: this provider never executes
 * page JavaScript (the extraction DOM has no `runScripts`), so claiming a
 * browser mode would lie about what the content is. A Chromium-backed
 * provider (the hosted one) serves that mode.
 *
 * @module
 */

import type { WebContentOptions, WebContentProvider } from '@molecule/api-web-content'

import { extractReadable, WEB_CONTENT_LIMITS } from './extract.js'
import type { ReadabilityWebContentConfig } from './types.js'

/** Per-fetch limits, enforced before any network work. */
export const FETCH_LIMITS = {
  maxUrlChars: 2048,
  /** Bytes of response body read before the fetch is refused. */
  maxFetchBytes: 3 * 1024 * 1024,
  maxRedirects: 20,
} as const

/**
 * Validates one read the way the hosted service does — before any work — and
 * returns the sanitized fields.
 *
 * @param source - What to read (exactly one of `url` / `html`).
 * @param options - The caller's options.
 * @returns The sanitized plan.
 * @throws {Error} Naming the first field that is out of contract.
 */
function planRead(
  source: { url?: string; html?: string; baseUrl?: string },
  options?: WebContentOptions,
): {
  url?: string
  html?: string
  baseUrl?: string
  format: 'markdown' | 'text'
  includeLinks: boolean
} {
  const hasUrl = typeof source.url === 'string'
  const hasHtml = typeof source.html === 'string'
  if (hasUrl === hasHtml) {
    throw new Error('Pass exactly one of "url" or "html".')
  }
  const url = hasUrl ? (source.url as string).trim() : undefined
  const html = hasHtml ? (source.html as string) : undefined
  if (url !== undefined) {
    if (url.length === 0 || url.length > FETCH_LIMITS.maxUrlChars) {
      throw new Error(`"url" must be 1-${FETCH_LIMITS.maxUrlChars} characters.`)
    }
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch (_error) {
      // Intentional: the parse failure becomes the field error below.
      throw new Error('"url" must be an absolute http(s) URL.', { cause: _error })
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('"url" must be an absolute http(s) URL.')
    }
  }
  if (html !== undefined) {
    if (html.length === 0) throw new Error('"html" must be non-empty text.')
    if (html.length > WEB_CONTENT_LIMITS.maxHtmlChars) {
      throw new Error(
        `"html" is ${html.length} characters; the limit is ${WEB_CONTENT_LIMITS.maxHtmlChars}.`,
      )
    }
  }
  const baseUrl =
    typeof source.baseUrl === 'string' && source.baseUrl.length > 0 ? source.baseUrl : undefined
  if (baseUrl !== undefined) {
    try {
      const parsed = new URL(baseUrl)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('scheme')
    } catch (_error) {
      // Intentional: the parse failure becomes the field error below.
      throw new Error('"baseUrl" must be an absolute http(s) URL.', { cause: _error })
    }
  }
  if (options?.mode !== undefined && options.mode !== 'raw') {
    throw new Error(
      'mode "browser" needs a browser engine; this provider never executes page JavaScript. Use a Chromium-backed provider (the hosted molecule.dev one) for script-rendered pages.',
    )
  }
  const format = options?.format === 'text' ? 'text' : 'markdown'
  if (options?.format !== undefined && options.format !== 'markdown' && options.format !== 'text') {
    throw new Error('"options.format" must be "markdown" or "text".')
  }
  if (options?.includeLinks !== undefined && typeof options.includeLinks !== 'boolean') {
    throw new Error('"options.includeLinks" must be a boolean.')
  }
  if (options?.settleMs !== undefined) {
    if (!Number.isInteger(options.settleMs) || options.settleMs < 0 || options.settleMs > 5000) {
      throw new Error('"options.settleMs" must be an integer from 0 to 5000.')
    }
    if (options.settleMs > 0) {
      throw new Error(
        '"options.settleMs" waits for client-side rendering, which this provider never runs.',
      )
    }
  }
  return {
    url,
    html,
    baseUrl,
    format,
    includeLinks: options?.includeLinks === true,
  }
}

/**
 * Creates a Readability-backed web content provider.
 *
 * @param config - Optional provider configuration (timeout, byte cap, UA).
 * @returns A `WebContentProvider` backed by Mozilla Readability in this process.
 */
export const createProvider = (config?: ReadabilityWebContentConfig): WebContentProvider => {
  const timeoutMs = config?.timeoutMs ?? 30_000
  const maxFetchBytes = config?.maxFetchBytes ?? FETCH_LIMITS.maxFetchBytes
  const userAgent = config?.userAgent ?? 'molecule-web-content/1.0 (+https://www.molecule.dev)'

  /** One bounded fetch: the body is read incrementally and refused past the cap. */
  const fetchBounded = async (url: string): Promise<{ body: Buffer; response: Response }> => {
    const response = await fetch(url, {
      redirect: 'follow',
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,text/*;q=0.9,*/*;q=0.1',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const reader = response.body?.getReader()
    if (!reader) return { body: Buffer.alloc(0), response }
    const chunks: Buffer[] = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxFetchBytes) {
        await reader.cancel().catch(() => {})
        throw new Error(
          `The page is over ${(maxFetchBytes / (1024 * 1024)).toFixed(0)} MB — refused rather than read into memory.`,
        )
      }
      chunks.push(Buffer.from(value))
    }
    return { body: Buffer.concat(chunks), response }
  }

  const provider: WebContentProvider = {
    async fetch(source, options) {
      const plan = planRead(source as { url?: string; html?: string; baseUrl?: string }, options)
      if (plan.url === undefined) throw new Error('Pass exactly one of "url" or "html".')
      const { body, response } = await fetchBounded(plan.url)
      const extracted = extractReadable(body.toString('utf8'), {
        baseUrl: response.url || plan.url,
        format: plan.format,
        includeLinks: plan.includeLinks,
      })
      return {
        url: plan.url,
        finalUrl: response.url,
        statusCode: response.status,
        ...(response.headers.get('content-type')
          ? { contentType: response.headers.get('content-type') as string }
          : {}),
        title: extracted.title,
        description: extracted.description,
        content: extracted.content,
        format: extracted.format,
        links: extracted.links,
        truncated: extracted.truncated,
        bytes: body.byteLength,
      }
    },

    async extract(source, options) {
      const plan = planRead(source as { url?: string; html?: string; baseUrl?: string }, options)
      if (plan.html === undefined) throw new Error('Pass exactly one of "url" or "html".')
      const extracted = extractReadable(plan.html, {
        baseUrl: plan.baseUrl,
        format: plan.format,
        includeLinks: plan.includeLinks,
      })
      return {
        ...(plan.baseUrl ? { url: plan.baseUrl } : {}),
        title: extracted.title,
        description: extracted.description,
        content: extracted.content,
        format: extracted.format,
        links: extracted.links,
        truncated: extracted.truncated,
        bytes: Buffer.byteLength(plan.html, 'utf8'),
      }
    },
  }
  return provider
}

/**
 * Default Readability web content provider instance, lazily initialized on first access.
 */
let _provider: WebContentProvider | null = null

/**
 * The provider implementation, lazily initialized with default config.
 */
export const provider: WebContentProvider = new Proxy({} as WebContentProvider, {
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
