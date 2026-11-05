#!/usr/bin/env node
/**
 * Every bare-specifier import in a package's shipped source must be DECLARED
 * in that package's own package.json.
 *
 * WHY THIS GATE EXISTS: npm workspaces hoist every dependency to the root
 * node_modules, so a package can import a library it never declares and still
 * build, test and lint green here. Under pnpm (strict, non-hoisted) or Yarn PnP
 * the same import fails at runtime for every consumer — and under plain npm it
 * resolves to whatever version some OTHER package happened to pull in.
 *
 * Rules, per package under packages/:
 * - Scans `src/**` `.ts`/`.tsx`/`.mts`/`.cts` files, skipping tests
 *   (`__tests__`, `__mocks__`, `*.test.*`, `*.spec.*`).
 * - Parses each file with the TypeScript parser, so imports inside comments,
 *   JSDoc examples and template literals are never counted.
 * - Ignores relative paths, Node builtins (`node:` or bare), URL-like
 *   specifiers (`virtual:…`) and the package's own name.
 * - A RUNTIME import must appear in dependencies, peerDependencies or
 *   optionalDependencies.
 * - A TYPE-ONLY import (`import type`, `export type`, `import('x')` in a type
 *   position, `declare module 'x'`, any import in a `.d.ts`) may also be
 *   satisfied by devDependencies, or by `@types/<name>` in any field.
 *
 * - A peer marked optional (`peerDependenciesMeta[name].optional`) must not be
 *   loaded when the package loads: no static `import … from`, `export … from`
 *   or bare `import 'x'` of it may survive in the JavaScript TypeScript emits.
 *   Type-only imports, and value imports used only as types, are elided by the
 *   compiler and are fine; `import()` and `require()` run only when the code
 *   holding them runs. Unguarded top-level calls load the peer at start-up. npm, pnpm and Yarn
 *   never install an optional peer, and production installers that skip peers
 *   leave it out, so a load-time import of one crashes the app on start-up.
 *
 * Fix an offender by declaring the package: `dependencies` (exact pin) for a
 * library the package bundles, `peerDependencies` (range, plus an exact
 * devDependency) for express and `@molecule/*` packages the app must share.
 * Fix a load-time optional peer by making the peer required (drop its
 * `optional` flag), or by loading it lazily if the package truly works
 * without it.
 *
 * Usage:
 *   node scripts/check-undeclared-imports.mjs            # check (exit 1 on any offender)
 *   node scripts/check-undeclared-imports.mjs --json     # machine-readable report
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, extname, join, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

import { moduleImports } from './lib/module-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXT = new Set(['.ts', '.tsx', '.mts', '.cts'])
const BUILTINS = new Set(builtinModules)

/**
 * Whether a source path is a test or mock file that never ships.
 *
 * @param file - Path relative to the package's src dir.
 * @returns True when the file should not be scanned.
 */
export function isTestFile(file) {
  const parts = file.split(/[\\/]/)
  if (parts.some((p) => p === '__tests__' || p === '__mocks__')) return true
  return /\.(test|spec)\.[cm]?tsx?$/.test(file)
}

/**
 * Extract every module specifier a source file imports, with whether the
 * import only ever affects types.
 *
 * @param text - Source text.
 * @param fileName - File name (decides TSX parsing and `.d.ts`).
 * @returns The imports, in source order.
 */
