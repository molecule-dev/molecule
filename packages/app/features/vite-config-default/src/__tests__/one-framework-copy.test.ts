/**
 * A test run of an app loads one copy of each framework runtime, whichever install path a
 * `@molecule` package reaches it through. Before, vitest left `@molecule` packages external:
 * Node loaded each from its real path and took the framework from whatever `node_modules` sat
 * beside it, so a linked package with its own copy (a workspace's nested install) read another
 * React's hook dispatcher ("Invalid hook call"); in the workspace 10 of 150 template suites
 * failed that way on 2026-11-22. And only React's packages were deduped, so the same held for
 * Vue, Svelte, Solid and Angular once a package was inlined.
 *
 * Each case runs a real vitest in a fixture app whose linked `@molecule/fixture-lib` carries its
 * own physical copy of React and of a stand-in for each other deduped runtime (one module-level
 * object, the state two copies split).
 *
 * @module
 */
import { spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import type { UserConfig } from 'vite'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.mock('vite-plugin-pwa', () => ({ VitePWA: () => ({ name: 'pwa' }) }))

import { createFrameworkViteConfig } from '../framework-config.js'

const require = createRequire(import.meta.url)
const VITEST = join(dirname(require.resolve('vitest/package.json')), 'vitest.mjs')
const REACT_NAMES = ['react', 'react-dom', 'react-router', 'react-router-dom']

let root: string
beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'one-framework-copy-'))
})
afterAll(() => {
  rmSync(root, { recursive: true, force: true })
})

const write = (path: string, text: string): void => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/** A stand-in runtime: one module-level object, which two copies would hold twice. */
const standIn = (dir: string, name: string): void => {
  write(
    join(dir, name, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', type: 'module', exports: './index.js' }),
  )
  write(join(dir, name, 'index.js'), 'export const state = {}\n')
}

/**
 * The fixture: `app/` installs React and every stand-in, and reaches `@molecule/fixture-lib`
 * through a link to `lib/`, which holds its own copies unless `oneCopy` is set.
 *
 * @param name - The fixture directory.
 * @param runtimes - The stand-in runtime names.
 * @param oneCopy - Whether the library uses the app's copies (no copies of its own).
 * @returns The app directory.
 */
const fixture = (name: string, runtimes: string[], oneCopy = false): string => {
  const app = join(root, name, 'app')
  const lib = join(root, name, 'lib')
  const react = realpathSync(dirname(require.resolve('react/package.json')))
  const reactDom = realpathSync(dirname(require.resolve('react-dom/package.json')))
  write(join(app, 'package.json'), JSON.stringify({ name: 'fixture-app', type: 'module' }))
  mkdirSync(join(app, 'node_modules', '@molecule'), { recursive: true })
  symlinkSync(react, join(app, 'node_modules', 'react'), 'dir')
  symlinkSync(reactDom, join(app, 'node_modules', 'react-dom'), 'dir')
  for (const runtime of runtimes) standIn(join(app, 'node_modules'), runtime)
  symlinkSync(lib, join(app, 'node_modules', '@molecule', 'fixture-lib'), 'dir')
  write(
    join(lib, 'package.json'),
    JSON.stringify({
      name: '@molecule/fixture-lib',
      version: '1.0.0',
      type: 'module',
      exports: './index.js',
    }),
  )
  write(
    join(lib, 'index.js'),
    [
      "import { useState } from 'react'",
      ...runtimes.map((runtime, i) => `import * as r${i} from '${runtime}'`),
      'export const useCount = () => useState(1)[0]',
      `export const runtimes = { ${runtimes.map((runtime, i) => `'${runtime}': r${i}`).join(', ')} }`,
      '',
    ].join('\n'),
  )
  if (!oneCopy) {
    cpSync(react, join(lib, 'node_modules', 'react'), { recursive: true })
    for (const runtime of runtimes) standIn(join(lib, 'node_modules'), runtime)
  }
  write(
    join(app, 'copies.test.mjs'),
    [
      "import { createElement } from 'react'",
      "import { renderToString } from 'react-dom/server'",
      "import { runtimes, useCount } from '@molecule/fixture-lib'",
      ...runtimes.map((runtime, i) => `import * as app${i} from '${runtime}'`),
      "it('react', () => {",
      "  expect(renderToString(createElement(() => createElement('p', null, String(useCount()))))).toBe('<p>1</p>')",
      '})',
      ...runtimes.map(
        (runtime, i) =>
          `it('${runtime}', () => expect(runtimes['${runtime}'].state).toBe(app${i}.state))`,
      ),
      '',
    ].join('\n'),
  )
  return app
}

/** The config's resolve and test blocks, which are all a test run of this fixture reads. */
const configFor = (app: string): UserConfig => {
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(app)
  try {
    const config = createFrameworkViteConfig(
      { APP_NAME: 'Copies', APP_DESCRIPTION: 'Copies', BRAND_COLOR: '#335577' },
      { plugins: [] },
    )
    return { resolve: config.resolve, test: config.test } as UserConfig
  } finally {
    cwd.mockRestore()
  }
}

/** The runtimes the config dedupes beyond React's packages and the app's `@molecule` packages. */
const standInNames = (config: UserConfig): string[] =>
  (config.resolve?.dedupe ?? []).filter(
    (name) => !REACT_NAMES.includes(name) && !name.startsWith('@molecule/'),
  )

/**
 * Runs vitest in the fixture app under the given resolve and test blocks.
 *
 * @returns Each test's name and whether it passed, the failure messages and the run's output.
 */
const run = (
  app: string,
  { resolve, test }: { resolve: UserConfig['resolve']; test: Record<string, unknown> },
): { results: Record<string, boolean>; failures: string; output: string } => {
  const inline = (
    (test.server as { deps?: { inline?: RegExp[] } } | undefined)?.deps?.inline ?? []
  ).map(
    (pattern) => `new RegExp(${JSON.stringify(pattern.source)}, ${JSON.stringify(pattern.flags)})`,
  )
  write(
    join(app, 'vitest.config.mjs'),
    `export default {
  cacheDir: ${JSON.stringify(join(app, '.vite'))},
  resolve: ${JSON.stringify(resolve)},
  test: { environment: 'node', globals: true, include: ['copies.test.mjs'], server: { deps: { inline: [${inline.join(', ')}] } } },
}
`,
  )
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')),
  )
  const report = join(app, 'report.json')
  const child = spawnSync(
    process.execPath,
    [
      VITEST,
      'run',
      '--root',
      app,
      '--config',
      join(app, 'vitest.config.mjs'),
      '--reporter=json',
      '--maxWorkers=2',
      `--outputFile=${report}`,
    ],
    { cwd: app, encoding: 'utf8', env, timeout: 60_000 },
  )
  const output = `${child.stdout}\n${child.stderr}`
  const json = JSON.parse(readFileSync(report, 'utf8')) as {
    testResults: {
      assertionResults: { title: string; status: string; failureMessages: string[] }[]
    }[]
  }
  const tests = json.testResults.flatMap((file) => file.assertionResults)
  const results = Object.fromEntries(tests.map((test) => [test.title, test.status === 'passed']))
  const failures = tests.flatMap((test) => test.failureMessages).join('\n')
  return { results, failures, output }
}

