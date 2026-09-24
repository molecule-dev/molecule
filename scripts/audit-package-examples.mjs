#!/usr/bin/env node
/* global console, process */
/**
 * Inventory of module-level `@example` documentation across every package.
 *
 * A package's README.md is generated, and the only usage example it can show is
 * the module-level `@example` in `src/index.ts`. molecule.dev's executor copies
 * that example nearly verbatim, so for each package this records:
 *
 * - `hasExample` — the `@module` JSDoc carries an `@example`.
 * - `compiles`   — the first (primary) example type-checks on its own: its code
 *   is written to `.example-audit/` and compiled with every `@molecule/*` import
 *   mapped to that package's SOURCE, so no build is needed and a phantom export,
 *   a placeholder identifier or a missing `await` all fail it.
 * - `tested`     — a vitest in the package declares `describe('README @example')`,
 *   the convention for a test that imports what the example imports and asserts
 *   the outcome the example claims.
 *
 * Usage:
 *   node scripts/audit-package-examples.mjs                  # full inventory → docs/package-example-audit.json
 *   node scripts/audit-package-examples.mjs <pkgDir>...      # re-audit those packages, update their rows
 *   node scripts/audit-package-examples.mjs --print <pkgDir> # print rows (with compile errors), write nothing
 *   node scripts/audit-package-examples.mjs --check          # exit 1 unless every row is y/y/y
 *
 * @module
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'package-example-audit.json')
// Per-process scratch dir: concurrent audits (parallel agents) must not delete each other's snippets.
const WORK = join(ROOT, '.example-audit', String(process.pid))
const REGISTRY = join(ROOT, '..', 'mlcl', 'registry.json')
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage'])
const BATCH = 120

const require = createRequire(import.meta.url)
const ts = require('typescript')

const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const PRINT = args.includes('--print')
const targets = args.filter((a) => !a.startsWith('--')).map((a) => relative(ROOT, resolve(a)))

/**
 * Find every package directory (a dir holding package.json) under packages/.
 *
 * @param dir - Directory to scan.
 * @returns Package directories, relative to the repo root.
 */
function findPackages(dir) {
  const out = []
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (error) {
    throw new Error(`audit-package-examples: cannot read ${dir}`, { cause: error })
  }
  if (entries.some((e) => e.name === 'package.json') && dir !== join(ROOT, 'packages')) {
    out.push(relative(ROOT, dir))
  }
  for (const e of entries) {
    if (e.isDirectory() && !SKIP_DIRS.has(e.name) && e.name !== 'src' && !e.name.startsWith('.')) {
      out.push(...findPackages(join(dir, e.name)))
    }
  }
  return out
}

/**
 * Extract the module-level JSDoc (`@module`) examples from an index.ts source,
 * mirroring mlcl's fence-aware tag splitting.
 *
 * @param source - Contents of src/index.ts.
 * @returns The raw `@example` blocks, in order.
 */
function extractExamples(source) {
  const comments = source.match(/\/\*\*[\s\S]*?\*\//g) ?? []
  const moduleDoc = comments.find((c) => /@module\b/.test(c))
  if (!moduleDoc) return []
  const lines = moduleDoc
    .replace(/^\/\*\*/, '')
    .replace(/\*\/$/, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*\s?/, ''))
  const tags = []
  let inFence = false
  lines.forEach((line, i) => {
    const t = line.trim()
    if (t.startsWith('```')) {
      inFence = !inFence
      return
    }
    if (!inFence && /^@[a-zA-Z]/.test(t)) tags.push({ i, tag: t.split(/[\s({]/)[0] })
  })
  return tags
    .filter((t) => t.tag === '@example')
    .map((t) => {
      const next = tags.find((x) => x.i > t.i)?.i ?? lines.length
      const rest = lines[t.i].trim().replace(/^@example\s*/, '')
      return [rest, ...lines.slice(t.i + 1, next)].join('\n').trim()
    })
    .filter(Boolean)
}

/**
 * Pull the first fenced code block (or the whole text when unfenced) out of an
 * example, with its fence language.
 *
 * @param example - A raw `@example` block.
 * @returns The code and its language tag.
 */
function exampleCode(example) {
  const m = example.match(/```([a-zA-Z]*)[^\n]*\n([\s\S]*?)```/)
  if (!m) return { lang: 'typescript', code: example }
  return { lang: (m[1] || 'typescript').toLowerCase(), code: m[2] }
}

/**
 * List a package's test files (outside node_modules/dist).
 *
 * @param dir - Absolute package directory.
 * @returns Absolute test file paths.
 */
function testFiles(dir) {
  const out = []
  const walk = (d) => {
    let entries
    try {
      entries = readdirSync(d, { withFileTypes: true })
    } catch (_error) {
      // A directory removed mid-scan (another agent's clean) has no tests to find.
      return
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue
      const p = join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.test\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p)
    }
  }
  walk(dir)
  return out
}

/**
 * Build the `paths` map sending every `@molecule/*` import to its package source.
 *
 * @param pkgs - All package rows.
 * @returns A TypeScript `paths` compiler option.
 */
function moleculePaths(pkgs) {
  const paths = {}
  for (const p of pkgs) {
    const src = join(ROOT, p.path, 'src')
    paths[p.name] = [join(src, 'index.ts'), join(src, 'index.tsx')]
    paths[`${p.name}/*`] = [join(src, '*')]
  }
  return paths
}

/**
 * Type-check the primary examples of a batch of packages in one program.
 *
 * @param rows - Rows with a `code` + `lang` to check (mutated with the result).
 * @param paths - The `@molecule/*` paths map.
 */
function compileBatch(rows, paths) {
  const files = new Map()
  for (const row of rows) {
    const jsx = /tsx|jsx/.test(row.lang) || /<[A-Z][\w.]*[\s/>]/.test(row.code)
    let pragma = ''
    if (jsx && /solid/.test(row.name)) pragma = '/** @jsxImportSource solid-js */\n'
    if (jsx && /vue/.test(row.name)) pragma = '/** @jsxImportSource vue */\n'
    const file = join(WORK, row.path, `example.${jsx ? 'tsx' : 'ts'}`)
    mkdirSync(dirname(file), { recursive: true })
    // `export {}` forces module scope so top-level await and per-file bindings work.
    writeFileSync(file, `${pragma}${row.code}\nexport {}\n`)
    files.set(file, row)
  }
  // vite's `./client` export is types-only, so probe the file rather than require.resolve it.
  // Without it, examples reading `import.meta.env.VITE_*` cannot type-check.
  const types = ['node']
  if (existsSync(join(ROOT, 'node_modules', 'vite', 'client.d.ts'))) types.push('vite/client')
  const program = ts.createProgram([...files.keys()], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    experimentalDecorators: true,
    allowImportingTsExtensions: true,
    types,
    paths,
    pathsBasePath: ROOT,
  })
  for (const [file, row] of files) {
    const sf = program.getSourceFile(file)
    const diags = sf
      ? [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]
      : []
    row.compiles = sf && diags.length === 0 ? 'y' : 'n'
    row.compileErrors = diags.slice(0, 5).map((d) => {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, ' ')
      const line = d.start !== undefined ? sf.getLineAndCharacterOfPosition(d.start).line + 1 : 0
      return `L${line}: ${msg}`.slice(0, 300)
    })
  }
}

