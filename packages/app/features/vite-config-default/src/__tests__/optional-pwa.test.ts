/**
 * The PWA is opt-in: `vite-plugin-pwa` is an optional peer, and an app that does not install it
 * gets no PWA plugins. A default `mlcl create` app spent ~200 of its ~820 installed packages on
 * the worker's build tooling (`workbox-build`) while the app may never ship a worker.
 */
import type { Plugin, PluginOption } from 'vite'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../optional-pwa.js', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  vitePwa: undefined,
}))

import { createFrameworkViteConfig } from '../framework-config.js'
import { loadVitePwa } from '../optional-pwa.js'

const branding = { APP_NAME: 'Notes', APP_DESCRIPTION: 'Notes app', BRAND_COLOR: '#335577' }
const flat = (plugins: PluginOption[] | undefined): Plugin[] =>
  (plugins ?? []).flat(Infinity as 1).filter((p): p is Plugin => Boolean((p as Plugin)?.name))

const notFound = (id: string): never => {
  throw Object.assign(new Error(`Cannot find module '${id}'`), { code: 'MODULE_NOT_FOUND' })
}

describe('vite-plugin-pwa as an optional peer', () => {
  it('is undefined when it is not installed', async () => {
    expect(await loadVitePwa(notFound)).toBeUndefined()
  })

  it('still throws when resolving fails for another reason', async () => {
    await expect(
      loadVitePwa(() => {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' })
      }),
    ).rejects.toThrow('EACCES')
  })

  it('loads the installed copy', async () => {
    const module = await loadVitePwa((id) => id)
    expect(typeof module?.VitePWA).toBe('function')
  })

  it('builds no PWA plugins and registers no worker without it', () => {
    const config = createFrameworkViteConfig(branding, { plugins: [{ name: 'vite:vue' }] })
    const plugins = flat(config.plugins)
    const names = plugins.map((plugin) => plugin.name)
    expect(names.filter((name) => name.startsWith('vite-plugin-pwa'))).toEqual([])
    expect(names).toEqual(expect.arrayContaining(['vite:vue', 'molecule:root-relative-assets']))
    // The registrar sees no PWA, so it adds nothing to the page.
    const registration = plugins.find((plugin) => plugin.name === 'molecule:pwa-registration')!
    const resolved = { root: process.cwd(), plugins }
    ;(registration.configResolved as (config: unknown) => void)(resolved)
    const html = registration.transformIndexHtml as { handler: () => unknown }
    expect(html.handler()).toBeUndefined()
  })
})
