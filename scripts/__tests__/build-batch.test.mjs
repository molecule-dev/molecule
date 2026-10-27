import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { URL } from 'node:url'

import { afterEach, expect, it } from 'vitest'

import { distCache } from '../dist-cache-manifest.mjs'
const require = createRequire(import.meta.url)
const compilerFile = require.resolve('typescript/package.json')
const compiler = JSON.parse(fs.readFileSync(compilerFile))
const source = fs.readFileSync(
  process.env.MOL_BUILD_SOURCE || new URL('../build.js', import.meta.url),
  'utf8',
)
const roots = []
const write = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value))
}
/** Build a private native compiler graph with one declared consumer edge. */
function fixture() {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'molecule-build-batch-'))
  roots.push(root)
  const manifest = {
    name: 'batch-native-control',
    private: true,
    type: 'module',
    workspaces: ['packages/*'],
    devDependencies: { typescript: compiler.version },
  }
  write(root + '/package.json', manifest)
  write(root + '/.npmrc', 'legacy-peer-deps=true\n')
  write(root + '/scripts/build.js', source)
  write(root + '/tsconfig.json', {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      strict: true,
      skipLibCheck: true,
      types: [],
    },
  })
  fs.mkdirSync(root + '/node_modules/.bin', { recursive: true })
  fs.mkdirSync(root + '/node_modules/@molecule')
  fs.symlinkSync(path.dirname(compilerFile), root + '/node_modules/typescript', 'dir')
  fs.symlinkSync(
    path.join(path.dirname(compilerFile), compiler.bin.tsc),
    root + '/node_modules/.bin/tsc',
  )
  const lock = {
    lockfileVersion: 3,
    packages: {
      '': manifest,
      'node_modules/typescript': { version: compiler.version, bin: compiler.bin },
    },
  }
  for (const name of ['a', 'b', 'c']) {
    const pkg = {
      name: '@molecule/' + name,
      version: '1.0.0',
      type: 'module',
      types: 'dist/index.d.ts',
      scripts: { build: 'tsc' },
      ...(name === 'b' ? { dependencies: { '@molecule/a': '1.0.0' } } : {}),
    }
    write(root + '/packages/' + name + '/package.json', pkg)
    write(root + '/packages/' + name + '/tsconfig.json', {
      extends: '../../tsconfig.json',
      compilerOptions: { outDir: 'dist', rootDir: 'src' },
      include: ['src/**/*'],
    })
    write(
      root + '/packages/' + name + '/src/index.ts',
      name === 'b'
        ? "import { value } from '@molecule/a'; export const doubled = value * 2\n"
        : 'export const value = 2\n',
    )
    fs.symlinkSync(root + '/packages/' + name, root + '/node_modules/@molecule/' + name, 'dir')
    lock.packages['packages/' + name] = pkg
    lock.packages['node_modules/@molecule/' + name] = { link: true, resolved: 'packages/' + name }
  }
  write(root + '/package-lock.json', lock)
  write(
    root + '/trace.cjs',
    "require('fs').appendFileSync(process.env.MOL_TEST_BUILD_TRACE,JSON.stringify(process.argv.slice(1))+'\\n')",
  )
  return root
}
/** Execute the actual dispatcher with bounded native child commands. */
function run(root, args = []) {
  fs.rmSync(root + '/trace.jsonl', { force: true })
  const result = spawnSync(process.execPath, ['scripts/build.js', ...args], {
    cwd: root,
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 4e6,
    env: {
      ...process.env,
      npm_config_offline: 'true',
      MOL_TEST_BUILD_TRACE: root + '/trace.jsonl',
      NODE_OPTIONS: '--require ' + root + '/trace.cjs',
    },
  })
  const trace = fs.existsSync(root + '/trace.jsonl')
    ? fs
        .readFileSync(root + '/trace.jsonl', 'utf8')
        .trim()
        .split('\n')
        .map(JSON.parse)
    : []
  return { ...result, trace, tsc: trace.filter((a) => path.basename(a[0]) === 'tsc') }
}
/** Read only the fixture runtime outputs for exact parity. */
function outputs(root) {
  const result = {}
  for (const name of ['a', 'b', 'c']) {
    const dir = root + '/packages/' + name + '/dist'
    if (fs.existsSync(dir))
      for (const f of fs.readdirSync(dir))
        result[name + '/' + f] = fs.readFileSync(dir + '/' + f, 'utf8')
  }
  return result
}
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})
it('batches independent scheduled tsc projects but builds their consumer afterward', () => {
  const root = fixture()
  const r = run(root)
  expect(r.status, r.stdout + r.stderr).toBe(0)
  expect(r.tsc).toHaveLength(2)
  expect(r.tsc[0]).toEqual(expect.arrayContaining(['-b', '--force', '--incremental', 'false']))
  expect(r.tsc[0]).not.toContain('--noCheck')
  expect(r.tsc[0].join(' ')).not.toContain('/b/tsconfig')
  expect(r.tsc[1]).not.toContain('-b')
  expect(fs.existsSync(root + '/packages/b/dist/index.d.ts')).toBe(true)
  for (const n of ['a', 'b', 'c'])
    expect(fs.existsSync(root + '/packages/' + n + '/tsconfig.tsbuildinfo')).toBe(false)
}, 30_000)
it('preserves the single-package command and --only dependency closure', () => {
  const root = fixture()
  let r = run(root, ['--only=@molecule/c'])
  expect(r.status).toBe(0)
  expect(r.tsc).toHaveLength(1)
  expect(r.tsc[0]).not.toContain('-b')
  expect(fs.existsSync(root + '/packages/a/dist')).toBe(false)
  r = run(root, ['--only=@molecule/b'])
  expect(r.status).toBe(0)
  expect(fs.existsSync(root + '/packages/a/dist/index.d.ts')).toBe(true)
  expect(fs.existsSync(root + '/packages/b/dist/index.d.ts')).toBe(true)
}, 30_000)
it('never runs a dependent level after a compiler error and cleans newly-owned state', () => {
  const root = fixture()
  write(root + '/packages/a/src/index.ts', 'export const value: string = 42\n')
  const r = run(root)
  expect(r.status).not.toBe(0)
  expect(r.stdout + r.stderr).toContain('TS2322')
  expect(fs.existsSync(root + '/packages/b/dist')).toBe(false)
  for (const n of ['a', 'c'])
    expect(fs.existsSync(root + '/packages/' + n + '/tsconfig.tsbuildinfo')).toBe(false)
}, 30_000)
it('keeps ngc as a distinct package command', () => {
  const root = fixture()
  write(root + '/packages/ng/package.json', {
    name: '@molecule/ng',
    version: '1.0.0',
    scripts: { build: 'ngc' },
  })
  write(root + '/packages/ng/src/index.ts', 'export const native = true\n')
  write(root + '/packages/ng/tsconfig.json', {
    extends: '../../tsconfig.json',
    compilerOptions: { outDir: 'dist', rootDir: 'src' },
    include: ['src/**/*'],
  })
  write(
    root + '/node_modules/.bin/ngc',
    "#!/usr/bin/env node\nrequire('fs').mkdirSync('dist',{recursive:true});require('fs').writeFileSync('dist/angular-marker','generated-by-ngc')\n",
  )
  fs.chmodSync(root + '/node_modules/.bin/ngc', 0o755)
  const r = run(root)
  expect(r.status, r.stdout + r.stderr).toBe(0)
  expect(fs.readFileSync(root + '/packages/ng/dist/angular-marker', 'utf8')).toBe(
    'generated-by-ngc',
  )
  expect(r.trace.some((a) => path.basename(a[0]) === 'ngc')).toBe(true)
}, 30_000)
it('does not change local compiler selection or delete preexisting build state', () => {
  const root = fixture()
  fs.mkdirSync(root + '/packages/a/node_modules/.bin', { recursive: true })
  fs.symlinkSync(
    path.join(path.dirname(compilerFile), compiler.bin.tsc),
    root + '/packages/a/node_modules/.bin/tsc',
  )
  write(root + '/packages/c/tsconfig.tsbuildinfo', 'PREEXISTING')
  const r = run(root)
  expect(r.status, r.stdout + r.stderr).toBe(0)
  expect(r.tsc.every((a) => !a.includes('-b'))).toBe(true)
  expect(fs.readFileSync(root + '/packages/c/tsconfig.tsbuildinfo', 'utf8')).toBe('PREEXISTING')
}, 30_000)
it('re-emits deleted/tampered output after the existing exact CI cache proof rejects it', () => {
  const root = fixture()
  expect(run(root).status).toBe(0)
  const before = outputs(root)
  distCache(root, 'write')
  fs.rmSync(root + '/packages/a/dist/index.d.ts')
  write(root + '/packages/c/dist/index.js', 'STALE')
  expect(distCache(root, 'apply')).toEqual({ fresh: 0, rebuild: 3 })
  const r = run(root)
  expect(r.status, r.stdout + r.stderr).toBe(0)
  expect(r.tsc.some((a) => a.includes('-b'))).toBe(true)
  expect(outputs(root)).toEqual(before)
}, 30_000)