export function extractImports(text, fileName) {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind)
  const declarationFile = fileName.endsWith('.d.ts')
  const found = []
  const add = (specifier, typeOnly) =>
    found.push({ specifier, typeOnly: declarationFile || typeOnly })

  // Depth-first walk over every node; records each module reference.
  const visit = (node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      let typeOnly = false
      if (clause) {
        if (clause.isTypeOnly) typeOnly = true
        else if (
          !clause.name &&
          clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.length > 0 &&
          clause.namedBindings.elements.every((el) => el.isTypeOnly)
        ) {
          typeOnly = true
        }
      }
      add(node.moduleSpecifier.text, typeOnly)
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const typeOnly =
        node.isTypeOnly ||
        (!!node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.length > 0 &&
          node.exportClause.elements.every((el) => el.isTypeOnly))
      add(node.moduleSpecifier.text, typeOnly)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      add(node.moduleReference.expression.text, node.isTypeOnly)
    } else if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      // `declare module 'x' { … }` augments x's types.
      add(node.name.text, true)
    } else if (ts.isImportTypeNode(node)) {
      const arg = node.argument
      if (ts.isLiteralTypeNode(arg) && ts.isStringLiteral(arg.literal)) {
        add(arg.literal.text, true)
      }
    } else if (ts.isCallExpression(node) && node.arguments.length >= 1) {
      const [first] = node.arguments
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
      if ((isDynamicImport || isRequire) && ts.isStringLiteralLike(first)) {
        add(first.text, false)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return found
}

/**
 * Map a module specifier to the package that must be declared for it, or
 * `null` when it needs no declaration (relative, builtin, URL-like).
 *
 * @param specifier - The import specifier.
 * @returns The package name.
 */
export function packageNameOf(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return null
  if (specifier.startsWith('node:')) return null
  if (/^[a-z][a-z0-9+.-]*:/i.test(specifier)) return null
  const parts = specifier.split('/')
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
  if (BUILTINS.has(name)) return null
  return name
}

/**
 * The `@types/*` package that carries a library's types.
 *
 * @param name - The library name.
 * @returns The DefinitelyTyped package name.
 */
function typesPackageOf(name) {
  return name.startsWith('@') ? `@types/${name.slice(1).replace('/', '__')}` : `@types/${name}`
}

/**
 * Find the imports a package does not declare.
 *
 * @param pkg - The parsed package.json.
 * @param imports - Imports from its shipped source.
 * @returns Undeclared packages.
 */
export function findUndeclared(pkg, imports) {
  const runtime = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ])
  const any = new Set([...runtime, ...Object.keys(pkg.devDependencies ?? {})])
  // package name -> { name, typeOnly (every use was type-only), files }
  const missing = new Map()
  for (const imp of imports) {
    const name = packageNameOf(imp.specifier)
    if (!name || name === pkg.name) continue
    const ok = imp.typeOnly ? any.has(name) || any.has(typesPackageOf(name)) : runtime.has(name)
    if (ok) continue
    const entry = missing.get(name) ?? { name, typeOnly: true, files: new Set() }
    entry.typeOnly = entry.typeOnly && imp.typeOnly
    entry.files.add(imp.file)
    missing.set(name, entry)
  }
  return [...missing.values()]
    .map((m) => ({ name: m.name, typeOnly: m.typeOnly, files: [...m.files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * The compiler options that decide what a package's emitted JavaScript
 * imports: its own tsconfig's JSX settings (`react-jsx` emits an import of
 * `react/jsx-runtime`), with the module kept as ESM so imports stay visible.
 *
 * @param dir - The package directory.
 * @returns Options for `ts.transpileModule`.
 */
export function emitOptionsFor(dir) {
  const file = join(dir, 'tsconfig.json')
  let jsx = ts.JsxEmit.Preserve
  let jsxImportSource
  let verbatimModuleSyntax
  if (existsSync(file)) {
    const read = ts.readConfigFile(file, ts.sys.readFile)
    if (read.error)
      throw new Error(`${file}: ${ts.flattenDiagnosticMessageText(read.error.messageText, '\n')}`)
    const { options } = ts.parseJsonConfigFileContent(read.config, ts.sys, dir)
    jsx = options.jsx ?? jsx
    jsxImportSource = options.jsxImportSource
    verbatimModuleSyntax = options.verbatimModuleSyntax
  }
  return {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    jsx,
    jsxImportSource,
    verbatimModuleSyntax,
  }
}

/**
 * The module specifiers a source file loads the moment it is imported: every
 * static `import … from`, `export … from` and bare `import 'x'` left in the
 * JavaScript TypeScript emits for it. Type-only imports and value imports used
 * only as types are elided unless the package preserves value imports.
 * Unguarded top-level import()/require() calls are eager too. Function bodies
 * and feature-guarded or caught calls remain optional.
 *
 * @param text - Source text.
 * @param fileName - File name (`.d.ts` emits nothing).
 * @param compilerOptions - From {@link emitOptionsFor}.
 * @returns The specifiers, in emitted order.
 */
export function loadTimeImports(
  text,
  fileName,
  compilerOptions = {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.Preserve,
  },
) {
  if (fileName.endsWith('.d.ts')) return []
  const { outputText } = ts.transpileModule(text, {
    fileName,
    reportDiagnostics: false,
    compilerOptions,
  })
  return [...moduleImports(outputText, ts).eager]
}

/**
 * Optional peers a package may load on start-up, each with the reason the app
 * supplies the module some other way. Nothing else is exempt.
 */
export const OPTIONAL_PEERS_SUPPLIED_ELSEWHERE = {
  '@molecule/app-ui-react-native': {
    'react-native':
      'Web scaffolds alias react-native to their generated DOM shim ' +
      "(mlcl registry appFrameworks['react-native-web'].viteExtraConfig); " +
      "native scaffolds declare appFrameworks['react-native'].dependencies['react-native'].",
  },
}

/**
 * Find the peers a package marks optional but loads when it loads.
 *
 * @param pkg - The parsed package.json.
 * @param imports - `{ specifier, file }` from {@link loadTimeImports} over its shipped source.
 * @param exempt - Peers supplied some other way, by package name.
 * @returns One entry per offending peer: `{ name, files }`.
 */
export function findOptionalPeersLoaded(pkg, imports, exempt = OPTIONAL_PEERS_SUPPLIED_ELSEWHERE) {
  const supplied = exempt[pkg.name] ?? {}
  const optional = new Set(
    Object.entries(pkg.peerDependenciesMeta ?? {})
      .filter(
        ([name, meta]) =>
          meta?.optional === true && name in (pkg.peerDependencies ?? {}) && !(name in supplied),
      )
      .map(([name]) => name),
  )
  const found = new Map()
  for (const imp of imports) {
    const name = packageNameOf(imp.specifier)
    if (!name || !optional.has(name)) continue
    found.set(name, (found.get(name) ?? new Set()).add(imp.file))
  }
  return [...found]
    .map(([name, files]) => ({ name, files: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Collect shipped source files under a package's src dir.
 *
 * @param dir - Directory to walk.
 * @param srcRoot - The package's src dir (for test detection).
 * @param out - Accumulator.
 * @returns Absolute file paths.
 */
function collectSources(dir, srcRoot, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectSources(full, srcRoot, out)
    else if (EXT.has(extname(entry)) && !isTestFile(relative(srcRoot, full))) out.push(full)
  }
  return out
}

/**
 * Find every package directory (one holding a package.json and a src dir).
 *
 * @param dir - Directory to walk.
 * @param out - Accumulator.
 * @returns Package directories.
 */
function findPackages(dir, out = []) {
  if (existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'src'))) {
    out.push(dir)
    return out
  }
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) findPackages(full, out)
  }
  return out
}

/**
 * Scan the whole fleet.
 *
 * @param root - The monorepo root (its `packages/` is scanned).
 * @returns One row per package with an offender:
 *   `{ package, dir, missing, optionalLoaded }`.
 */
export function scanFleet(root = ROOT) {
  const rows = []
  for (const dir of findPackages(join(root, 'packages')).sort()) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const srcRoot = join(dir, 'src')
    const sources = collectSources(srcRoot, srcRoot).map((file) => ({
      file: relative(dir, file),
      text: readFileSync(file, 'utf8'),
      path: file,
    }))
    const imports = sources.flatMap((s) =>
      extractImports(s.text, s.path).map((imp) => ({ ...imp, file: s.file })),
    )
    const missing = findUndeclared(pkg, imports)
    // Transpiling is the slow part, so only packages that mark a peer optional pay for it.
    const marksOptional = Object.values(pkg.peerDependenciesMeta ?? {}).some(
      (m) => m?.optional === true,
    )
    const emit = marksOptional ? emitOptionsFor(dir) : null
    const optionalLoaded = marksOptional
      ? findOptionalPeersLoaded(
          pkg,
          sources.flatMap((s) =>
            loadTimeImports(s.text, s.path, emit).map((specifier) => ({ specifier, file: s.file })),
          ),
        )
      : []
    if (missing.length > 0 || optionalLoaded.length > 0)
      rows.push({ package: pkg.name, dir: relative(root, dir), missing, optionalLoaded })
  }
  return rows
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url)
if (isMain) {
  const rows = scanFleet()
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2))
  } else if (rows.length === 0) {
    console.log('✓ every package declares what its source imports, and loads no optional peer')
  } else {
    for (const row of rows) {
      for (const m of row.missing) {
        console.error(
          `✗ ${row.package} imports ${m.name}${m.typeOnly ? ' (types only)' : ''} without declaring it — ${m.files.join(', ')}`,
        )
      }
      for (const m of row.optionalLoaded) {
        console.error(
          `✗ ${row.package} marks peer ${m.name} optional but loads it on start-up — ${m.files.join(', ')}`,
        )
      }
    }
  }
  if (rows.length > 0) process.exitCode = 1
}
