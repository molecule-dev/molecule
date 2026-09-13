import type { AddressInfo } from 'node:net'

import { createServer, type Plugin, type ViteDevServer } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { molE2EPreviewPlugin } from '../vite.js'

/**
 * X0 R65: the dev server injected the page client only through
 * `transformIndexHtml`, so HTML an app rendered from its own dev middleware (a
 * static-site generator's post routes) reached the preview with no client and
 * the hub listed zero pages while the tab showed the app. Every HTML response
 * the dev server sends carries the tags now; Vite's own index is tagged once.
 */
describe('molE2EPreviewPlugin on a dev server', () => {
  let server: ViteDevServer
  let origin = ''
  const appRoutes: Plugin = {
    name: 'test:app-routes',
    configureServer(s) {
      s.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0]
        if (path === '/blog/post/') {
          res.setHeader('content-type', 'text/html; charset=utf-8')
          res.end(
            '<!doctype html><html><head><title>Post</title></head><body><h1>Post</h1></body></html>',
          )
          return
        }
        if (path === '/blog/data.json') {
          res.setHeader('content-type', 'application/json')
          res.end('{"ok":true}')
          return
        }
        next()
      })
    },
  }

  beforeAll(async () => {
    server = await createServer({
      configFile: false,
      root: import.meta.dirname + '/fixtures/dev-app',
      base: '/blog/',
      logLevel: 'silent',
      server: { port: 0, host: '127.0.0.1', strictPort: false },
      plugins: [appRoutes, molE2EPreviewPlugin()],
    })
    await server.listen()
    const address = server.httpServer?.address() as AddressInfo
    origin = `http://127.0.0.1:${address.port}`
  })
  afterAll(async () => {
    await server?.close()
  })

  const html = async (path: string): Promise<string> => {
    const res = await fetch(origin + path, { headers: { accept: 'text/html' } })
    expect(res.status, path).toBe(200)
    return res.text()
  }

  it("tags the HTML an app's own middleware renders, so its pages connect to the hub", async () => {
    const page = await html('/blog/post/')
    expect(page).toContain('data-mol-e2e')
    expect(page).toContain('data-base="/blog/"')
    expect(page).toContain('<h1>Post</h1>')
    expect(page.match(/data-mol-e2e(?:=""| |>)/g)?.length, 'the client tag once').toBe(1)
  })

  it("tags Vite's own index exactly once (the hook and the injector do not double up)", async () => {
    const index = await html('/blog/')
    expect(index.match(/data-mol-e2e(?:=""| |>)/g)?.length).toBe(1)
    expect(index).toContain('data-base="/blog/"')
  })

  // X0 R68: Vite prefixes the hook-injected tag's src with the base, and the
  // base-prefixed path fell through to the SPA fallback — index.html served as
  // the client script, so no page ever connected under a base path.
  it('serves the client and runtime under the base path the tag actually uses', async () => {
    const index = await html('/blog/')
    const src = index.match(/<script src="([^"]*e2e-client\.js)"/)?.[1]
    expect(src, 'the tag names the client').toBeTruthy()
    const res = await fetch(origin + src)
    expect(res.headers.get('content-type')).toContain('text/javascript')
    expect(await res.text()).toContain('__molE2EClient')
    const rt = await fetch(origin + '/blog/__mol/e2e-runtime.js')
    expect(rt.headers.get('content-type')).toContain('text/javascript')
  })

  it('leaves non-HTML responses alone', async () => {
    const res = await fetch(origin + '/blog/data.json', { headers: { accept: 'text/html' } })
    expect(await res.text()).toBe('{"ok":true}')
  })
})
