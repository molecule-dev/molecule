import { execFileSync } from 'node:child_process'
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
import process from 'node:process'
import { URL } from 'node:url'

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

  it.each([
    'packages/leaf/README.md',
    'packages/leaf/CHANGELOG.md',
    'scripts/__tests__/unrelated.test.mjs',
    'scripts/generate-readmes.mjs',
  ])('reuses unchanged compiler outputs after only %s changes', (file) => {
    const { root, write } = fixture()
    mkdirSync(dirname(join(root, file)), { recursive: true })
    write(file, '// New documentation or independent meta tooling\n')
    expect(distCache(root, 'apply')).toEqual({ fresh: 3, rebuild: 0 })
  })

  it.each(['src/README.md', 'template.html'])(
    'keeps source-tree documentation and arbitrary package assets (%s) in the proof',
    (file) => {
      const { root, write } = fixture()
      write(`packages/leaf/${file}`, 'Changed source asset\n')
      expect(distCache(root, 'apply')).toEqual({ fresh: 1, rebuild: 2 })
    },
  )

  it.each([
    "import './build-helper.mjs'\n",
    "const helper = './build-helper.mjs'; import(helper)\n",
    "import { createRequire } from 'node:module'; const load = createRequire(import.meta.url); load('./build-helper.mjs')\n",
  ])('refuses changed required builder helpers (%s)', (builder) => {
    const { root, write } = fixture()
    write('scripts/build.js', builder)
    write('scripts/build-helper.mjs', 'export const target = "ES2022"\n')
    expect(distCache(root, 'write')).toEqual({ written: 3 })
    write('scripts/build-helper.mjs', 'export const target = "ES2023"\n')
    expect(distCache(root, 'apply')).toEqual({ fresh: 0, rebuild: 3 })
  })

  it('retains helper-owned assets even when declarations shadow runtime JavaScript', () => {
    const { root, write } = fixture()
    write('scripts/build.js', "import './build-helper.js'\n")
    write(
      'scripts/build-helper.js',
      "import { readFileSync } from 'node:fs'; readFileSync(new URL('./build-data.json', import.meta.url))\n",
    )
    write('scripts/build-helper.d.ts', 'export {}\n')
    write('scripts/build-data.json', '{"target":"ES2022"}')
    expect(distCache(root, 'write')).toEqual({ written: 3 })
    write('scripts/build-data.json', '{"target":"ES2023"}')
    expect(distCache(root, 'apply')).toEqual({ fresh: 0, rebuild: 3 })
  })

  it('the actual builder skips docs-only edits and recompiles a source change and its consumer', () => {
    const { root, write } = fixture()
    write('scripts/build.js', readFileSync(new URL('../build.js', import.meta.url), 'utf8'))
    write(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          types: [],
          declaration: true,
          skipLibCheck: true,
        },
      }),
    )
    for (const name of ['leaf', 'client', 'unrelated']) {
      write(
        `packages/${name}/tsconfig.json`,
        JSON.stringify({
          extends: '../../tsconfig.json',
          compilerOptions: { rootDir: 'src', outDir: 'dist' },
          include: ['src/**/*.ts'],
        }),
      )
      rmSync(join(root, `packages/${name}/dist`), { recursive: true })
    }
    const build = () =>
      execFileSync(process.execPath, ['scripts/build.js'], {
        cwd: root,
        encoding: 'utf8',
        timeout: 30000,
        env: { ...process.env, npm_config_offline: 'true', npm_config_yes: 'false' },
      })
    expect(build()).toContain('Done. 3 built, 0 skipped')
    expect(distCache(root, 'write')).toEqual({ written: 3 })
    write('packages/leaf/README.md', '# Updated booking API documentation\n')
    write('scripts/doc-check.mjs', 'console.log("Independent docs check")\n')
    expect(distCache(root, 'apply')).toEqual({ fresh: 3, rebuild: 0 })
    expect(build()).toContain('Done. 0 built, 3 skipped')
    write('packages/leaf/src/index.ts', 'export const value = 2\n')
    expect(distCache(root, 'apply')).toEqual({ fresh: 1, rebuild: 2 })
    expect(build()).toContain('Done. 2 built, 1 skipped')
    expect(readFileSync(join(root, 'packages/leaf/dist/index.js'), 'utf8')).toContain('value = 2')
  }, 30000)
})
