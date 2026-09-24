/**
 * Puppeteer PDF provider for molecule.dev.
 *
 * High-fidelity HTML-to-PDF rendering powered by headless Chrome via Puppeteer,
 * with PDF manipulation (merge, watermark, metadata) via pdf-lib.
 *
 * @example
 * ```typescript
 * import { fromTemplate, getPageCount, setProvider } from '@molecule/api-pdf'
 * import { createProvider } from '@molecule/api-pdf-puppeteer'
 *
 * // Startup: bond once (singleton). Chrome is launched lazily on the first render and reused.
 * setProvider(
 *   createProvider({
 *     launchArgs: ['--no-sandbox', '--disable-setuid-sandbox'], // needed in Docker/CI
 *     timeout: 30_000, // milliseconds
 *   }),
 * )
 *
 * const invoice = { number: 'INV-1042', customer: '<Ada & Co>', total: '$120.00' }
 * const pdf = await fromTemplate(
 *   `<style>h1 { color: #1d4ed8 } strong { background: #fef08a }</style>
 *    <h1>Invoice {{number}}</h1><p>Billed to {{customer}}</p><p>Total: <strong>{{total}}</strong></p>`,
 *   invoice, // values are HTML-escaped: '<Ada & Co>' renders literally
 *   {
 *     format: 'A4',
 *     printBackground: true, // otherwise CSS backgrounds are dropped
 *     margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
 *     footerTemplate: '<div style="font-size:8px;margin:0 auto">Acme Inc. · Invoice</div>',
 *   },
 * )
 * const pages = await getPageCount(pdf)
 * // `pdf` is a Buffer: send it with content-type application/pdf or store it.
 * console.log(pages, pdf.length)
 * ```
 *
 * @remarks
 * - **Needs a real Chrome at runtime.** `puppeteer` downloads one on install;
 *   slim Docker images also need Chrome's system libraries, or point
 *   `executablePath` at an installed Chromium. It will not run on edge /
 *   serverless runtimes without a Chromium layer — use
 *   `@molecule/api-pdf-pdfkit` there.
 * - **The browser is reused and never closed by the provider** (there is no
 *   `close()`); a one-shot script should pass `reuseBrowser: false` or the
 *   process keeps Chrome alive. `timeout` is in MILLISECONDS (default 30000).
 * - `fromTemplate` HTML-escapes interpolated `{{key}}` / `{{a.b}}` values (no
 *   loops or conditionals); `fromHTML` does NOT — escape user values yourself.
 * - `printBackground` defaults to Chrome's `false`; `headerTemplate` /
 *   `footerTemplate` switch on `displayHeaderFooter` and need inline styles
 *   (the page's CSS does not apply to them). Default page format is `A4`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
