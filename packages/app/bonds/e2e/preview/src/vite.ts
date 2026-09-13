/**
 * The Vite plugin: serves the page client, injects it into every dev and
 * `vite preview` document, and attaches the hub to the server. Inert in
 * `vite build` — production HTML never carries the client.
 *
 * @module
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import process from 'node:process'

import type { Plugin } from 'vite'

import { E2E_RUNTIME_VERSION, installE2ERuntime } from '@molecule/app-e2e-fixtures-default/runtime'

import { E2E_PREVIEW_CLIENT_SCRIPT } from './client.js'
import { attachE2EHub } from './server.js'
import { E2E_CLIENT_PATH, E2E_RUNTIME_PATH } from './types.js'

/** Options for {@link molE2EPreviewPlugin}. */
export interface MolE2EPreviewPluginOptions {
  /** Turn the plugin off (also `MOL_E2E_PREVIEW_PLUGIN=0`). Default on. */
  enabled?: boolean
}

type Next = (err?: unknown) => void
type Middleware = (req: IncomingMessage, res: ServerResponse, next: Next) => void

/**
 * The client and runtime tags. `data-base` carries the app's resolved Vite
 * `base` ('/blog/'), which the client reports to the driver and announces to
 * the IDE that frames the page, so navigation stays inside the app.
 */
const tags = (base: string): string =>
  `<script src="${E2E_CLIENT_PATH}" data-mol-e2e data-base="${base}"></script>` +
  `<script src="${E2E_RUNTIME_PATH}" data-mol-e2e-runtime></script>`

/**
 * The runtime as a classic script: installing it with the document saves the
 * driver a ~60 KB `evaluate` on the first call after every navigation.
 */
const RUNTIME_SCRIPT = `;(${String(installE2ERuntime)})();`
const RUNTIME_ETAG = `"mol-e2e-runtime-${E2E_RUNTIME_VERSION}"`

/** Put the client and runtime tags at the top of `<head>` unless they are already there. */
export const injectE2EClientTag = (html: string, base = '/'): string => {
  if (html.includes('data-mol-e2e')) return html
  const tag = tags(base)
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + tag)
  return tag + html
}

