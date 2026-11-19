// @vitest-environment jsdom
/**
 * Verifies the BUILT package: imports `dist/index.js` (the tree
 * `svelte-package` emits — every `.svelte` source with its generated
 * `.svelte.d.ts`, plus the compiled JS and declarations of every `.ts`) and
 * mounts a component from it with Svelte's real runtime, so a consumer
 * resolving this package through its `exports` map gets a working component.
 *
 * Run `npm run build` in this package before `npm test`: dist/ is a build
 * artifact (gitignored), and this test fails with instructions when it is
 * missing rather than silently passing on an unbuilt tree.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

// Bonds the reference ClassMap, icon set and i18n provider — the same side
// effects the conformance suite mounts components under.
import '@molecule/app-framework-conformance/ui/setup'
import { describe, expect, it } from 'vitest'

/**
 * This package's directory, from the test file's own path. The repository's
 * CI runs every package's tests from the repository root, so the working
 * directory is not this package there.
 *
 * @returns The absolute path of packages/app/frameworks/svelte-ui.
 */
const packageRoot = (): string => {
  const { testPath } = expect.getState()
  if (!testPath) throw Error('vitest did not report the path of this test file')
  return resolve(dirname(testPath), '..', '..')
}

describe('built dist package', () => {
  // Importing dist/index.js compiles every component in the package's Svelte
  // source graph, which takes ~20 s on an idle machine and more on this shared
  // checkout, so this test needs headroom over vitest.config.ts's 30 s default.
  it('exports a mountable component', { timeout: 180_000 }, async () => {
    // import.meta.url is not a usable base under vitest's jsdom environment.
    const distIndex = resolve(packageRoot(), 'dist/index.js')
    expect(
      existsSync(distIndex),
      `${distIndex} is missing — run \`npm run build\` in packages/app/frameworks/svelte-ui before \`npm test\``,
    ).toBe(true)

    const { mount, unmount } = await import('svelte')
    const { ResponsiveAppShellContent } = await import(distIndex)

    const host = document.createElement('div')
    document.body.appendChild(host)
    const instance = mount(ResponsiveAppShellContent, {
      target: host,
      props: {},
    })
    const main = host.querySelector('main[data-mol-id="shell-content"]')
    expect(main).toBeInstanceOf(HTMLElement)
    expect(main?.getAttribute('data-mol-id')).toBe('shell-content')
    await unmount(instance)
    host.remove()
  })
})

describe('published package', () => {
  // `npm pack` starts from the working directory: inside this monorepo it first
  // loads the whole workspace graph (hundreds of members) for ~100 s before it
  // looks at the package, so run it from the OS temp dir and pass the package
  // path instead. The file list it reports is the same.
  it(
    'ships every component with its generated declarations, and no tests',
    { timeout: 300_000 },
    () => {
      // svelte-package copies all of src/ into dist/, tests included; package.json's negated
      // `files` entries are what keep them out of the tarball a consumer installs.
      const [pack] = JSON.parse(
        execFileSync('npm', ['pack', packageRoot(), '--dry-run', '--json', '--ignore-scripts'], {
          cwd: tmpdir(),
          encoding: 'utf8',
        }),
      ) as [{ files: { path: string }[] }]
      const files = pack.files.map((file) => file.path)
      const components = files.filter((path) => path.endsWith('.svelte'))
      expect(components.length).toBeGreaterThan(60)
      for (const component of components) expect(files).toContain(`${component}.d.ts`)
      expect(files.filter((path) => /__tests__|\.(test|spec)\./.test(path))).toEqual([])
    },
  )
})