it('preserves nominal peer identity errors after a metadata-only workspace version wave', () => {
  const root = fixture()
  write(
    root + '/packages/a/src/index.ts',
    'export class InventoryRecord { private brand!: symbol }\n',
  )
  write(
    root + '/packages/b/src/index.ts',
    "import {InventoryRecord} from '@molecule/a';import {accept} from 'inventory-vendor';accept(new InventoryRecord());\n",
  )
  const b = JSON.parse(fs.readFileSync(root + '/packages/b/package.json'))
  b.dependencies['inventory-vendor'] = '1.0.0'
  write(root + '/packages/b/package.json', b)
  write(root + '/node_modules/inventory-vendor/package.json', {
    name: 'inventory-vendor',
    version: '1.0.0',
    type: 'module',
    types: 'index.d.ts',
  })
  write(
    root + '/node_modules/inventory-vendor/index.d.ts',
    "import {InventoryRecord} from '@molecule/a';export declare function accept(value:InventoryRecord):void;\n",
  )
  write(root + '/node_modules/inventory-vendor/node_modules/@molecule/a/package.json', {
    name: '@molecule/a',
    version: '1.0.0',
    type: 'module',
    types: 'dist/index.d.ts',
  })
  write(
    root + '/node_modules/inventory-vendor/node_modules/@molecule/a/dist/index.d.ts',
    'export declare class InventoryRecord { private brand; }\n',
  )
  const lock = JSON.parse(fs.readFileSync(root + '/package-lock.json'))
  lock.packages['packages/b'] = b
  lock.packages['node_modules/inventory-vendor'] = { version: '1.0.0' }
  lock.packages['node_modules/inventory-vendor/node_modules/@molecule/a'] = { version: '1.0.0' }
  write(root + '/package-lock.json', lock)
  const before = run(root)
  expect(before.status, before.stdout + before.stderr).toBe(0)
  distCache(root, 'write')
  for (const n of ['a', 'b', 'c']) {
    const file = root + '/packages/' + n + '/package.json'
    const pkg = JSON.parse(fs.readFileSync(file))
    pkg.version = '1.0.1'
    if (n === 'b') pkg.dependencies['@molecule/a'] = '1.0.1'
    write(file, pkg)
    lock.packages['packages/' + n] = pkg
  }
  write(root + '/package-lock.json', lock)
  expect(distCache(root, 'apply')).toEqual({ fresh: 0, rebuild: 3 })
  const changed = run(root)
  expect(changed.status).not.toBe(0)
  expect(changed.tsc.some((a) => a.includes('-b'))).toBe(true)
  expect(changed.stdout + changed.stderr).toContain('TS2345')
}, 30_000)

