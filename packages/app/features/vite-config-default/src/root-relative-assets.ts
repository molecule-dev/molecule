import { statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'

import { originalPositionFor, TraceMap } from '@jridgewell/trace-mapping'
import type { Plugin, ResolvedConfig } from 'vite'

interface AssetReference {
  path: string
  file: string
  line: number
}

interface SyntaxNode {
  type: string
  start?: number
  value?: unknown
  expressions?: unknown[]
  quasis?: { value: { cooked?: string | null } }[]
}

const assetExtension = /\.(?:svg|png|jpe?g|gif|webp|avif|ico)(?:[?#].*)?$/i
const sourceExtension = /\.(?:[cm]?[jt]sx?|vue|svelte|json)$/i

/**
 * Check that a source or output file stays within its owning directory.
 * @param root - Project or output directory.
 * @param file - Absolute candidate file.
 * @returns Whether the file is contained by the directory.
 */
function inside(root: string, file: string): boolean {
  const path = relative(root, file)
  return path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path)
}

/**
 * Walk Vite's parsed JavaScript, excluding module specifiers handled by Vite.
 * @param node - AST node, child array or primitive.
 * @param visit - Visitor for each syntax node.
 */
function walk(node: unknown, visit: (node: SyntaxNode) => void): void {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
    return
  }
  if ('type' in node) visit(node as SyntaxNode)
  for (const [key, child] of Object.entries(node)) {
    // Vite already validates and emits imported assets; their specifiers are
    // module paths, not browser URLs left in application code.
    if (
      key === 'source' &&
      'type' in node &&
      [
        'ImportDeclaration',
        'ExportNamedDeclaration',
        'ExportAllDeclaration',
        'ImportExpression',
      ].includes(String(node.type))
    )
      continue
    walk(child, visit)
  }
}

/**
 * Fail written production builds when app source names a root-relative image
 * absent from the output. Vite resolves imports, but leaves these strings alone;
 * a missing public image would otherwise receive the SPA's index.html fallback.
 *
 * Runs after transforms, using Vite's parser and source maps for source locations,
 * and after output hooks (including PWA generation) for file existence. Proxied
 * routes come from the resolved server config. Development is unaffected.
 *
 * @returns The shared asset-validation Vite plugin.
 */
export function rootRelativeAssetsPlugin(): Plugin {
  let config: ResolvedConfig
  let failed = false
  const modules = new Map<string, AssetReference[]>()
  const directories = new Set<string>()

  const plugin: Plugin = {
    name: 'molecule:root-relative-assets',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved
    },
    options: {
      order: 'post',
      handler(options) {
        // Rollup/Rolldown process the returned plugin list before creating the
        // build. Validate last even when a consumer appends a post output writer.
        const plugins = Array.isArray(options.plugins) ? options.plugins : [options.plugins]
        const ours = (entry: (typeof plugins)[number]): boolean =>
          Boolean(
            entry && typeof entry === 'object' && 'name' in entry && entry.name === plugin.name,
          )
        return {
          ...options,
          plugins: [...plugins.filter((entry) => !ours(entry)), ...plugins.filter(ours)],
        }
      },
    },
    buildStart() {
      failed = false
      directories.clear()
      // Keep cached modules across watch builds; transform replaces changed ones.
    },
    transform(code, id) {
      const file = id.split('?')[0]
      if (
        !isAbsolute(file) ||
        !inside(config.root, file) ||
        file.split(/[\\/]/).includes('node_modules') ||
        !sourceExtension.test(file)
      )
        return

      const references: AssetReference[] = []
      modules.set(id, references)
      // Most modules name no images. Do not parse or construct a source map there.
      if (!code.includes('/') || !/\.(?:svg|png|jpe?g|gif|webp|avif|ico)\b/i.test(code)) return

      const proxies = Object.keys(config.server.proxy ?? {})
      let map: TraceMap | undefined
      walk(this.parse(code), (node) => {
        const value =
          node.type === 'Literal'
            ? node.value
            : node.type === 'TemplateLiteral' && node.expressions?.length === 0
              ? node.quasis?.[0]?.value.cooked
              : undefined
        if (
          typeof value !== 'string' ||
          !value.startsWith('/') ||
          value.startsWith('//') ||
          !assetExtension.test(value) ||
          proxies.some((prefix) =>
            prefix.startsWith('^') ? new RegExp(prefix).test(value) : value.startsWith(prefix),
          )
        )
          return

        const before = code.slice(0, node.start ?? 0)
        const line = before.split('\n').length
        const column = before.length - before.lastIndexOf('\n') - 1
        map ??= new TraceMap({ ...this.getCombinedSourcemap(), version: 3 })
        const original = originalPositionFor(map, { line, column })
        const originalFile = original.source
          ? isAbsolute(original.source)
            ? original.source
            : resolve(dirname(file), original.source)
          : file
        references.push({
          path: value,
          file: relative(config.root, originalFile).split(sep).join('/'),
          line: original.line ?? line,
        })
      })
    },
    buildEnd(error) {
      failed = Boolean(error)
    },
    writeBundle(options) {
      directories.add(resolve(config.root, options.dir ?? dirname(options.file!)))
    },
    closeBundle: {
      order: 'post',
      sequential: true,
      handler() {
        if (failed || !config.build.write || directories.size === 0) return
        const references = [...this.getModuleIds()].flatMap((id) => modules.get(id) ?? [])
        const paths = new Map<string, AssetReference>()
        for (const reference of references.sort(
          (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
        )) {
          if (!paths.has(reference.path)) paths.set(reference.path, reference)
        }
        const missing: string[] = []
        for (const reference of paths.values()) {
          const pathname = decodeURIComponent(new URL(reference.path, 'http://localhost').pathname)
          const present = [...directories].every((directory) => {
            const file = resolve(directory, `.${pathname}`)
            return inside(directory, file) && statSync(file, { throwIfNoEntry: false })?.isFile()
          })
          if (!present)
            missing.push(
              `${reference.file}:${reference.line} names ${JSON.stringify(reference.path)}, but the build output has no such file, so the browser gets the index.html fallback. Put it at public${pathname}, or import it from src.`,
            )
        }
        if (missing.length > 0) this.error(missing.join('\n'))
      },
    },
  }
  return plugin
}
