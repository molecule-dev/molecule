#!/usr/bin/env node
/**
 * Type-check every package's test files.
 *
 * WHY THIS GATE EXISTS: package builds exclude `src/**\/__tests__`, and Vitest strips
 * types without checking them, so a test's mock, props object or fixture can drift from
 * the contract it stands in for and still pass. On 2026-11-16, 269 of the fleet's
 * packages had 2,384 such errors: Vue tests rendering components with props their types
 * reject, Solid tests using a global `JSX` that does not exist, `vi.fn<Args, R>()` calls
 * that Vitest 4 no longer accepts. Each test was green, but it no longer checked the
 * contract it was written to check.
 *
 * What it checks: every file under each package's `src/` (sources and tests), with that
 * package's own `tsconfig.json` compiler options and no emit. A package that has its own
 * `typecheck:tests` script is skipped, because CI runs that script instead
 * (`npm run typecheck:tests --workspaces --if-present`). A package with no test files
 * under `src/` is skipped too: its build already type-checks its sources.
 *
 * Speed: packages whose compiler options are identical, once their output and source
 * directories are set aside, are checked as ONE TypeScript program (at most `--chunk`
 * packages each, default 40), and programs run in parallel (`--jobs`, default: CPU
 * count). Thirty Vue feature packages take 13 s as one program and about 220 s as thirty.
 * A package with its own `node_modules` gets a program of its own, so its nested
 * dependencies cannot meet another package's copies. `rootDir` is dropped, since test
 * files are never emitted.
 *
 * Usage:
 *   node scripts/typecheck-tests.mjs                     every workspace package
 *   node scripts/typecheck-tests.mjs <dir>...            those packages; an argument that is not a
 *                                                        package (e.g. scripts/__tests__) is ignored,
 *                                                        so CI can pass affected-projects.mjs's output
 *   --jobs=<n>  --chunk=<n>  --tsc=<path to a tsc binary> (or TYPECHECK_TESTS_TSC)
 *
 * Exits 1 and prints tsc's messages, by package, when any test file has a type error.
 */
import { spawn } from 'node:child_process'
import console from 'node:console'
import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { availableParallelism } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TEST_FILE = /(^|\/)__tests__\/|\.(test|spec)\.[cm]?tsx?$/
const TS_FILE = /\.([cm]?tsx?)$/

/** Compiler options that only place output or sources; they do not change a type. */
const LAYOUT_OPTIONS = [
  'rootDir',
  'rootDirs',
  'outDir',
  'outFile',
  'declarationDir',
  'tsBuildInfoFile',
  'configFilePath',
  'composite',
  'incremental',
  'declaration',
  'declarationMap',
  'emitDeclarationOnly',
  'sourceMap',
  'inlineSourceMap',
  'inlineSources',
  'noEmit',
  'noEmitOnError',
  'removeComments',
  'pathsBasePath',
]

/**
 * Parses `--name=value` flags and positional arguments.
 *
 * @param argv - The command-line arguments.
 * @returns The run's settings.
 */
function parseArgs(argv) {
  const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3)
  const number = (name, fallback) => {
    const value = flag(name)
    if (value === undefined) return fallback
    const n = Number(value)
    if (!Number.isInteger(n) || n < 1)
      throw new Error(`--${name} must be a positive integer, got ${value}`)
    return n
  }
  return {
    dirs: argv.filter((a) => !a.startsWith('--')),
    jobs: number('jobs', availableParallelism()),
    chunk: number('chunk', 40),
    tsc:
      flag('tsc') ??
      process.env.TYPECHECK_TESTS_TSC ??
      join(ROOT, 'node_modules/typescript/bin/tsc'),
  }
}

/**
 * The workspace's package directories, from the root package.json `workspaces` globs
 * (each segment is a name or `*`).
 *
 * @returns Absolute package directories.
 */
function workspacePackages() {
  const { workspaces } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  const found = new Set()
  for (const pattern of workspaces) {
    let dirs = [ROOT]
    for (const segment of pattern.split('/')) {
      dirs = dirs.flatMap((dir) => {
        if (segment !== '*') return existsSync(join(dir, segment)) ? [join(dir, segment)] : []
        return readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules')
          .map((e) => join(dir, e.name))
      })
    }
    for (const dir of dirs) if (existsSync(join(dir, 'package.json'))) found.add(dir)
  }
  return [...found].sort()
}