it('preserves an existing dangling metadata symlink and its foreign target', () => {
  const root = fixture()
  const info = root + '/packages/a/tsconfig.tsbuildinfo'
  const foreign = root + '/foreign-owned.tsbuildinfo'
  fs.symlinkSync(foreign, info)
  const result = run(root)
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect({
    symlink: fs.lstatSync(info, { throwIfNoEntry: false })?.isSymbolicLink() ?? false,
    foreignExists: fs.existsSync(foreign),
  }).toEqual({ symlink: true, foreignExists: false })
  expect(fs.readlinkSync(info)).toBe(foreign)
}, 30_000)

it('retains native project-reference and composite metadata ownership', () => {
  const root = fixture()
  const configA = JSON.parse(fs.readFileSync(root + '/packages/a/tsconfig.json'))
  const configC = JSON.parse(fs.readFileSync(root + '/packages/c/tsconfig.json'))
  configA.references = [{ path: '../c' }]
  configC.compilerOptions.composite = true
  write(root + '/packages/a/tsconfig.json', configA)
  write(root + '/packages/c/tsconfig.json', configC)
  const result = run(root)
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.tsc.every((args) => !args.includes('-b'))).toBe(true)
  expect(fs.existsSync(root + '/packages/c/tsconfig.tsbuildinfo')).toBe(true)
}, 30_000)

it('keeps an independently configured root compiler command and its package cwd', () => {
  const root = fixture()
  const bin = root + '/node_modules/.bin/tsc'
  const realCompiler = path.join(path.dirname(compilerFile), compiler.bin.tsc)
  fs.unlinkSync(bin)
  write(
    bin,
    '#!/usr/bin/env node\n' +
      "require('fs').appendFileSync(" +
      JSON.stringify(root + '/compiler-cwds.jsonl') +
      ", JSON.stringify(process.cwd())+'\\n')\n" +
      "const result=require('child_process').spawnSync(process.execPath,[" +
      JSON.stringify(realCompiler) +
      ",...process.argv.slice(2)],{stdio:'inherit'});process.exit(result.status??1)\n",
  )
  fs.chmodSync(bin, 0o755)
  const result = run(root)
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.tsc.every((args) => !args.includes('-b'))).toBe(true)
  expect(
    fs
      .readFileSync(root + '/compiler-cwds.jsonl', 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse)
      .sort(),
  ).toEqual(['a', 'b', 'c'].map((name) => root + '/packages/' + name))
}, 30_000)
