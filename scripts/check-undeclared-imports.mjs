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
 * - Scans `src/**` `.ts`/`.tsx`/`.mts`/`.cts` files and the `<script>` blocks of
 *   `.svelte` and `.vue` components (they ship as source), skipping tests
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
 * - A TEST file's bare import must be declared in any field of its package's
 *   package.json, or be installed by molecule's own package-lock.json (at the
 *   root, or beside the package). Molecule's CI installs exactly that lock; this
 *   checkout also resolves the parent workspace's node_modules, so a test can
 *   import a package molecule never installs and pass every local run
 *   (2026-11-22: a conformance test imported axe-core, which only the parent
 *   workspace installed).
 *
 * Fix an offender by declaring the package: `dependencies` (exact pin) for a
 * library the package bundles, `peerDependencies` (range, plus an exact
 * devDependency) for express and `@molecule/*` packages the app must share.
 * Fix a load-time optional peer by making the peer required (drop its
 * `optional` flag), or by loading it lazily if the package truly works
 * without it. A file that is an entry of its own (a `package.json` `exports`
 * subpath or renderer condition) which only a consumer that has the peer
 * loads is scoped, with that reason, by {@link OPTIONAL_PEER_ENTRY_FILES}.
 *
 * Usage:
 *   node scripts/check-undeclared-imports.mjs            # check (exit 1 on any offender)
 *   node scripts/check-undeclared-imports.mjs --json     # machine-readable report
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { dirname, extname, join, posix, relative } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

import { isMainModule } from './lib/is-main.mjs'
import { moduleImports } from './lib/module-imports.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXT = new Set(['.ts', '.tsx', '.mts', '.cts'])
/** Components whose `<script>` blocks ship as source. */
const COMPONENT_EXT = new Set(['.svelte', '.vue'])
const BUILTINS = new Set(builtinModules)

/**
 * The code of a source file: a `.svelte` or `.vue` component's `<script>`
 * blocks (instance and module, `lang="ts"` or not) joined, anything else as is.
 *
 * @param text - The file's contents.
 * @param fileName - Its path, for the extension.
 * @returns TypeScript-parseable source.
 */