/**
 * Every TypeScript file under a directory, skipping `node_modules` and `dist`.
 *
 * @param dir - The directory to walk.
 * @returns Paths relative to `dir`, with `/` separators.
 */
function tsFiles(dir) {
  const out = []
  const walk = (at, prefix) => {
    for (const entry of readdirSync(at, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(join(at, entry.name), rel)
      else if (TS_FILE.test(entry.name)) out.push(rel)
    }
  }
  if (existsSync(dir)) walk(dir, '')
  return out
}

/**
 * A package's tsconfig compiler options, parsed the way tsc reads them (`extends` resolved).
 *
 * @param tsconfig - Absolute path of the package's tsconfig.json.
 * @returns The parsed options.
 */
function compilerOptions(tsconfig) {
  const problems = []
  const parsed = ts.getParsedCommandLineOfConfigFile(
    tsconfig,
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (d) => problems.push(d) },
  )
  const errors = [...problems, ...(parsed?.errors ?? [])].filter(
    // TS18003 "No inputs were found": irrelevant here, the gate supplies its own inputs.
    (d) => d.category === ts.DiagnosticCategory.Error && d.code !== 18003,
  )
  if (!parsed || errors.length)
    throw new Error(
      `${relative(ROOT, tsconfig)}: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join('; ')}`,
    )
  return parsed.options
}

/**
 * The key two packages share when one TypeScript program can check both.
 *
 * @param dir - The package directory.
 * @param options - Its parsed compiler options.
 * @returns The group key.
 */
function groupKey(dir, options) {
  const rest = { ...options }
  for (const name of LAYOUT_OPTIONS) delete rest[name]
  const sorted = Object.fromEntries(Object.entries(rest).sort(([a], [b]) => a.localeCompare(b)))
  // A package with its own installed dependencies is checked alone (see the module doc).
  const ownModules =
    existsSync(join(dir, 'node_modules')) &&
    readdirSync(join(dir, 'node_modules')).some((name) => !name.startsWith('.'))
  return JSON.stringify(sorted) + (ownModules ? `\0${dir}` : '')
}

/**
 * The deepest directory containing every given directory: the program's `rootDir`, so
 * no checked file lies outside it.
 *
 * @param dirs - Absolute directories.
 * @returns Their common ancestor.
 */
function commonDir(dirs) {
  const split = dirs.map((d) => d.split(sep))
  const parts = []
  for (let i = 0; split.every((s) => i < s.length && s[i] === split[0][i]); i++)
    parts.push(split[0][i])
  return parts.join(sep) || sep
}

/**
 * Whether a file may be spawned directly.
 *
 * @param file - The path.
 * @returns True when the current user may execute it.
 */
function executable(file) {
  try {
    accessSync(file, constants.X_OK)
    return true
  } catch (_error) {
    // Not executable (or missing, which the spawn through node then reports).
    return false
  }
}

/**
 * Runs tsc over one program's packages.
 *
 * @param tsc - The tsc binary.
 * @param config - The program's config file.
 * @returns Exit code and combined output.
 */
function runTsc(tsc, config) {
  return new Promise((done, fail) => {
    // A tsc script without the executable bit (npm leaves some unset) runs through node.
    const [cmd, args] = executable(tsc) ? [tsc, []] : [process.execPath, [tsc]]
    const child = spawn(cmd, [...args, '-p', config, '--pretty', 'false'], { cwd: ROOT })
    let output = ''
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    child.on('error', fail)
    child.on('close', (code) => done({ code, output }))
  })
}

const settings = parseArgs(process.argv.slice(2))
const started = Date.now()
const candidates = settings.dirs.length
  ? settings.dirs.map((d) => resolve(ROOT, d)).filter((d) => existsSync(join(d, 'package.json')))
  : workspacePackages()

const skipped = { ownScript: 0, noTests: 0, noTsconfig: 0 }
const groups = new Map()
for (const dir of candidates) {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  if (manifest.scripts?.['typecheck:tests']) {
    skipped.ownScript++
    continue
  }
  if (!existsSync(join(dir, 'tsconfig.json'))) {
    skipped.noTsconfig++
    continue
  }
  if (!tsFiles(join(dir, 'src')).some((f) => TEST_FILE.test(f))) {
    skipped.noTests++
    continue
  }
  const key = groupKey(dir, compilerOptions(join(dir, 'tsconfig.json')))
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(dir)
}

