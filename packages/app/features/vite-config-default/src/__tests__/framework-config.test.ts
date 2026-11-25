/**
 * The framework-neutral config: an app on any UI framework gets the same config as a
 * React app, from an entry that never loads React's or Tailwind's Vite plugin.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { build, type Plugin, type PluginOption } from 'vite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// The framework entry must not load these: a non-React app never uses them, and an
// install that skips peers leaves them out, so importing either would fail at config load.
vi.mock('@vitejs/plugin-react', () => {
  throw new Error('the framework entry loaded @vitejs/plugin-react')
})
vi.mock('@tailwindcss/vite', () => {
  throw new Error('the framework entry loaded @tailwindcss/vite')
})
vi.mock('vite-plugin-pwa', () => ({
  VitePWA: (options: unknown) => [{ name: 'vite-plugin-pwa', __options: options }],
}))

import { createFrameworkViteConfig } from '../framework-config.js'

const branding = { APP_NAME: 'Notes', APP_DESCRIPTION: 'Notes app', BRAND_COLOR: '#335577' }
const names = (plugins: PluginOption[] | undefined): string[] =>
  (plugins ?? []).flat(Infinity as 1).flatMap((plugin) => {
    const name = (plugin as Plugin | null)?.name
    return name ? [name] : []
  })
const plugin = (plugins: PluginOption[] | undefined, name: string): Plugin =>
  (plugins ?? []).flat(Infinity as 1).find((p) => (p as Plugin | null)?.name === name) as Plugin

let root: string
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'vite-framework-'))
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('createFrameworkViteConfig', () => {
  it('builds a file-linked package with a dependency installed only in its external workspace', async () => {
    const app = join(root, 'aggregate')
    const prefix = join(root, 'source')
    const pkg = join(prefix, 'packages/example')
    const vendor = join(prefix, 'node_modules/owner-vendor')
    mkdirSync(join(app, 'node_modules/@molecule'), { recursive: true })
    mkdirSync(pkg, { recursive: true })
    mkdirSync(vendor, { recursive: true })
    writeFileSync(join(app, 'package.json'), JSON.stringify({ name: 'app', private: true }))
    writeFileSync(
      join(prefix, 'package.json'),
      JSON.stringify({ name: 'source', workspaces: ['packages/*'] }),
    )
    writeFileSync(
      join(pkg, 'package.json'),
      JSON.stringify({
        name: '@molecule/example',
        type: 'module',
        exports: './index.js',
        dependencies: { 'owner-vendor': '1.0.0' },
        molecule: { viteOptimizeInclude: ['owner-vendor'] },
      }),
    )
    writeFileSync(join(pkg, 'index.js'), "export { value } from 'owner-vendor'\n")
    writeFileSync(
      join(vendor, 'package.json'),
      JSON.stringify({ name: 'owner-vendor', type: 'module', exports: './index.js' }),
    )
    writeFileSync(join(vendor, 'index.js'), "export const value = 'source-owner'\n")
    symlinkSync(pkg, join(app, 'node_modules/@molecule/example'))
    const entry = join(app, 'entry.js')
    writeFileSync(entry, "export { value } from '@molecule/example'\n")
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app)
    let config
    try {
      config = createFrameworkViteConfig(branding, { plugins: [] })
    } finally {
      cwd.mockRestore()
    }
    await expect(
      build({
        configFile: false,
        root: app,
        logLevel: 'silent',
        resolve: config.resolve,
        build: { write: false, lib: { entry, formats: ['es'], fileName: 'example' } },
      }),
    ).resolves.toBeDefined()
    expect(config.server?.fs?.allow).toContain(prefix)
    expect(config.optimizeDeps?.include).toContain('@molecule/example > owner-vendor')
  })

  it("puts the app's framework plugins first and adds the Molecule plugins after them", () => {
    const config = createFrameworkViteConfig(branding, {
      plugins: [{ name: 'vite:vue' }, { name: 'styling' }],
    })
    const list = names(config.plugins)
    expect(list.slice(0, 2)).toEqual(['vite:vue', 'styling'])
    expect(list).toEqual(
      expect.arrayContaining([
        'vite-plugin-pwa',
        'molecule:pwa-registration',
        'molecule:root-relative-assets',
        'molecule-dist-without-sourcemap',
      ]),
    )
    expect(list).not.toContain('molecule:sveltekit-static-site')
    // The registrar goes into Vite's HTML, which SvelteKit never asks for.
    expect(plugin(config.plugins, 'molecule:pwa-registration').transformIndexHtml).toBeDefined()
    expect(config.server?.warmup?.clientFiles).toEqual([
      'src/main.tsx',
      'src/App.tsx',
      'src/bonds/*.ts',
    ])
    expect(config.test?.environment).toBe('node')
    expect(config.preview?.headers).toEqual({ 'Origin-Agent-Cluster': '?1' })
  })

  it('leaves registration to the build: VitePWA never injects its own registrar', () => {
    const config = createFrameworkViteConfig(branding, { plugins: [] })
    const options = (plugin(config.plugins, 'vite-plugin-pwa') as unknown as { __options: object })
      .__options
    expect(options).toMatchObject({ registerType: 'prompt', injectRegister: false })
  })

  it.each([
    [{ VITE_API_URL: 'https://api.example.test/api', PORT: '4100' }, 'https://api.example.test'],
    [{ PORT: '4100' }, 'http://localhost:4100'],
    [{}, 'http://localhost:4000'],
  ])(
    'forwards the API to VITE_API_URL, else the PORT the API listens on, else 4000 (%o)',
    (env, target) => {
      vi.stubEnv('VITE_API_URL', '')
      vi.stubEnv('PORT', '')
      for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value)
      try {
        const config = createFrameworkViteConfig(branding, { plugins: [] })
        const proxy = config.server?.proxy as Record<string, { target: string }>
        expect(Object.keys(proxy)).toEqual(['/api', '/health', '/socket.io'])
        for (const route of Object.values(proxy)) expect(route.target).toBe(target)
        expect(config.preview?.proxy).toBe(proxy)
      } finally {
        vi.unstubAllEnvs()
      }
    },
  )

  it("names the app's own warmup files", () => {
    const config = createFrameworkViteConfig(branding, {
      plugins: [],
      warmup: ['src/main.ts', 'src/App.vue'],
    })
    expect(config.server?.warmup?.clientFiles).toEqual(['src/main.ts', 'src/App.vue'])
  })

  it('builds a SvelteKit app through the site its adapter writes', () => {
    const transformPage = (html: string): string => html
    const config = createFrameworkViteConfig(branding, {
      plugins: [{ name: 'vite-plugin-sveltekit' }],
      svelteKit: { transformPage },
    })
    expect(names(config.plugins)).toContain('molecule:sveltekit-static-site')
    const registration = plugin(config.plugins, 'molecule:pwa-registration')
    expect(registration.transformIndexHtml).toBeUndefined()
    expect(registration.transform).toBeDefined()
  })

  it("runs the vitest setup each of the app's declared bindings names, and no other", () => {
    const workspace = join(root, 'setup-workspace')
    const app = join(workspace, 'app')
    const installed = (dir: string, name: string, molecule?: object): void => {
      mkdirSync(join(dir, 'node_modules', name), { recursive: true })
      writeFileSync(
        join(dir, 'node_modules', name, 'package.json'),
        JSON.stringify({ name, ...(molecule ? { molecule } : {}) }),
      )
    }
    // The binding is hoisted to the workspace; the app's own node_modules holds another package.
    installed(workspace, '@molecule/app-vue', {
      vitestSetupFiles: ['@molecule/app-vue/testing/setup'],
    })
    installed(workspace, '@molecule/app-svelte', {
      vitestSetupFiles: ['@molecule/app-svelte/testing/setup'],
    })
    installed(app, '@molecule/app-notes')
    writeFileSync(
      join(app, 'package.json'),
      JSON.stringify({
        name: 'app',
        dependencies: { '@molecule/app-notes': '1.0.0', '@molecule/app-vue': '3.12.0' },
        devDependencies: { '@molecule/app-vue': '3.12.0' },
      }),
    )
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app)
    try {
      expect(createFrameworkViteConfig(branding, { plugins: [] }).test?.setupFiles).toEqual([
        '@molecule/app-vue/testing/setup',
      ])
      // A React app in the same workspace gets none.
      writeFileSync(
        join(app, 'package.json'),
        JSON.stringify({ name: 'app', dependencies: { '@molecule/app-notes': '1.0.0' } }),
      )
      expect(createFrameworkViteConfig(branding, { plugins: [] }).test).not.toHaveProperty(
        'setupFiles',
      )
    } finally {
      cwd.mockRestore()
    }
  })

  it('refuses a vitestSetupFiles that is not a list of specifiers', () => {
    const app = join(root, 'setup-bad', 'app')
    mkdirSync(join(app, 'node_modules', '@molecule', 'app-vue'), { recursive: true })
    writeFileSync(
      join(app, 'node_modules', '@molecule', 'app-vue', 'package.json'),
      JSON.stringify({ name: '@molecule/app-vue', molecule: { vitestSetupFiles: 'setup.js' } }),
    )
    writeFileSync(
      join(app, 'package.json'),
      JSON.stringify({ name: 'app', dependencies: { '@molecule/app-vue': '3.12.0' } }),
    )
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app)
    try {
      expect(() => createFrameworkViteConfig(branding, { plugins: [] })).toThrow(
        "@molecule/app-vue's package.json molecule.vitestSetupFiles must be a list",
      )
    } finally {
      cwd.mockRestore()
    }
  })

  it('walks past an empty node_modules/@molecule to the one the packages are in', () => {
    const app = join(root, 'workspace', 'app')
    mkdirSync(join(app, 'node_modules', '@molecule'), { recursive: true })
    const hoisted = join(root, 'workspace', 'node_modules', '@molecule', 'app-notes')
    mkdirSync(hoisted, { recursive: true })
    writeFileSync(join(hoisted, 'package.json'), '{"name":"@molecule/app-notes"}')
    writeFileSync(join(app, 'package.json'), '{"name":"app"}')
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app)
    try {
      const config = createFrameworkViteConfig(branding, { plugins: [] })
      expect(config.optimizeDeps?.exclude).toContain('@molecule/app-notes')
      expect(config.resolve?.dedupe).toContain('@molecule/app-notes')
    } finally {
      cwd.mockRestore()
    }
  })
})
