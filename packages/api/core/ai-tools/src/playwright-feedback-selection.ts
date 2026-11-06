/**
 * Prioritize native spec files from explicit route declarations and source imports.
 * TypeScript parses syntax; Playwright judges behavior. Unreadable/dynamic routing
 * falls back to all specs, rather than treating an absent index entry as coverage.
 * @module
 */
import { createRequire } from 'node:module'
import { posix } from 'node:path'

import type ts from 'typescript'

const require = createRequire(import.meta.url)
let compiler: typeof ts | undefined
const typescript = (): typeof ts => (compiler ??= require('typescript'))

import type { FeedbackProject, FeedbackSource, FeedbackSpec } from './playwright-feedback-types.js'

/** A parsed route and the source files its element imports. */
interface RouteFiles {
  route: string
  files: Set<string>
}

/** Get the text of a literal or the static prefix of a route template. */
function routeText(node: ts.Node | undefined): string | undefined {
  const ts = typescript()
  if (!node) return undefined
  if (ts.isJsxExpression(node)) return routeText(node.expression)
  if (ts.isStringLiteralLike(node)) return node.text
  if (ts.isTemplateExpression(node)) return `${node.head.text}*`
  return undefined
}

/** Parse each file once, resolving only relative source imports we actually have. */
function sourceIndex(files: readonly FeedbackSource[]): {
  trees: Map<string, ts.SourceFile>
  imports: Map<string, Map<string, string>>
  dependencies: Map<string, Set<string>>
} {
  const ts = typescript()
  const trees = new Map(
    files.map((f) => [
      f.path,
      ts.createSourceFile(f.path, f.content, ts.ScriptTarget.Latest, true),
    ]),
  )
  const imports = new Map<string, Map<string, string>>()
  const dependencies = new Map<string, Set<string>>()
  for (const [file, tree] of trees) {
    const names = new Map<string, string>(),
      deps = new Set<string>()
    const resolve = (text: string): string | undefined => {
      if (!text.startsWith('.')) return undefined
      const base = posix.resolve(posix.dirname(file), text)
      return [
        base,
        base.replace(/\.[cm]?jsx?$/, '.ts'),
        base.replace(/\.[cm]?jsx?$/, '.tsx'),
        ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'].map((ext) => base + ext),
      ].find((p) => trees.has(p))
    }
    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = resolve(node.moduleSpecifier.text)
        if (target) {
          deps.add(target)
          const clause = node.importClause
          if (clause?.name) names.set(clause.name.text, target)
          if (clause?.namedBindings && ts.isNamedImports(clause.namedBindings))
            for (const n of clause.namedBindings.elements) names.set(n.name.text, target)
        }
      }
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const target = resolve(node.moduleSpecifier.text)
        if (target) deps.add(target)
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const text = routeText(node.arguments[0]),
          target = text && resolve(text)
        if (target) deps.add(target)
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
    imports.set(file, names)
    dependencies.set(file, deps)
  }
  return { trees, imports, dependencies }
}