const serveClient: Middleware = (req, res, next) => {
  const rawPath = (req.url ?? '').split('?')[0]
  // Vite prefixes the hook-injected tag's src with the app's base
  // (`/blog/__mol/e2e-client.js`), and a request for that path used to fall
  // through to the SPA fallback: index.html served as text/html, executed as a
  // script, a syntax error, no client on the page — the hub listed zero pages
  // for every app served under a base path (X0 R63–R68). Answer the client and
  // runtime paths under any base.
  const path =
    [E2E_RUNTIME_PATH, E2E_CLIENT_PATH].find((p) => rawPath === p || rawPath.endsWith(p)) ?? rawPath
  if (path === E2E_RUNTIME_PATH) {
    res.setHeader('etag', RUNTIME_ETAG)
    res.setHeader('cache-control', 'no-cache')
    if (req.headers['if-none-match'] === RUNTIME_ETAG) {
      res.statusCode = 304
      res.end()
      return
    }
    res.setHeader('content-type', 'text/javascript; charset=utf-8')
    res.end(RUNTIME_SCRIPT)
    return
  }
  if (path !== E2E_CLIENT_PATH) return next()
  res.setHeader('content-type', 'text/javascript; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(E2E_PREVIEW_CLIENT_SCRIPT)
}

/**
 * `vite preview` serves built files as-is, so the client is spliced into HTML
 * responses on the way out (navigations only — requests that accept HTML).
 */
const injectIntoHtmlResponses =
  (base: string): Middleware =>
  (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (!String(req.headers.accept ?? '').includes('text/html')) return next()
    const chunks: Buffer[] = []
    let isHtml = false
    const check = (): void => {
      isHtml = String(res.getHeader('content-type') ?? '').includes('text/html')
    }
    const origSetHeader = res.setHeader.bind(res)
    const origWriteHead = res.writeHead.bind(res)
    const origWrite = res.write.bind(res)
    const origEnd = res.end.bind(res)
    res.setHeader = ((name: string, value: number | string | readonly string[]) => {
      origSetHeader(name, value)
      if (name.toLowerCase() === 'content-type') check()
      return res
    }) as typeof res.setHeader
    res.writeHead = ((status: number, ...rest: unknown[]) => {
      const headers = rest.find((r) => r && typeof r === 'object' && !Array.isArray(r)) as
        Record<string, number | string | readonly string[]> | undefined
      if (headers) for (const [k, v] of Object.entries(headers)) origSetHeader(k, v)
      check()
      if (isHtml) res.removeHeader('content-length')
      const message = typeof rest[0] === 'string' ? rest[0] : undefined
      return message ? origWriteHead(status, message) : origWriteHead(status)
    }) as typeof res.writeHead
    res.write = ((chunk: unknown, ...args: unknown[]) => {
      check()
      if (!isHtml) return (origWrite as (...a: unknown[]) => boolean)(chunk, ...args)
      chunks.push(Buffer.from(chunk as string | Uint8Array))
      const cb = args.find((a) => typeof a === 'function') as (() => void) | undefined
      if (cb) cb()
      return true
    }) as typeof res.write
    res.end = ((chunk?: unknown, ...args: unknown[]) => {
      check()
      if (!isHtml) return (origEnd as (...a: unknown[]) => ServerResponse)(chunk, ...args)
      if (chunk && typeof chunk !== 'function')
        chunks.push(Buffer.from(chunk as string | Uint8Array))
      const html = injectE2EClientTag(Buffer.concat(chunks).toString('utf8'), base)
      if (!res.headersSent) {
        res.removeHeader('content-length')
        origSetHeader('content-length', Buffer.byteLength(html))
      }
      return origEnd(html)
    }) as typeof res.end
    next()
  }

/**
 * The Vite plugin every scaffolded app carries (through its scaffold-owned
 * preview plugin file). Dev and preview servers get the hub and the client;
 * builds are untouched.
 */
export function molE2EPreviewPlugin(options: MolE2EPreviewPluginOptions = {}): Plugin {
  const enabled = options.enabled ?? process.env['MOL_E2E_PREVIEW_PLUGIN'] !== '0'
  /** The app's base path from the resolved config — '/blog/' when the site is served under one. */
  let base = '/'
  return {
    name: 'molecule:e2e-preview',
    configResolved(config) {
      base = config.base || '/'
    },
    // Before every other plugin's server hooks: the HTML injector below wraps the
    // response, so it has to be installed before any middleware that ends one.
    enforce: 'pre',
    configureServer(server) {
      if (!enabled) return
      if (server.httpServer) attachE2EHub(server.httpServer)
      server.middlewares.use(serveClient)
      // `transformIndexHtml` below only sees HTML that Vite itself serves. An
      // app that renders pages from its own dev middleware — a static-site
      // generator's post routes, an SSR handler — sends HTML this hook never
      // touches, and those pages loaded in the preview with no client: the hub
      // listed zero pages while the tab showed the app (X0 R65). Every HTML
      // response the dev server sends gets the tags; the index, already tagged
      // by the hook, is left alone.
      server.middlewares.use(injectIntoHtmlResponses(base))
    },
    configurePreviewServer(server) {
      if (!enabled) return
      if (server.httpServer) attachE2EHub(server.httpServer)
      server.middlewares.use(serveClient)
      server.middlewares.use(injectIntoHtmlResponses(base))
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!enabled || !ctx.server) return html
        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: { src: E2E_CLIENT_PATH, 'data-mol-e2e': '', 'data-base': base },
              injectTo: 'head-prepend',
            },
            {
              tag: 'script',
              attrs: { src: E2E_RUNTIME_PATH, 'data-mol-e2e-runtime': '' },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
  }
}
