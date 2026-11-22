import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  assertNoBridgeReferences,
  dropBridgeAssets,
  previewBridgeBuildPlugins,
  stripPreviewBridgePlugin,
  stripPreviewBridges,
} from '../vite.js'

let dir = ''
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mol-preview-bridges-'))
})
afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('stripPreviewBridges', () => {
  it('strips a bridge by the naming convention, including names it has never seen', () => {
    const html = [
      '<!doctype html>',
      '<html><body>',
      '<div id="root"></div>',
      '    <!-- mol:telemetry-bridge -->',
      '    <script>',
      "      window.parent.postMessage({ type: 'molecule:whatever' }, '*');",
      '    </script>',
      '    <!-- mol:future-thing-bridge:start -->',
      '    <script>console.log(1)</script>',
      '    <!-- mol:future-thing-bridge:end -->',
      '    <!-- mol:experimental-shim -->',
      '    <script>console.log(2)</script>',
      '</body></html>',
    ].join('\n')

    const stripped = stripPreviewBridges(html)

    expect(stripped).not.toMatch(/mol:[a-z-]+-(?:bridge|shim)/)
    expect(stripped).not.toContain('postMessage')
    expect(stripped).not.toContain('console.log')
    expect(stripped).toContain('<div id="root"></div>')
  })

  it('removes every script into /__mol/ when an edit separates a tag from its sentinel (m179)', () => {
    const html = [
      '<!doctype html>',
      '<html><body>',
      '<div id="root"></div>',
      '    <!-- mol:nav-bridge -->',
      '    <script src="/__mol/bridges/preview-bridge.js"></script>',
      '    <script src="/__mol/bridges/nav-bridge.js"></script>',
      '    <script type="module" src="/src/main.tsx"></script>',
      '</body></html>',
    ].join('\n')

    const stripped = stripPreviewBridges(html)

    expect(stripped).not.toContain('/__mol/')
    expect(stripped).not.toContain('mol:nav-bridge')
    expect(stripped).toContain('<script type="module" src="/src/main.tsx"></script>')
  })

  it('leaves a page without bridges byte-for-byte unchanged, mol: markers and own scripts included', () => {
    const html = [
      '<!doctype html>',
      '<html><head>',
      '    <!-- mol:design-resources -->',
      '    <link rel="stylesheet" href="/fonts.css" />',
      '    <!-- /mol:design-resources -->',
      '<script src="/assets/mol-analytics.js"></script>',
      '</head><body>',
      '<div id="root"></div>',
      '<script type="module" src="/src/main.tsx"></script>',
      '</body></html>',
    ].join('\n')

    expect(stripPreviewBridges(html)).toBe(html)
  })
})

describe('the build-output helpers', () => {
  it('drops the bridge scripts from the output and nothing else; a missing tree is a no-op', async () => {
    const outDir = join(dir, 'dist')
    await mkdir(join(outDir, '__mol', 'bridges'), { recursive: true })
    await mkdir(join(outDir, 'icons'), { recursive: true })
    await writeFile(join(outDir, '__mol', 'bridges', 'interact-bridge.js'), 'bridge code')
    await writeFile(join(outDir, 'icons', 'icon-192.svg'), '<svg/>')

    dropBridgeAssets(outDir)
    expect(existsSync(join(outDir, '__mol'))).toBe(false)
    expect(existsSync(join(outDir, 'icons', 'icon-192.svg'))).toBe(true)
    expect(() => dropBridgeAssets(outDir)).not.toThrow()
  })

  it('names every emitted HTML file that still points into /__mol/', async () => {
    const outDir = join(dir, 'dist-leak')
    await mkdir(join(outDir, 'nested'), { recursive: true })
    await writeFile(
      join(outDir, 'index.html'),
      '<script src="/__mol/bridges/nav-bridge.js"></script>',
    )
    await writeFile(
      join(outDir, 'nested', 'page.html'),
      '<script src="/__mol/bridges/x.js"></script>',
    )
    await writeFile(join(outDir, 'nested', 'other.html'), '<p>ok</p>')

    expect(() => assertNoBridgeReferences(outDir)).toThrow(/index\.html/)
    expect(() => assertNoBridgeReferences(outDir)).toThrow(/nested[\\/]page\.html/)
    expect(() => assertNoBridgeReferences(join(dir, 'never-built'))).not.toThrow()
  })
})

describe('the plugin lists', () => {
  it('registers the strip, the reference guard and the asset drop, each build-only', () => {
    const plugins = previewBridgeBuildPlugins()
    expect(plugins.map((p) => p.name)).toEqual([
      'molecule-strip-preview-bridge',
      'molecule-assert-no-bridge-references',
      'molecule-drop-preview-bridge-assets',
    ])
    expect(plugins.every((p) => p.apply === 'build')).toBe(true)
  })

  it('gives each call its own output directory', async () => {
    // Two builds in one process (a test runner, a multi-config build) must not share it.
    type Guard = {
      configResolved: (config: { root: string; build: { outDir: string } }) => void
      writeBundle: () => void
    }
    const guardA = previewBridgeBuildPlugins()[1] as unknown as Guard
    const guardB = previewBridgeBuildPlugins()[1] as unknown as Guard
    await mkdir(join(dir, 'leaky'), { recursive: true })
    await writeFile(join(dir, 'leaky', 'index.html'), '<script src="/__mol/x.js"></script>')
    guardA.configResolved({ root: dir, build: { outDir: 'leaky' } })
    guardB.configResolved({ root: dir, build: { outDir: 'never-built' } })
    expect(() => guardA.writeBundle()).toThrow(/index\.html/)
    expect(() => guardB.writeBundle()).not.toThrow()
  })

  it('stripPreviewBridgePlugin adds the e2e transport; SvelteKit gets no HTML hook', () => {
    expect(stripPreviewBridgePlugin().map((p) => p.name)).toEqual([
      'molecule-strip-preview-bridge',
      'molecule-assert-no-bridge-references',
      'molecule-drop-preview-bridge-assets',
      'molecule:e2e-preview',
    ])

    const kit = stripPreviewBridgePlugin({ svelteKit: true })
    expect(kit.map((p) => p.name)).toEqual(['molecule:e2e-preview'])
    expect(kit.some((p) => 'transformIndexHtml' in p)).toBe(false)
  })
})