/** The explicit routes a module declares; unknown framework shapes remain unindexed. */
function routeFiles(files: readonly FeedbackSource[]): RouteFiles[] {
  const ts = typescript()
  const { trees, imports, dependencies } = sourceIndex(files)
  const out: RouteFiles[] = []
  const closure = (file: string, seen: Set<string>): void => {
    if (seen.has(file)) return
    seen.add(file)
    for (const dep of dependencies.get(file) ?? []) closure(dep, seen)
  }
  for (const [file, tree] of trees) {
    const add = (path: ts.Node | undefined, element: ts.Node | undefined): void => {
      const route = routeText(path)
      // Relative and nested declarations need the router's own resolution. Do not guess it.
      if (!route?.startsWith('/') || !element) return
      const selected = new Set<string>([file])
      const refs = (node: ts.Node): void => {
        if (ts.isIdentifier(node)) {
          const target = imports.get(file)?.get(node.text)
          if (target) closure(target, selected)
        }
        ts.forEachChild(node, refs)
      }
      refs(element)
      // A local component, namespace or lazy binding cannot be resolved narrowly here.
      if (selected.size === 1) closure(file, selected)
      out.push({ route, files: selected })
    }
    const visit = (node: ts.Node): void => {
      if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
        const attrs = node.attributes.properties.filter(ts.isJsxAttribute)
        const path = attrs.find((a) => a.name.getText(tree) === 'path')?.initializer
        const element = attrs.find((a) =>
          /^(element|component|Component)$/.test(a.name.getText(tree)),
        )?.initializer
        add(path, element)
      }
      if (ts.isObjectLiteralExpression(node)) {
        const props = node.properties.filter(ts.isPropertyAssignment)
        add(
          props.find((p) => p.name.getText(tree).replace(/['"]/g, '') === 'path')?.initializer,
          props.find((p) =>
            /^(element|component|Component)$/.test(p.name.getText(tree).replace(/['"]/g, '')),
          )?.initializer,
        )
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
  }
  return out
}

/** Goto targets in a spec and its supplied helpers. Unknown targets force a conservative run. */
function specRoutes(
  spec: FeedbackSpec,
  index: ReturnType<typeof sourceIndex>,
): { routes: string[]; unknown: boolean } {
  const ts = typescript()
  const { trees, dependencies } = index
  const seen = new Set<string>(),
    routes: string[] = []
  let unknown = false
  const read = (file: string): void => {
    if (seen.has(file)) return
    seen.add(file)
    const tree = trees.get(file)
    if (!tree) {
      unknown = true
      return
    }
    const visit = (node: ts.Node): void => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === 'goto'
      ) {
        const route = routeText(node.arguments[0])
        if (route?.startsWith('/')) routes.push(route.split('?')[0].split('#')[0])
        else unknown = true
      }
      ts.forEachChild(node, visit)
    }
    visit(tree)
    for (const dep of dependencies.get(file) ?? []) read(dep)
  }
  read(spec.path)
  return { routes, unknown: unknown || routes.length === 0 }
}

/** Compare route patterns for selection only, never for a correctness claim. */
function routeOverlaps(a: string, b: string): boolean {
  const left = a.split('/').filter(Boolean),
    right = b.split('/').filter(Boolean)
  const n = Math.max(left.length, right.length)
  for (let i = 0; i < n; i++) {
    if (left[i] === '*' || right[i] === '*') return true
    if (!left[i] || !right[i]) return false
    if (!left[i].startsWith(':') && !right[i].startsWith(':') && left[i] !== right[i]) return false
  }
  return true
}

/**
 * Prioritize spec files potentially affected by writes. Every file still runs: a click or
 * a helper can navigate somewhere a literal-goto index cannot see. This index never excludes work.
 * @param project - Caller-supplied source and runner inventory.
 * @param changed - Absolute source paths changed since the previous diagnosis.
 * @returns Spec files to run, with their rendering-source context.
 */
export function selectFeedbackSpecs(
  project: FeedbackProject,
  changed: readonly string[],
): Array<{ spec: FeedbackSpec; sourceFiles: string[] }> {
  if (project.specs.length === 0) return []
  const routes = routeFiles(project.sources)
  const affected = routes.filter((r) => changed.some((p) => r.files.has(p)))
  const index = sourceIndex([...project.sources, ...project.specs])
  return project.specs
    .map((spec) => {
      const targets = specRoutes(spec, index)
      const hits = affected.filter((r) =>
        targets.routes.some((path) => routeOverlaps(r.route, path)),
      )
      return {
        spec,
        priority: hits.length,
        sourceFiles: [
          ...new Set(
            hits.length
              ? hits.flatMap((r) => [...r.files]).filter((p) => changed.includes(p))
              : changed,
          ),
        ],
      }
    })
    .sort((a, b) => b.priority - a.priority)
}
