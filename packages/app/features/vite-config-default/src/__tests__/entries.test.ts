/**
 * The package's light entries load only Vite and Node. A config that builds its own plugin list
 * (the static-site template's, with no `vite-plugin-pwa` installed) imports a plugin from
 * `/assets` or `/dist-sourcemap`; through the package root it would load the PWA, React and
 * Tailwind plugins, and fail on the first one the app does not install.
 *
 * @module
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const PACKAGE = resolve(import.meta.dirname, '../..')
const exportsMap = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'))
  .exports as Record<string, { import: string; types: string }>

/** Peers the package root and `/framework` load, which a light entry must not. */
const HEAVY = [
  'vite-plugin-pwa',
  '@vitejs/plugin-react',
  '@tailwindcss/vite',
  '@molecule/app-version',
]

/**
 * The module specifiers a parsed source file loads at run time. An import or re-export whose
 * every name is a type is erased by the compiler; any other import, re-export or `import()`
 * loads its module.
 *
 * @param source - The parsed file.
 * @returns The specifiers, as written.
 */
function loadedSpecifiers(source: ts.SourceFile): string[] {
  const out: string[] = []
  const typeOnlyNames = (
    elements: ts.NodeArray<ts.ImportSpecifier> | ts.NodeArray<ts.ExportSpecifier>,
  ): boolean => elements.length > 0 && elements.every((e) => e.isTypeOnly)
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause
      const erased =
        clause !== undefined &&
        (clause.isTypeOnly ||
          (!clause.name &&
            clause.namedBindings !== undefined &&
            ts.isNamedImports(clause.namedBindings) &&
            typeOnlyNames(clause.namedBindings.elements)))
      if (!erased) out.push(node.moduleSpecifier.text)
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const erased =
        node.isTypeOnly ||
        (node.exportClause !== undefined &&
          ts.isNamedExports(node.exportClause) &&
          typeOnlyNames(node.exportClause.elements))
      if (!erased) out.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      out.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return out
}

/**
 * The bare module specifiers a source file loads at run time, its relative imports followed.
 *
 * @param file - A `src` TypeScript file.
 * @param seen - Files already read.
 * @returns Every bare specifier its run-time import graph names.
 */
function runtimeImports(file: string, seen = new Set<string>()): Set<string> {
  const bare = new Set<string>()
  if (seen.has(file)) return bare
  seen.add(file)
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest)
  for (const spec of loadedSpecifiers(source)) {
    if (spec.startsWith('.')) {
      for (const s of runtimeImports(resolve(dirname(file), spec.replace(/\.js$/, '.ts')), seen))
        bare.add(s)
    } else bare.add(spec)
  }
  return bare
}

/** The `src` file an entry's `dist` JavaScript is compiled from. */
const sourceOf = (entry: string): string =>
  join(PACKAGE, entry.replace(/^\.\/dist\//, 'src/').replace(/\.js$/, '.ts'))

describe('package entries', () => {
  it.each(['./assets', './dist-sourcemap'])(
    '%s loads none of the PWA, React or Tailwind plugins',
    (entry) => {
      const source = sourceOf(exportsMap[entry].import)
      expect(existsSync(source), source).toBe(true)
      const loaded = [...runtimeImports(source)]
      expect(loaded.filter((spec) => HEAVY.includes(spec))).toEqual([])
    },
  )

  it('/dist-sourcemap exports moleculeDistWithoutSourcemap', async () => {
    const mod = (await import(sourceOf(exportsMap['./dist-sourcemap'].import))) as Record<
      string,
      unknown
    >
    expect(typeof mod.moleculeDistWithoutSourcemap).toBe('function')
    expect(exportsMap['./dist-sourcemap'].types).toBe('./dist/molecule-dist-sourcemap.d.ts')
  })

  it('reads type-only imports as erased and every other import, re-export and import() as loading', () => {
    const parse = (text: string): ts.SourceFile =>
      ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest)
    const text = [
      "import type { A } from 'type-only'",
      "import { type B, type C } from 'all-type-names'",
      "export type { D } from 'type-reexport'",
      "import { type E, f } from 'mixed'",
      "import g from 'default'",
      "import 'side-effect'",
      "import {\n  h,\n  i,\n} from 'multi-line'",
      "export * from 'star'",
      "export { j } from 'named-reexport'",
      "const k = () => import('dynamic')",
      "// import 'in-a-comment'",
      'const s = "import \'in-a-string\'"',
    ].join('\n')
    expect(loadedSpecifiers(parse(text)).sort()).toEqual(
      ['default', 'dynamic', 'mixed', 'multi-line', 'named-reexport', 'side-effect', 'star'].sort(),
    )
  })

  it('counterexample: the package root and /framework load the PWA plugin, as the check would see', () => {
    for (const entry of ['.', './framework']) {
      expect([...runtimeImports(sourceOf(exportsMap[entry].import))], entry).toContain(
        'vite-plugin-pwa',
      )
    }
  })
})
