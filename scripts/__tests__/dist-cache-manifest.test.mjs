import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { distCache } from '../dist-cache-manifest.mjs'

const require = createRequire(import.meta.url)
const compilerFile = require.resolve('typescript/package.json')
const compiler = JSON.parse(readFileSync(compilerFile, 'utf8'))
const roots = []

/**
 * A three-package build graph with the actual installed compiler and declared consumer edge.
 */
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'mol-dist-proof-'))
  roots.push(root)
  const write = (file, value) => writeFileSync(join(root, file), value)
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, 'node_modules/.bin'), { recursive: true })
  symlinkSync(dirname(compilerFile), join(root, 'node_modules/typescript'), 'dir')
  symlinkSync(join(dirname(compilerFile), compiler.bin.tsc), join(root, 'node_modules/.bin/tsc'))
  const manifest = { name: 'cache-regression', private: true, workspaces: ['packages/*'] }
  write('package.json', JSON.stringify(manifest))
  write('.npmrc', 'legacy-peer-deps=true\n')
  write('scripts/build.js', '// Build input\n')
  write('tsconfig.json', '{"compilerOptions":{"target":"ES2022"}}')
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': manifest,
      'node_modules/typescript': { version: compiler.version, bin: compiler.bin },
    },
  }
  for (const name of ['leaf', 'client', 'unrelated']) {
    const dir = `packages/${name}`
    mkdirSync(join(root, dir, 'src'), { recursive: true })
    mkdirSync(join(root, dir, 'dist'))
    const pkg = {
      name: `@molecule/${name}`,
      version: '1.0.0',
      scripts: { build: 'tsc' },
      ...(name === 'client' ? { dependencies: { '@molecule/leaf': '1.0.0' } } : {}),
    }
    write(`${dir}/package.json`, JSON.stringify(pkg))
    write(`${dir}/tsconfig.json`, '{"extends":"../../tsconfig.json","include":["src/**/*.ts"]}')
    write(`${dir}/src/index.ts`, 'export const value = 1\n')
    write(`${dir}/dist/index.js`, 'export const value = 1\n')
    write(`${dir}/dist/index.d.ts`, 'export declare const value = 1\n')
    lock.packages[dir] = pkg
  }
  write('package-lock.json', JSON.stringify(lock))
  expect(distCache(root, 'write')).toEqual({ written: 3 })
  return { root, write, lock }
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('CI dist proof', () => {
  it('reuses unchanged outputs and rebuilds a changed package and its declared consumer', () => {
    const { root, write } = fixture()
    expect(distCache(root, 'apply')).toEqual({ fresh: 3, rebuild: 0 })
    write('packages/leaf/src/index.ts', 'export const value = 2\n')
    expect(distCache(root, 'apply')).toEqual({ fresh: 1, rebuild: 2 })
    expect(existsSync(join(root, 'packages/client/dist'))).toBe(false)
    expect(existsSync(join(root, 'packages/unrelated/dist'))).toBe(true)
  })

  it.each(['tsconfig.json', 'scripts/build.js', 'package-lock.json'])(
    'refuses restored output when global build input %s changes',
    (file) => {
      const { root, write, lock } = fixture()
      if (file === 'package-lock.json') {
        lock.packages['node_modules/typescript'].integrity = 'changed-resolution'
        write(file, JSON.stringify(lock))
      } else write(file, readFileSync(join(root, file), 'utf8') + '\n// changed\n')
      expect(distCache(root, 'apply')).toEqual({ fresh: 0, rebuild: 3 })
      expect(existsSync(join(root, 'packages/leaf/dist'))).toBe(false)
    },
  )

  it.each(['modified', 'missing', 'added'])('refuses %s output and its consumers', (kind) => {
    const { root, write } = fixture()
    if (kind === 'missing') rmSync(join(root, 'packages/leaf/dist/index.d.ts'))
    else write(`packages/leaf/dist/${kind === 'added' ? 'extra.js' : 'index.js'}`, 'changed\n')
    expect(distCache(root, 'apply')).toEqual({ fresh: 1, rebuild: 2 })
    expect(existsSync(join(root, 'packages/leaf/dist'))).toBe(false)
  })

  it('removes unverified restored output when the manifest is absent', () => {
    const { root } = fixture()
    rmSync(join(root, '.dist-manifest.json'))
    expect(distCache(root, 'apply')).toEqual({ fresh: 0, rebuild: 3 })
    expect(existsSync(join(root, 'packages/client/dist'))).toBe(false)
  })
})
