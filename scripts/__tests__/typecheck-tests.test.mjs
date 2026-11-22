/** The test-file type-check gate, run as CI runs it, over fixture packages it must judge. */
import { spawn, spawnSync } from 'node:child_process'
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

  it(
    "checks a Svelte package's tests against each component's own props",
    { timeout: 300_000 },
    () => {
      // tsc reads `../Greeting.svelte` as svelte's ambient `declare module '*.svelte'` type, so it
      // passes a mount with the wrong props; svelte-check reads the component's `$props()` type.
      const component = {
        'src/Greeting.svelte':
          '<script lang="ts">\n  let { name }: { name: string } = $props()\n</script>\n\n<p>{name}</p>\n',
        'src/index.ts': "export { default as Greeting } from './Greeting.svelte'\n",
      }
      const mountWith = (props) =>
        "import { mount } from 'svelte'\n\nimport Greeting from '../Greeting.svelte'\n\n" +
        `export const show = (target: HTMLElement): void => {\n  mount(Greeting, { target, props: ${props} })\n}\n`
      const wrong = pkg('svelte-wrong-props', {
        ...component,
        'src/__tests__/greeting.test.ts': mountWith('{ name: 1 }'),
      })
      const right = pkg('svelte-right-props', {
        ...component,
        'src/__tests__/greeting.test.ts': mountWith("{ name: 'Ada' }"),
      })
      const failing = gate(wrong, good)
      expect(failing.status, failing.out).toBe(1)
      const rel = path.relative(ROOT, wrong)
      expect(failing.out).toContain(`${rel}/src/__tests__/greeting.test.ts(6,`)
      expect(failing.out).toMatch(
        /: error TS2322: Type 'number' is not assignable to type 'string'/,
      )
      // A Svelte package never shares a program with a plain TypeScript one.
      expect(failing.out).toContain('2 package(s) in 2 program(s)')
      expect(failing.out).toContain('1 type error(s) in 1 package(s)')

      const passing = gate(right)
      expect(passing.status, passing.out).toBe(0)
      expect(passing.out).toContain('No type errors.')
    },
  )

  it(
    'passes a test that imports a component with no TypeScript script block',
    { timeout: 300_000 },
    () => {
      // svelte-check reads a component without `<script lang="ts">` (a markup-only test fixture) as
      // JavaScript; without allowJs a TypeScript import of it was TS7016, "Could not find a
      // declaration file" (2026-11-22: svelte-ui's TeardownRenders.svelte, the layouts' RoutedViewMock).
      const markupOnly = pkg('svelte-markup-only', {
        'src/Stamp.svelte':
          '<script lang="ts">\n  let { n }: { n: number } = $props()\n</script>\n\n<p>{n}</p>\n',
        'src/index.ts': "export { default as Stamp } from './Stamp.svelte'\n",
        'src/__tests__/Marker.svelte': '<div data-marker=""></div>\n',
        'src/__tests__/marker.test.ts':
          "import { mount } from 'svelte'\n\nimport Marker from './Marker.svelte'\n\n" +
          'export const show = (target: HTMLElement): void => {\n  mount(Marker, { target })\n}\n',
      })
      const { status, out } = gate(markupOnly)
      expect(status, out).toBe(0)
      expect(out).not.toContain('TS7016')
      expect(out).toContain('No type errors.')
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

  /**
   * Runs the gate with `--scope`, as CI passes scripts/affected-projects.mjs's output.
   *
   * @param scope - The scope text.
   * @param [rest] - Further arguments.
   * @returns Exit status, stdout and stderr.
   */
  const scoped = (scope, ...rest) => {
    const r = spawnSync(
      process.execPath,
      ['scripts/typecheck-tests.mjs', '--jobs=2', `--scope=${scope}`, ...rest],
      { cwd: ROOT, encoding: 'utf8' },
    )
    return { status: r.status, stdout: r.stdout, stderr: r.stderr }
  }

  it(
    'checks the packages of an affected-projects scope and names its other entries',
    { timeout: 180_000 },
    () => {
      const r = scoped(`${path.relative(ROOT, bad)} ${path.relative(ROOT, good)} scripts/__tests__`)
      expect(r.status, r.stdout + r.stderr).toBe(1)
      expect(r.stderr).toContain('Not packages, so not checked here: scripts/__tests__')
      expect(r.stdout).toContain(
        `${path.relative(ROOT, bad)}/src/__tests__/add.test.ts(3,35): error TS2345`,
      )
      expect(r.stdout).toContain('2 package(s) in 1 program(s)')
    },
  )

  it('checks nothing for a scope that names no package', () => {
    const r = scoped('scripts/__tests__')
    expect(r.status, r.stdout + r.stderr).toBe(0)
    expect(r.stderr).toContain('No affected package to check.')
    expect(r.stdout).toBe('')
  })

  /**
   * Runs the gate with a reader that takes its output slowly: it pauses 100 ms after each chunk,
   * so the gate writes faster than the pipe drains, as a busy log collector can. Output still
   * queued when the gate exits is lost, so a gate that exits before its writes reach the pipe
   * comes back short here on every run (a reader that keeps up loses it on some runs only).
   *
   * @param args - The gate's arguments.
   * @returns Exit status and stdout.
   */
  const slowRead = (...args) =>
    new Promise((done, fail) => {
      const child = spawn(process.execPath, ['scripts/typecheck-tests.mjs', ...args], { cwd: ROOT })
      let out = ''
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk) => {
        out += chunk
        child.stdout.pause()
        setTimeout(() => child.stdout.resume(), 100)
      })
      child.stderr.resume()
      child.on('error', fail)
      child.on('close', (status) => done({ status, stdout: out }))
    })

  it('reads an empty scope as every workspace package, as vitest does', async () => {
    const all = await slowRead('--list')
    // Every workspace package, counted without the script: the list is larger than a pipe holds,
    // and a process.exit after console.log cut it short at about 64 KB.
    const { workspaces } = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const expected = fs
      .globSync(
        workspaces.map((w) => `${w}/package.json`),
        { cwd: ROOT },
      )
      .map((p) => path.dirname(p))
      .sort()
    expect(all.status).toBe(0)
    expect(all.stdout.trimEnd().split('\n').sort()).toEqual(expected)
    const empty = await slowRead('--scope=', '--list')
    expect(empty.status).toBe(0)
    expect(empty.stdout).toBe(all.stdout)
    expect(empty.stdout.split('\n')).toContain('packages/app/frameworks/react')
    expect((await slowRead('--scope=  ', '--list')).stdout).toBe(all.stdout)
  })

  it('prints every error of a report larger than a pipe holds', { timeout: 180_000 }, async () => {
    const lines = Array.from(
      { length: 1500 },
      (_, i) => `export const sum${i}: number = add(1, '2')\n`,
    )
    const many = pkg('many-errors', {
      ...source,
      'src/__tests__/add.test.ts': `import { add } from '../index.js'\n\n${lines.join('')}`,
    })
    const { status, stdout: out } = await slowRead('--jobs=2', many)
    expect(status).toBe(1)
    const rel = path.relative(ROOT, many)
    expect(out).toContain(`${rel}/src/__tests__/add.test.ts(1502,39): error TS2345`)
    expect(out).toContain('1500 type error(s) in 1 package(s).')
    expect(out).toContain('Re-check one package: node scripts/typecheck-tests.mjs <its dir>')
  })

  it('refuses a scope together with named directories', () => {
    const r = scoped(path.relative(ROOT, good), good)
    expect(r.status).not.toBe(0)
    expect(r.stderr).toContain('pass package directories or --scope=<dirs>, not both')
  })
})
