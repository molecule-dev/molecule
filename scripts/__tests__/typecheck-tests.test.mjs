/** The test-file type-check gate, run as CI runs it, over fixture packages it must judge. */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { afterAll, describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const scratch = path.resolve(ROOT, '../.experiments/typecheck-tests-tests')
fs.mkdirSync(scratch, { recursive: true })
const base = fs.mkdtempSync(path.join(scratch, 'run-'))
afterAll(() => fs.rmSync(base, { recursive: true, force: true }))

const STRICT = {
  strict: true,
  target: 'ES2022',
  module: 'NodeNext',
  moduleResolution: 'NodeNext',
  types: [],
}

/**
 * Writes a fixture package.
 *
 * @param name - Its directory name.
 * @param files - Paths under the package → contents.
 * @param [extra] - Compiler options and package scripts.
 * @returns The package directory.
 */
function pkg(name, files, extra = {}) {
  const dir = path.join(base, name)
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true })
    fs.writeFileSync(path.join(dir, file), text)
  }
  write('package.json', JSON.stringify({ name, type: 'module', scripts: extra.scripts ?? {} }))
  write(
    'tsconfig.json',
    JSON.stringify({
      compilerOptions: { ...(extra.options ?? STRICT), rootDir: 'src', outDir: 'dist' },
      include: ['src'],
      exclude: ['src/**/__tests__'],
    }),
  )
  for (const [file, text] of Object.entries(files)) write(file, text)
  return dir
}

/**
 * Runs the gate.
 *
 * @param dirs - Package directories.
 * @returns Exit status and output.
 */
function gate(...dirs) {
  const r = spawnSync(process.execPath, ['scripts/typecheck-tests.mjs', '--jobs=2', ...dirs], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return { status: r.status, out: `${r.stdout}${r.stderr}` }
}

const source = { 'src/index.ts': 'export const add = (a: number, b: number): number => a + b\n' }
const good = pkg('good', {
  ...source,
  'src/__tests__/add.test.ts':
    "import { add } from '../index.js'\n\nexport const sum: number = add(1, 2)\n",
})
const bad = pkg('bad', {
  ...source,
  // The build excludes this file and Vitest strips its types: only the gate sees it.
  'src/__tests__/add.test.ts':
    "import { add } from '../index.js'\n\nexport const sum: number = add(1, '2')\n",
})

describe('typecheck-tests', () => {
  it(
    'fails on a test-file type error, naming the file, line and package',
    { timeout: 180_000 },
    () => {
      const { status, out } = gate(good, bad)
      expect(status, out).toBe(1)
      const rel = path.relative(ROOT, bad)
      expect(out).toContain(`\n${rel}\n`)
      expect(out).toContain(`${rel}/src/__tests__/add.test.ts(3,35): error TS2345`)
      expect(out).not.toContain(`\n${path.relative(ROOT, good)}\n`)
      // Same options → one program for both.
      expect(out).toContain('2 package(s) in 1 program(s)')
      expect(out).toContain('1 type error(s) in 1 package(s)')
    },
  )

  it('passes when every test file type-checks', { timeout: 180_000 }, () => {
    const { status, out } = gate(good)
    expect(status, out).toBe(0)
    expect(out).toContain('No type errors.')
  })

  it('checks each package with its own compiler options', { timeout: 180_000 }, () => {
    const implicitAny = 'export const id = (x) => x\n'
    const strict = pkg('strict-implicit-any', {
      ...source,
      'src/__tests__/id.test.ts': implicitAny,
    })
    const loose = pkg(
      'loose-implicit-any',
      { ...source, 'src/__tests__/id.test.ts': implicitAny },
      { options: { ...STRICT, strict: false } },
    )
    const { status, out } = gate(strict, loose)
    expect(status, out).toBe(1)
    expect(out).toContain('2 package(s) in 2 program(s)')
    expect(out).toContain(
      `${path.relative(ROOT, strict)}/src/__tests__/id.test.ts(1,20): error TS7006`,
    )
    expect(out).not.toContain(`${path.relative(ROOT, loose)}/src`)
  })

  it(
    'counts diagnostics whatever tsc exits with, and fails a run that did not finish',
    {
      timeout: 180_000,
    },
    () => {
      // The native compiler exits 1 when it reports errors, TypeScript 6 exits 2; a gate that
      // took 1 for a crash once counted the whole fleet's errors as zero.
      const fake = (name, body) => {
        const file = path.join(base, `${name}.cjs`)
        fs.writeFileSync(file, body)
        return `--tsc=${file}`
      }
      const line = `${good}/src/__tests__/add.test.ts(1,1): error TS9999: reported`
      const r1 = gate(
        fake('tsc-exit-1', `console.log(${JSON.stringify(line)}); process.exit(1)\n`),
        good,
      )
      expect(r1.status, r1.out).toBe(1)
      expect(r1.out).toContain('1 type error(s) in 1 package(s)')
      expect(r1.out).not.toContain('tsc did not finish')

      const r2 = gate(fake('tsc-dies', "console.error('out of memory'); process.exit(134)\n"), good)
      expect(r2.status, r2.out).toBe(1)
      expect(r2.out).toContain('tsc did not finish')
      expect(r2.out).toContain('out of memory')
    },
  )

  it(
    'skips packages with their own typecheck:tests script or without tests',
    {
      timeout: 180_000,
    },
    () => {
      const own = pkg(
        'own-script',
        { ...source, 'src/__tests__/x.test.ts': "export const n: number = 'x'\n" },
        { scripts: { 'typecheck:tests': 'tsc -p tsconfig.tests.json' } },
      )
      const noTests = pkg('no-tests', source)
      const { status, out } = gate(own, noTests)
      expect(status, out).toBe(0)
      expect(out).toContain('0 package(s) in 0 program(s)')
      expect(out).toContain('skipped: 1 with their own typecheck:tests, 1 without tests')
    },
  )

  it('refuses a named directory that is not a package, and an option without =', () => {
    const notAPackage = path.join(base, 'not-a-package')
    fs.mkdirSync(notAPackage, { recursive: true })
    const { status, out } = gate(good, notAPackage)
    expect(status, out).toBe(2)
    expect(out).toContain(`not a package directory (no package.json): ${notAPackage}`)
    expect(out).not.toContain('No type errors.')
    // `--jobs 2` would read `2` as a directory and check nothing.
    const r = spawnSync(process.execPath, ['scripts/typecheck-tests.mjs', '--jobs', '2', good], {
      cwd: ROOT,
      encoding: 'utf8',
    })
    expect(r.status, r.stderr).not.toBe(0)
    expect(r.stderr).toContain('unknown option --jobs')
  })
})