export function scriptOf(text, fileName) {
  if (!COMPONENT_EXT.has(extname(fileName))) return text
  return [...text.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .join('\n')
}

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
  const sf = ts.createSourceFile(
    fileName,
    scriptOf(text, fileName),
    ts.ScriptTarget.Latest,
    true,
    kind,
  )
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
  // Aliases, never package names (npm names hold neither character): SvelteKit's `$app/…`, `$lib`, `$env/…`
  // and Node's `#` subpath imports.
  if (specifier.startsWith('$') || specifier.startsWith('#')) return null
  // A wildcard module declaration (`declare module '*.ttf'`) types files a bundler loads as assets,
  // not a package; `'pkg/*'` still names pkg.
  if (specifier.startsWith('*')) return null
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
  // A component compiler keeps every import not marked `type`: TypeScript cannot see the template's uses.
  const component = COMPONENT_EXT.has(extname(fileName))
  const { outputText } = ts.transpileModule(scriptOf(text, fileName), {
    fileName: component ? `${fileName}.ts` : fileName,
    reportDiagnostics: false,
    compilerOptions: component
      ? { ...compilerOptions, verbatimModuleSyntax: true }
      : compilerOptions,
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
 * Optional peers a package may load from named files only, by package name and peer. Each file is
 * an entry of its own (an `exports` subpath or condition) that only a consumer who has the peer loads. The
 * package files an entry loads are covered with it, so a helper split out of the entry needs no
 * entry here (app-drag-drop's `src/scoped-web.ts`, loaded by `src/react.ts`), but only while no
 * other file of the package loads that file or the entry itself. A load of the peer from any
 * other file is still flagged.
 */
export const OPTIONAL_PEER_ENTRY_FILES = {
  '@molecule/app-ui-react': {
    '@molecule/app-ui-react-native': {
      condition: 'react-native',
      reason:
        'The React Native scaffold declares the native UI peer. The package resolves browser exports before device exports.',
    },
  },
  '@molecule/app-ui-react-native': {
    '@react-native-community/slider': {
      files: ['src/elements/index.ts'],
      reason: 'The device elements entry renders the slider supplied by the app.',
    },
    'react-native-svg': {
      files: ['src/elements/index.ts'],
      reason: 'The device elements entry renders SVG with the app’s native SVG package.',
    },
    'react-native-safe-area-context': {
      files: ['src/elements/index.ts', 'src/platform/index.tsx'],
      reason: 'The device entries position overlays using the app’s safe area context.',
    },
  },
  '@molecule/app-ui-nativewind': {
    nativewind: {
      files: ['src/native.ts'],
      reason: 'The React Native condition uses the app’s NativeWind registration.',
    },
    'react-native-svg': {
      files: ['src/native.ts'],
      reason: 'The React Native condition styles the SVG components supplied by the app.',
    },
  },
  '@molecule/app-drag-drop': {
    react: {
      files: ['src/react.ts'],
      reason: 'The ./react entry supplies React bindings. The package root never imports it.',
    },
  },
  '@molecule/app-vue': {
    vitest: {
      files: ['src/testing/setup.ts'],
      reason:
        "The ./testing/setup entry registers a vitest hook; only a vitest config's setupFiles " +
        "loads it, and the package's other entries never import it.",
    },
  },
}

/**
 * Find the peers a package marks optional but loads when it loads.
 *
 * @param pkg - The parsed package.json.
 * @param imports - `{ specifier, file }` from {@link loadTimeImports} over its shipped source.
 * @param exempt - Peers supplied some other way, by package name.
 * @param entries - Peers each package may load from its own entry files, by package name.
 * @returns One entry per offending peer: `{ name, files }`.
 */
export function findOptionalPeersLoaded(
  pkg,
  imports,
  exempt = OPTIONAL_PEERS_SUPPLIED_ELSEWHERE,
  entries = OPTIONAL_PEER_ENTRY_FILES,
) {
  const supplied = exempt[pkg.name] ?? {}
  const entryFiles = entries[pkg.name] ?? {}
  const optional = new Set(
    Object.entries(pkg.peerDependenciesMeta ?? {})
      .filter(
        ([name, meta]) =>
          meta?.optional === true && name in (pkg.peerDependencies ?? {}) && !(name in supplied),
      )
      .map(([name]) => name),
  )
  const graph = localLoads(imports)
  const sourceFiles = new Set(imports.map(({ file }) => file))
  const covered = new Map(
    Object.entries(entryFiles).map(([name, { files, condition }]) => {
      const scope = files
        ? { device: files, shared: [] }
        : rendererEntryScope(pkg, condition, sourceFiles)
      return [name, entryClosure(scope.device, graph, scope.shared)]
    }),
  )
  const found = new Map()
  for (const imp of imports) {
    const name = packageNameOf(imp.specifier)
    if (!name || !optional.has(name)) continue
    if (covered.get(name)?.has(imp.file)) continue
    found.set(name, (found.get(name) ?? new Set()).add(imp.file))
  }
  return [...found]
    .map(([name, files]) => ({ name, files: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Conventional source paths for a relative JavaScript import or export target. */
function sourceFileCandidates(path) {
  return [
    path,
    path.replace(/\.js$/, '.ts'),
    path.replace(/\.js$/, '.tsx'),
    path.replace(/\.jsx$/, '.tsx'),
    path.replace(/\.mjs$/, '.mts'),
    path.replace(/\.cjs$/, '.cts'),
  ]
}

/**
 * Find entries confined to a renderer condition. A browser branch with a
 * runtime target must precede it because Metro Web can assert both conditions.
 * A source advertised on any other branch or through main/module is shared.
 *
 * @param pkg - The parsed package manifest.
 * @param renderer - The package's device condition.
 * @param sourceFiles - Source paths that load a module.
 * @returns Candidate device and shared source entry paths.
 */
function rendererEntryScope(pkg, renderer, sourceFiles) {
  const scoped = new Set()
  const shared = new Set()
  const runtimeTarget = (target) => typeof target === 'string' && /\.[cm]?jsx?$/.test(target)
  const collect = (target, set) => {
    if (!runtimeTarget(target)) return
    const path = target.replace(/^\.\//, '')
    if (!path.startsWith('dist/')) return
    for (const file of sourceFileCandidates('src/' + path.slice('dist/'.length))) {
      if (!file.includes('*')) {
        set.add(file)
        continue
      }
      const pattern = file
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
      const matches = new RegExp('^' + pattern + '$')
      for (const source of sourceFiles) if (matches.test(source)) set.add(source)
    }
  }
  const visit = (target, device = false) => {
    if (typeof target === 'string') {
      collect(target, device ? scoped : shared)
    } else if (Array.isArray(target)) {
      for (const candidate of target) visit(candidate, device)
    } else if (target && typeof target === 'object') {
      let browserFirst = false
      for (const [condition, candidate] of Object.entries(target)) {
        visit(candidate, device || (condition === renderer && browserFirst))
        if (condition === 'browser')
          browserFirst = runtimeTarget(candidate) || runtimeTarget(candidate?.default)
      }
    }
  }
  visit(pkg.exports)
  for (const fallback of [pkg.main, pkg.module])
    if (typeof fallback === 'string') collect(fallback, shared)
  return { device: [...scoped], shared: [...shared] }
}

/**
 * The package files each source file loads when it loads: its relative load-time imports, resolved
 * to the files the import list names (a file with no load-time import loads no peer either).
 *
 * @param imports - `{ specifier, file }` from {@link loadTimeImports}, files relative to the package.
 * @returns The files each file loads, by file.
 */
function localLoads(imports) {
  const files = new Set(imports.map((imp) => imp.file))
  const sourceOf = (path) => sourceFileCandidates(path).find((candidate) => files.has(candidate))
  const graph = new Map()
  for (const { specifier, file } of imports) {
    if (!specifier.startsWith('./') && !specifier.startsWith('../')) continue
    const target = sourceOf(posix.join(posix.dirname(file), specifier))
    if (!target) continue
    if (!graph.has(file)) graph.set(file, new Set())
    graph.get(file).add(target)
  }
  return graph
}

/**
 * The files reachable from `start` through `graph`, `start` included.
 *
 * @param start - The first files.
 * @param graph - The files each file loads.
 * @returns Every file reached.
 */
function reachable(start, graph) {
  const seen = new Set(start)
  for (const file of seen) for (const next of graph.get(file) ?? []) seen.add(next)
  return seen
}

/**
 * The files an optional peer's entry files cover: the entries and every package file they load,
 * less whatever another file of the package also loads, since that file loads on start-up.
 *
 * @param entries - The entry files listed for the peer.
 * @param graph - The files each file loads ({@link localLoads}).
 * @param sharedEntries - Entry points a consumer outside the renderer can import.
 * @returns The covered files.
 */
function entryClosure(entries, graph, sharedEntries) {
  const inside = reachable(entries, graph)
  const outside = [...sharedEntries, ...[...graph.keys()].filter((file) => !inside.has(file))]
  const shared = reachable(outside, graph)
  return new Set([...inside].filter((file) => !shared.has(file)))
}

/**
 * Find the packages a package's tests import that neither its package.json
 * declares (in any field, or as `@types/<name>`) nor molecule's lock installs.
 *
 * @param pkg - The parsed package.json.
 * @param imports - `{ specifier, file }` from {@link extractImports} over its test files.
 * @param installed - Whether molecule's package-lock.json installs a package for this one.
 * @returns One entry per unresolvable package: `{ name, files }`.
 */
export function findUnresolvedTestImports(pkg, imports, installed) {
  const declared = new Set([
    pkg.name,
    ...Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    }),
  ])
  const found = new Map()
  for (const imp of imports) {
    const name = packageNameOf(imp.specifier)
    if (!name || declared.has(name) || declared.has(typesPackageOf(name)) || installed(name))
      continue
    found.set(name, (found.get(name) ?? new Set()).add(imp.file))
  }
  return [...found]
    .map(([name, files]) => ({ name, files: [...files].sort() }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Collect the source files under a package's src dir: TypeScript and components.
 *
 * @param dir - Directory to walk.
 * @param srcRoot - The package's src dir (for test detection).
 * @param out - Accumulator.
 * @returns `{ path, test }` per file: its absolute path and whether it is a test or mock.
 */
function collectSources(dir, srcRoot, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) collectSources(full, srcRoot, out)
    else if (EXT.has(extname(entry)) || COMPONENT_EXT.has(extname(entry)))
      out.push({ path: full, test: isTestFile(relative(srcRoot, full)) })
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
  // Molecule's own install: what its CI's `npm ci` puts at the root and beside each package.
  const lockFile = join(root, 'package-lock.json')
  const locked = existsSync(lockFile)
    ? (JSON.parse(readFileSync(lockFile, 'utf8')).packages ?? {})
    : {}
  for (const dir of findPackages(join(root, 'packages')).sort()) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const srcRoot = join(dir, 'src')
    const files = collectSources(srcRoot, srcRoot).map(({ path, test }) => ({
      file: relative(dir, path),
      text: readFileSync(path, 'utf8'),
      path,
      test,
    }))
    const sources = files.filter((f) => !f.test)
    const rel = relative(root, dir)
    const testUnresolved = findUnresolvedTestImports(
      pkg,
      files
        .filter((f) => f.test)
        .flatMap((s) => extractImports(s.text, s.path).map((imp) => ({ ...imp, file: s.file }))),
      (name) => Boolean(locked[`node_modules/${name}`] || locked[`${rel}/node_modules/${name}`]),
    )
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
    if (missing.length > 0 || optionalLoaded.length > 0 || testUnresolved.length > 0)
      rows.push({ package: pkg.name, dir: rel, missing, optionalLoaded, testUnresolved })
  }
  return rows
}

const isMain = isMainModule(import.meta.url)
if (isMain) {
  const rows = scanFleet()
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(rows, null, 2))
  } else if (rows.length === 0) {
    console.log(
      "✓ every package declares what its source imports, loads no optional peer, and its tests import only what molecule's lock installs",
    )
  } else {
    for (const row of rows) {
      for (const m of row.missing) {
        console.error(
          `✗ ${row.package} imports ${m.name}${m.typeOnly ? ' (types only)' : ''} without declaring it — ${m.files.join(', ')}`,
        )
      }
      for (const m of row.testUnresolved) {
        console.error(
          `✗ ${row.package}'s tests import ${m.name}, which its package.json does not declare and molecule's package-lock.json does not install (add it to devDependencies, exact version) — ${m.files.join(', ')}`,
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