// ── inventory ───────────────────────────────────────────────────────────────

const registry = existsSync(REGISTRY) ? JSON.parse(readFileSync(REGISTRY, 'utf8')).packages : {}
const byPath = new Map(Object.entries(registry).map(([name, e]) => [e.path, { name, ...e }]))
const dirs = findPackages(join(ROOT, 'packages')).sort()

const all = dirs.map((path) => {
  const pkg = JSON.parse(readFileSync(join(ROOT, path, 'package.json'), 'utf8'))
  const reg = byPath.get(path)
  return {
    name: pkg.name,
    path,
    type: reg?.type ?? null,
    category: reg?.category ?? null,
    inRegistry: reg ? 'y' : 'n',
  }
})

const selected = targets.length > 0 ? all.filter((r) => targets.includes(r.path)) : all
if (targets.length > 0 && selected.length !== targets.length) {
  const known = new Set(selected.map((r) => r.path))
  console.error(`unknown package dir(s): ${targets.filter((t) => !known.has(t)).join(', ')}`)
  process.exit(2)
}

for (const row of selected) {
  const idx = join(ROOT, row.path, 'src', 'index.ts')
  const examples = existsSync(idx) ? extractExamples(readFileSync(idx, 'utf8')) : []
  row.hasExample = examples.length > 0 ? 'y' : 'n'
  row.exampleCount = examples.length
  if (examples.length > 0) Object.assign(row, exampleCode(examples[0]))
  row.tested = testFiles(join(ROOT, row.path)).some((f) =>
    /describe\(\s*['"`]README @example/.test(readFileSync(f, 'utf8')),
  )
    ? 'y'
    : 'n'
}

const paths = moleculePaths(all)
const toCompile = selected.filter((r) => r.code !== undefined)
for (const r of selected) {
  if (r.code === undefined) {
    r.compiles = 'n'
    r.compileErrors = ['no module-level @example']
  } else if (!/^(ts|tsx|typescript|js|jsx|javascript)$/.test(r.lang)) {
    r.compiles = 'n'
    r.compileErrors = [
      `primary example is \`\`\`${r.lang}, not TypeScript — cannot be type-checked`,
    ]
  }
}
const checkable = toCompile.filter((r) => r.compiles === undefined)
rmSync(WORK, { recursive: true, force: true })
for (let i = 0; i < checkable.length; i += BATCH) {
  compileBatch(checkable.slice(i, i + BATCH), paths)
  if (!PRINT)
    process.stderr.write(
      `  compiled ${Math.min(i + BATCH, checkable.length)}/${checkable.length}\r`,
    )
}
rmSync(WORK, { recursive: true, force: true })

for (const r of selected) {
  delete r.code
  delete r.lang
  r.done = r.hasExample === 'y' && r.compiles === 'y' && r.tested === 'y' ? 'y' : 'n'
}

if (PRINT) {
  console.log(JSON.stringify(selected, null, 2))
  process.exit(0)
}

// Merge into the existing file when auditing a subset, so the file stays the resume point.
const previous =
  existsSync(OUT) && targets.length > 0 ? JSON.parse(readFileSync(OUT, 'utf8')).packages : []
const merged = new Map(previous.map((r) => [r.path, r]))
for (const r of selected) merged.set(r.path, r)
for (const r of all) if (!merged.has(r.path)) merged.set(r.path, r)
const rows = [...merged.values()]
  .filter((r) => dirs.includes(r.path))
  .sort((a, b) => a.path.localeCompare(b.path))
const count = (k) => rows.filter((r) => r[k] === 'y').length
const summary = {
  packages: rows.length,
  hasExample: count('hasExample'),
  compiles: count('compiles'),
  tested: count('tested'),
  done: count('done'),
}
mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, `${JSON.stringify({ summary, packages: rows }, null, 2)}\n`)
console.log(`\n${relative(ROOT, OUT)}: ${JSON.stringify(summary)}`)

if (CHECK && summary.done !== summary.packages) {
  console.error(`✗ ${summary.packages - summary.done} package(s) not y/y/y`)
  process.exit(1)
}
