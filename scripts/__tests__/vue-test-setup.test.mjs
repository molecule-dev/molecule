/**
 * Every package whose tests can render Vue loads `@molecule/app-vue/testing/setup`.
 *
 * Without it a test's event can land in the millisecond its component rendered in, and Vue skips
 * a listener attached then: a test whose container and item both listen passes in one run and
 * fails in the next (app-ui-vue's Dropdown roving test failed 3 of 5 runs in a 57-project group).
 * The setup also fails a test when a component fires an event into a listener mounted in the
 * same task. It only works where a config lists it, so this test reads every package that
 * depends on `vue` and names each config that does not.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SETUP = '@molecule/app-vue/testing/setup'
const OWN_SETUP = './src/testing/setup.ts'
const CONFIGS = ['vitest.config.ts', 'vitest.config.mts', 'vitest.config.js', 'vitest.config.mjs']

/**
 * The Vue packages under `packages/` whose vitest config does not load the Vue test setup.
 *
 * @param root - Repository root.
 * @returns One `{ dir, reason }` entry per package, sorted by directory.
 */
function vueTestSetupGaps(root) {
  const gaps = []
  const walk = (dir) => {
    const manifest = path.join(dir, 'package.json')
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
      const all = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }
      if ('vue' in all) {
        const rel = path.relative(root, dir)
        const spec = pkg.name === '@molecule/app-vue' ? OWN_SETUP : SETUP
        const config = CONFIGS.find((name) => fs.existsSync(path.join(dir, name)))
        if (!config)
          gaps.push({
            dir: rel,
            reason: `has no vitest config; add one whose test.setupFiles lists '${spec}'`,
          })
        else {
          const source = fs.readFileSync(path.join(dir, config), 'utf8')
          if (!/setupFiles/.test(source) || !source.includes(`'${spec}'`))
            gaps.push({ dir: rel, reason: `${config}: add '${spec}' to test.setupFiles` })
        }
      }
    }
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        !entry.isDirectory() ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name.startsWith('.')
      )
        continue
      walk(path.join(dir, entry.name))
    }
  }
  walk(path.join(root, 'packages'))
  return gaps.sort((a, b) => a.dir.localeCompare(b.dir))
}

const fixtures = []
afterEach(() => {
  for (const dir of fixtures.splice(0)) fs.rmSync(dir, { recursive: true, force: true })
})

/**
 * Writes a fixture repository with the given packages.
 *
 * @param packages - Per package directory, its `pkg` (package.json) and optional vitest `config` source.
 * @returns The fixture root.
 */
function fixture(packages) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vue-test-setup-'))
  fixtures.push(root)
  for (const [dir, { pkg, config }] of Object.entries(packages)) {
    fs.mkdirSync(path.join(root, dir), { recursive: true })
    fs.writeFileSync(path.join(root, dir, 'package.json'), JSON.stringify(pkg))
    if (config !== undefined) fs.writeFileSync(path.join(root, dir, 'vitest.config.ts'), config)
  }
  return root
}

const config = (setupFiles) =>
  `import { defineConfig } from 'vitest/config'\nexport default defineConfig({ test: { ${setupFiles ? `setupFiles: ['${setupFiles}'], ` : ''}globals: true } })\n`

describe('the Vue test setup', () => {
  it('is loaded by every package in this repository that depends on vue', () => {
    expect(vueTestSetupGaps(ROOT)).toEqual([])
  })

  it('names a Vue package whose config lacks it, and leaves the others alone', () => {
    const root = fixture({
      'packages/app/features/card-vue': {
        pkg: { name: '@molecule/app-card-vue', peerDependencies: { vue: '^3.4.0' } },
        config: config(),
      },
      'packages/app/features/list-vue': {
        pkg: { name: '@molecule/app-list-vue', devDependencies: { vue: '3.5.44' } },
        config: config(SETUP),
      },
      'packages/app/features/menu-vue': {
        pkg: { name: '@molecule/app-menu-vue', dependencies: { vue: '3.5.44' } },
      },
      'packages/app/frameworks/vue': {
        pkg: { name: '@molecule/app-vue', devDependencies: { vue: '3.5.44' } },
        config: config(OWN_SETUP),
      },
      'packages/app/features/card-react': {
        pkg: { name: '@molecule/app-card-react', peerDependencies: { react: '^19.0.0' } },
        config: config(),
      },
    })
    expect(vueTestSetupGaps(root)).toEqual([
      {
        dir: 'packages/app/features/card-vue',
        reason: `vitest.config.ts: add '${SETUP}' to test.setupFiles`,
      },
      {
        dir: 'packages/app/features/menu-vue',
        reason: `has no vitest config; add one whose test.setupFiles lists '${SETUP}'`,
      },
    ])
  })
})
