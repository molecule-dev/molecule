/**
 * No cases file changes a global when it loads.
 *
 * A pin written at import (`Math.random = …`, `Object.defineProperty(crypto, 'randomUUID', …)`,
 * a DOM prototype patch) lasts for the whole test file: in a full recording every cases file
 * is loaded at once, so which pin wins, and what every other feature's cases see, depends on
 * the order the files finish loading (2026-11-19: `map-drawing`'s uuid counter and
 * `whiteboard-canvas`'s constant raced, and 17 whiteboard cases failed only in the full run).
 * The kit installs these values for each case instead (`installCaseGlobals`,
 * `installRandomSources`, `installDomGaps`).
 *
 * @module
 */

import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'

import '../ui/setup.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { changedGlobals, snapshotGlobals } from '../ui/global-snapshot.js'

const SRC = join(import.meta.dirname, '..')

/**
 * Every TypeScript file under a directory, recursively.
 *
 * @param dir - The directory.
 * @returns Absolute paths, sorted.
 */
const typeScriptFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? typeScriptFiles(join(dir, entry.name))
        : entry.name.endsWith('.ts')
          ? [join(dir, entry.name)]
          : [],
    )
    .sort()

/**
 * Loads one module and names every global it changed while loading.
 *
 * @param file - The module's absolute path.
 * @returns The changed globals (`Math.random`, `crypto.randomUUID`, …).
 */
const globalsChangedBy = async (file: string): Promise<string[]> => {
  const before = snapshotGlobals()
  await import(pathToFileURL(file).href)
  return changedGlobals(before, snapshotGlobals())
}

const CASE_FILES = ['features/cases', 'ui/cases', 'bindings/cases'].flatMap((dir) =>
  typeScriptFiles(join(SRC, dir)),
)

describe('cases files', () => {
  it('are found', () => {
    expect(CASE_FILES.length).toBeGreaterThan(100)
  })

  it('change no global while they load', async () => {
    const changed: string[] = []
    for (const file of CASE_FILES)
      for (const name of await globalsChangedBy(file))
        changed.push(`${relative(SRC, file)}: ${name}`)
    expect(changed).toEqual([])
  }, 300_000)
})

describe('the check', () => {
  // A directory of its own in the package's ignored node_modules: the test runner loads modules only
  // from inside the package. Not under node_modules/.cache: the release's committed-tree export links
  // that directory to the live checkout, whose real path Vite will not load from (2026-11-20: every
  // case here failed there with "Cannot find module"). Made in beforeAll, not while the suite is
  // collected: a run that filters these tests out runs neither hook, so it leaves nothing behind.
  const modules = join(import.meta.dirname, '../../node_modules')
  let dir = ''
  beforeAll(() => {
    mkdirSync(modules, { recursive: true })
    dir = mkdtempSync(join(modules, '.conformance-globals-'))
  })
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  /** Writes one module under the temp directory. */
  const fixture = (name: string, source: string): string => {
    const file = join(dir, `${name}.ts`)
    writeFileSync(file, source)
    return file
  }

  /** Runs `body`, then puts back one property of `target` as it was. */
  const keeping = async <T>(target: object, key: string, body: () => Promise<T>): Promise<T> => {
    const descriptor = Object.getOwnPropertyDescriptor(target, key)
    try {
      return await body()
    } finally {
      if (descriptor) Object.defineProperty(target, key, descriptor)
      else Reflect.deleteProperty(target, key)
    }
  }

  it('names a module that assigns Math.random', async () => {
    const file = fixture('random', 'Math.random = () => 0.5\nexport const cases = {}\n')
    await keeping(Math, 'random', async () => {
      expect(await globalsChangedBy(file)).toEqual(['Math.random'])
    })
  })

  it('names a module that defines crypto.randomUUID', async () => {
    const file = fixture(
      'uuid',
      "Object.defineProperty(globalThis.crypto, 'randomUUID', { configurable: true, writable: true, value: () => 'x' })\nexport const cases = {}\n",
    )
    await keeping(crypto, 'randomUUID', async () => {
      expect(await globalsChangedBy(file)).toContain('crypto.randomUUID')
    })
  })

  it('names a module that assigns crypto.getRandomValues', async () => {
    const file = fixture(
      'bytes',
      'globalThis.crypto.getRandomValues = (array) => array\nexport const cases = {}\n',
    )
    await keeping(crypto, 'getRandomValues', async () => {
      expect(await globalsChangedBy(file)).toContain('crypto.getRandomValues')
    })
  })

  it('names a module that patches a DOM prototype', async () => {
    const file = fixture(
      'canvas',
      'HTMLCanvasElement.prototype.getContext = () => null\nexport const cases = {}\n',
    )
    await keeping(HTMLCanvasElement.prototype, 'getContext', async () => {
      expect(await globalsChangedBy(file)).toEqual(['HTMLCanvasElement.prototype.getContext'])
    })
  })

  it('passes a module that only mocks modules and exports cases', async () => {
    const file = fixture(
      'mocks',
      "import { vi } from 'vitest'\nvi.mock('node:os', () => ({ platform: () => 'linux' }))\nexport const cases = { package: '@molecule/app-x-react', families: [] }\n",
    )
    expect(await globalsChangedBy(file)).toEqual([])
  })
})