const programs = [...groups.values()].flatMap((dirs) => {
  const chunks = []
  for (let i = 0; i < dirs.length; i += settings.chunk)
    chunks.push(dirs.slice(i, i + settings.chunk))
  return chunks
})
const checked = programs.reduce((n, p) => n + p.length, 0)

// Configs live under the repo so `types` and module resolution walk up to its node_modules.
const configDir = join(ROOT, 'node_modules/.cache/typecheck-tests', String(process.pid))
mkdirSync(configDir, { recursive: true })
const errorsByPackage = new Map()
const crashes = []
let next = 0
const worker = async () => {
  while (next < programs.length) {
    const index = next++
    const dirs = programs[index]
    const config = join(configDir, `${index}.json`)
    writeFileSync(
      config,
      JSON.stringify({
        extends: join(dirs[0], 'tsconfig.json'),
        compilerOptions: {
          noEmit: true,
          rootDir: commonDir(dirs),
          composite: false,
          incremental: false,
        },
        include: dirs.map((d) => join(d, 'src/**/*')),
        exclude: dirs.flatMap((d) => [join(d, 'node_modules'), join(d, 'dist')]),
      }),
    )
    const { code, output } = await runTsc(settings.tsc, config)
    let current
    let diagnostics = 0
    for (const line of output.split('\n')) {
      if (!line.trim()) continue
      const at = line.match(/^(.+?)\(\d+,\d+\): error TS\d+:/)
      if (at || /^error TS\d+:/.test(line)) {
        diagnostics++
        const file = at ? resolve(ROOT, at[1]) : ''
        const owner = dirs.find((d) => file.startsWith(d + sep)) ?? dirs[0]
        current = relative(ROOT, owner)
        if (!errorsByPackage.has(current)) errorsByPackage.set(current, [])
        errorsByPackage
          .get(current)
          .push(at ? relative(ROOT, file) + line.slice(at[1].length) : line)
      } else if (current) {
        errorsByPackage.get(current).push(line)
      }
    }
    // tsc exits non-zero when it reports diagnostics (2 for TypeScript 6, 1 for the native
    // compiler). A non-zero exit with none parsed, or a signal, means it did not finish checking.
    if (code === null || (code !== 0 && !diagnostics))
      crashes.push(
        `program of ${dirs.map((d) => relative(ROOT, d)).join(', ')} (exit ${code}):\n${output.trim()}`,
      )
  }
}
try {
  await Promise.all(Array.from({ length: Math.min(settings.jobs, programs.length) }, worker))
} finally {
  rmSync(configDir, { recursive: true, force: true })
}

const errorCount = [...errorsByPackage.values()].reduce(
  (n, lines) => n + lines.filter((l) => / error TS\d+:/.test(l) || /^error TS/.test(l)).length,
  0,
)
for (const [pkg, lines] of [...errorsByPackage].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`\n${pkg}`)
  for (const line of lines) console.log(`  ${line}`)
}
for (const crash of crashes) console.log(`\ntsc did not finish: ${crash}`)
const seconds = ((Date.now() - started) / 1000).toFixed(1)
console.log(
  `\n${checked} package(s) in ${programs.length} program(s), ${seconds} s` +
    ` (skipped: ${skipped.ownScript} with their own typecheck:tests, ${skipped.noTests} without tests,` +
    ` ${skipped.noTsconfig} without a tsconfig.json)`,
)
if (errorCount || crashes.length) {
  console.log(
    `${errorCount} type error(s) in ${errorsByPackage.size} package(s).\n` +
      "Fix each test to match the real types: type a props helper with the component's own props type, " +
      'annotate a fixture with its exported item type, write `vi.fn<(...args: A) => R>()` (Vitest 4), ' +
      "import Solid's `JSX` from 'solid-js'. Never cast to `any` or suppress the error.\n" +
      'Re-check one package: node scripts/typecheck-tests.mjs <its dir>',
  )
  process.exit(1)
}
console.log('No type errors.')