const allPass = (results: Record<string, boolean>): string[] =>
  Object.entries(results)
    .filter(([, passed]) => !passed)
    .map(([name]) => name)

// Each case starts a vitest of its own (1-3 s); the limit leaves room for a loaded runner.
describe('one framework copy in a test run', { timeout: 60_000 }, () => {
  it('loads one copy of React and of each deduped runtime through a linked package with its own copies', () => {
    const probe = configFor(fixture('probe', []))
    const runtimes = standInNames(probe)
    expect(runtimes).toEqual(expect.arrayContaining(['vue', 'svelte', 'solid-js', '@angular/core']))
    const app = fixture('fixed', runtimes)
    const config = configFor(app)
    const { results, output } = run(app, {
      resolve: config.resolve,
      test: config.test as Record<string, unknown>,
    })
    expect(Object.keys(results)).toHaveLength(runtimes.length + 1)
    expect(allPass(results), output).toEqual([])
  })

  it('splits them under the previous config: React-only dedupe and @molecule packages left external (the recorded failure)', () => {
    const probe = configFor(fixture('probe-old', []))
    const runtimes = standInNames(probe)
    const app = fixture('old', runtimes)
    const config = configFor(app)
    const dedupe = (config.resolve?.dedupe ?? []).filter((name) => !runtimes.includes(name))
    const { results, failures, output } = run(app, {
      resolve: { ...config.resolve, preserveSymlinks: true, dedupe },
      test: { environment: 'node' },
    })
    expect(results.react, output).toBe(false)
    // Another copy's dispatcher is null while this copy renders.
    expect(failures).toContain("reading 'useState'")
    for (const runtime of runtimes) expect(results[runtime], runtime).toBe(false)
  })

  it('still splits each runtime when packages are inlined but only React is deduped', () => {
    const probe = configFor(fixture('probe-inline', []))
    const runtimes = standInNames(probe)
    const app = fixture('inline-only', runtimes)
    const config = configFor(app)
    const dedupe = (config.resolve?.dedupe ?? []).filter((name) => !runtimes.includes(name))
    const { results } = run(app, {
      resolve: { ...config.resolve, dedupe },
      test: config.test as Record<string, unknown>,
    })
    expect(results.react).toBe(true)
    for (const runtime of runtimes) expect(results[runtime], runtime).toBe(false)
  })

  it('counterexample: a linked package without copies of its own passes under the previous config too', () => {
    const probe = configFor(fixture('probe-one', []))
    const runtimes = standInNames(probe)
    const app = fixture('one-copy', runtimes, true)
    const config = configFor(app)
    const dedupe = (config.resolve?.dedupe ?? []).filter((name) => !runtimes.includes(name))
    const { results, output } = run(app, {
      resolve: { ...config.resolve, preserveSymlinks: true, dedupe },
      test: { environment: 'node' },
    })
    expect(allPass(results), output).toEqual([])
  })
})
