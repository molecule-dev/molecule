#!/usr/bin/env node
/**
 * In a package whose TypeScript build emits JSX as-is (`jsx: "preserve"`, the
 * Solid packages), a relative import of a `.tsx` module must say `.jsx`.
 *
 * WHY THIS GATE EXISTS: with `jsx: "preserve"`, `tsc` writes `X.tsx` to
 * `dist/X.jsx` and copies every specifier unchanged. TypeScript resolves
 * `./X.js` to `X.tsx` for type checking, and Vite and vitest fall back across
 * extensions, so the package type-checks, tests and builds green while its
 * `dist/index.js` exports from `./X.js`, a file that does not exist. The first
 * thing to fail is a consuming app's production build (rollup:
 * UNRESOLVED_IMPORT). On 2026-11-14 five new Solid feature packages shipped
 * `export * from './AppShellLayout.js'` this way; a scaffolded Solid app's
 * `vite build` was the first to notice.
 *
 * Rules:
 * - A package is judged when its effective tsconfig (after `extends`) sets
 *   `jsx` to `preserve`; every other `jsx` mode emits `.js` for a `.tsx`
 *   source, so `.js` is right there.
 * - Every relative specifier in its `src` files: `./X.js` whose source is
 *   `X.tsx` (and there is no `X.ts`) must be `./X.jsx`, and `./X.jsx` whose
 *   source is `X.ts` must be `./X.js` (that emits `X.js`).
 *
 * Usage: node scripts/check-jsx-specifiers.mjs [package-dir…]   (default: every package)
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'

import ts from 'typescript'

import { relativeImports, SOURCE_FILE } from './check-tracked-imports.mjs'

const ROOT = resolve(import.meta.dirname, '..')

/**
 * Whether a package's effective compiler options keep JSX as-is.
 *
 * @param tsconfigPath - The package's tsconfig.json.
 * @returns True when the resolved `jsx` option is `preserve`.
 */
export function emitsJsxAsIs(tsconfigPath) {
  const read = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (read.error)
    throw new Error(
      `${tsconfigPath}: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`,
    )
  // Only the options are needed: a host that lists no files skips the include walk.
  const host = { ...ts.sys, readDirectory: () => [] }
  const parsed = ts.parseJsonConfigFileContent(read.config, host, dirname(tsconfigPath))
  return parsed.options.jsx === ts.JsxEmit.Preserve
}

/**
 * Finds relative specifiers whose extension does not match what the build emits.
 *
 * @param input - What to judge.
 * @param input.files - Absolute paths of the package's source files.
 * @param input.read - Reads a file's contents.
 * @param input.exists - Whether a path is a file.
 * @returns One entry per mismatched specifier.
 */
export function findJsxSpecifierMismatches({ files, read, exists }) {
  const offenders = []
  for (const file of files) {
    if (!SOURCE_FILE.test(file)) continue
    for (const specifier of relativeImports(read(file), file)) {
      const bare = specifier.replace(/[?#].*$/, '')
      const match = /\.(jsx?)$/.exec(bare)
      if (!match) continue
      const stem = resolve(dirname(file), bare.slice(0, -match[0].length))
      const hasTs = exists(`${stem}.ts`)
      const hasTsx = exists(`${stem}.tsx`)
      if (match[1] === 'js' && hasTsx && !hasTs)
        offenders.push({ file, specifier, expected: `${bare.slice(0, -3)}.jsx` })
      if (match[1] === 'jsx' && hasTs && !hasTsx)
        offenders.push({ file, specifier, expected: `${bare.slice(0, -4)}.js` })
    }
  }
  return offenders
}

/** Every directory under `dir` that holds a package.json (node_modules, dist and dot-dirs skipped). */
function packageDirs(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const path = join(dir, entry)
    if (!statSync(path).isDirectory()) continue
    if (existsSync(join(path, 'package.json'))) out.push(path)
    else packageDirs(path, out)
  }
  return out
}

/** Every source file under `dir` (node_modules and dist skipped). */
function sourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) sourceFiles(path, out)
    else if (SOURCE_FILE.test(entry.name)) out.push(path)
  }
  return out
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs =
    process.argv.length > 2
      ? process.argv.slice(2).map((d) => resolve(d))
      : packageDirs(join(ROOT, 'packages'))
  const exists = (path) => existsSync(path) && statSync(path).isFile()
  let judged = 0
  const offenders = []
  for (const dir of dirs) {
    const tsconfig = join(dir, 'tsconfig.json')
    if (!existsSync(tsconfig) || !emitsJsxAsIs(tsconfig)) continue
    judged++
    offenders.push(
      ...findJsxSpecifierMismatches({
        files: sourceFiles(join(dir, 'src')),
        read: (f) => readFileSync(f, 'utf8'),
        exists,
      }),
    )
  }
  if (offenders.length) {
    console.error(
      `check:jsx-specifiers: ${offenders.length} relative import(s) name a file the jsx:"preserve" build does not emit:`,
    )
    for (const o of offenders)
      console.error(`  ${relative(ROOT, o.file)}: '${o.specifier}' → '${o.expected}'`)
    console.error(
      '\nA jsx:"preserve" build writes X.tsx to dist/X.jsx and keeps every specifier as written, so',
      "\n`./X.js` names a missing file in the published package (a consuming app's production build",
      '\nfails with UNRESOLVED_IMPORT). Write the extension the build emits: `.jsx` for a .tsx source.',
    )
    process.exit(1)
  }
  console.log(
    `check:jsx-specifiers: ${judged} jsx:"preserve" package(s), every relative specifier names an emitted file`,
  )
}
