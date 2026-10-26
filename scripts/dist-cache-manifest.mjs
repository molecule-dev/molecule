#!/usr/bin/env node
/* global console, process */
/**
 * Reuse verified dist from CI. npm ci must run BEFORE --apply: the actual build
 * tools are part of the identity. Missing/incompatible proofs remove restored
 * output, so build.js cannot mistake a newer but unverified file for a build.
 *
 * npm's lock already distinguishes workspace records from installed packages.
 * Workspace changes invalidate their declared build dependents; any change to
 * the external install graph invalidates the fleet. No dependency resolution is
 * implemented here. TypeScript itself reads inherited build configuration.
 */
import { createHash } from 'node:crypto'
import {
  lstatSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import { basename, join, relative, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

const FORMAT = 3
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const canonical = (value) =>
  JSON.stringify(value, (_key, item) =>
    item && !Array.isArray(item) && typeof item === 'object'
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  )
const hash = (value) => createHash('sha256').update(canonical(value)).digest('hex')
const bytesHash = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

/** Regular-file inventory; unexpected links or unreadable bytes cannot prove a cache. */
function inventory(dir, skip = new Set(), prefix = '', out = {}, excluded = new Set()) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    if (skip.has(entry.name) || excluded.has(join(dir, entry.name))) continue
    const name = prefix ? `${prefix}/${entry.name}` : entry.name
    const path = join(dir, entry.name)
    if (entry.isDirectory()) inventory(path, skip, name, out, excluded)
    else if (entry.isFile()) out[name] = [bytesHash(path), lstatSync(path).mode & 0o777]
    else throw new Error(`unsupported cache input: ${path}`)
  }
  return out
}

/** Same package traversal and declared dependency fields as build.js (plus optional deps). */
function packagesAt(root) {
  const packages = new Map()
  /** Walk packages with the same depth bound as build.js. */
  function visit(dir, depth = 0) {
    if (depth > 6) return
    const entries = readdirSync(dir, { withFileTypes: true })
    if (entries.some((entry) => entry.name === 'package.json')) {
      const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
      if (manifest.name?.startsWith('@molecule/') && manifest.scripts?.build) {
        packages.set(manifest.name, { path: relative(root, dir), manifest })
      }
    }
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !['node_modules', 'dist'].includes(entry.name)
      ) {
        visit(join(dir, entry.name), depth + 1)
      }
    }
  }
  visit(join(root, 'packages'))
  return packages
}

/** Keep helper-owning builders conservative; the current builder uses only Node builtins. */
function builderInputs(root, ts) {
  const file = join(root, 'scripts/build.js')
  const text = readFileSync(file, 'utf8')
  const imports = ts.preProcessFile(text, true, true).importedFiles
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  let dynamic = false
  /** Dynamic loaders have no statically provable helper inventory. */
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    )
      dynamic = true
    ts.forEachChild(node, visit)
  }
  visit(source)
  // Do not invent a runtime resolver: TS can prefer .d.ts over the JS Node
  // executes, and helpers may read their own assets. Keep the prior complete
  // scripts proof for any helper or createRequire-capable builder.
  if (
    dynamic ||
    imports.some(
      ({ fileName }) => !isBuiltin(fileName) || ['module', 'node:module'].includes(fileName),
    )
  ) {
    return inventory(join(root, 'scripts'), new Set(['node_modules', '.git']))
  }
  return { 'build.js': [bytesHash(file), lstatSync(file).mode & 0o777] }
}

/** Read actual build inputs only; exported for the scoped mutation control. */
export function readCacheInputs(root) {
  const packages = packagesAt(root)
  const paths = new Set([...packages.values()].map((pkg) => pkg.path))
  const outputs = new Set([...paths].map((path) => join(root, path, 'dist')))
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  if (lock.lockfileVersion !== 3 || !lock.packages) throw new Error('expected npm lockfile v3')
  const external = Object.fromEntries(
    Object.entries(lock.packages).filter(([path]) => !paths.has(path)),
  )
  const commands = new Set([...packages.values()].map((pkg) => pkg.manifest.scripts.build))
  const tools = {}
  const covered = new Set()
  for (const [path, entry] of Object.entries(external)) {
    const bins = typeof entry.bin === 'string' ? [basename(path)] : Object.keys(entry.bin ?? {})
    if (!bins.some((name) => commands.has(name))) continue
    const dir = realpathSync(join(root, path))
    const installed = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    if (installed.version !== entry.version)
      throw new Error(`installed build tool differs from lock: ${path}`)
    const nodeModules = path.slice(0, path.lastIndexOf('node_modules/') + 'node_modules/'.length)
    for (const name of bins.filter((bin) => commands.has(bin))) {
      const target = typeof entry.bin === 'string' ? entry.bin : entry.bin[name]
      if (realpathSync(join(root, nodeModules, '.bin', name)) !== realpathSync(join(dir, target))) {
        throw new Error(`installed build command differs from lock: ${name}`)
      }
    }
    tools[path] = inventory(dir, new Set(['node_modules']))
    bins.forEach((name) => covered.add(name))
  }
  for (const command of commands) {
    if (!covered.has(command)) throw new Error(`unverified build command: ${command}`)
  }
  const require = createRequire(join(root, 'package.json'))
  const ts = require('typescript')
  const rootFiles = [
    'package.json',
    '.npmrc',
    ...readdirSync(root).filter((name) => /^tsconfig.*\.json$/.test(name)),
  ]
  const context = hash({
    format: FORMAT,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    root: Object.fromEntries(rootFiles.map((name) => [name, bytesHash(join(root, name))])),
    lock: { ...lock, packages: external },
    tools,
    builder: builderInputs(root, ts),
    cache: bytesHash(fileURLToPath(import.meta.url)),
  })
  // tsc does not consume package-root release/docs bodies. Parsed compiler
  // inputs below still win if a config explicitly names one. Other compilers
  // may use arbitrary template assets, so keep their whole-package inventory.
  const excluded = new Set(outputs)
  for (const pkg of packages.values()) {
    if (pkg.manifest.scripts.build !== 'tsc') continue
    for (const name of ['README.md', 'CHANGELOG.md']) excluded.add(join(root, pkg.path, name))
  }
  for (const pkg of packages.values()) {
    if (!lock.packages[pkg.path]) throw new Error(`workspace absent from lock: ${pkg.path}`)
    const files = {}
    let configError = false
    const parsed = ts.getParsedCommandLineOfConfigFile(
      join(root, pkg.path, 'tsconfig.json'),
      {},
      {
        ...ts.sys,
        readFile(file) {
          const text = ts.sys.readFile(file)
          if (text !== undefined)
            files[relative(root, file)] = createHash('sha256').update(text).digest('hex')
          return text
        },
        onUnRecoverableConfigFileDiagnostic() {
          configError = true
        },
      },
    )
    if (!parsed || configError || parsed.errors.length)
      throw new Error(`unreadable build config: ${pkg.path}`)
    for (const file of parsed.fileNames) files[relative(root, file)] = bytesHash(file)
    const own = inventory(join(root, pkg.path), new Set(['node_modules', '.git']), '', {}, excluded)
    pkg.input = hash({ files, own, lock: lock.packages[pkg.path] })
    const declared = {
      ...pkg.manifest.dependencies,
      ...pkg.manifest.devDependencies,
      ...pkg.manifest.peerDependencies,
      ...pkg.manifest.optionalDependencies,
    }
    pkg.dependencies = Object.keys(declared).filter((name) => packages.has(name))
  }
  for (const [name, pkg] of packages) {
    const seen = new Set()
    /** Include every declared internal dependency once, including cycles. */
    function visit(current) {
      if (seen.has(current)) return
      seen.add(current)
      packages.get(current).dependencies.forEach(visit)
    }
    visit(name)
    pkg.closure = [...seen].map((dep) => packages.get(dep).path).sort()
  }
  return { context, packages }
}

/** Apply or record one proof; malformed/old manifests are cache misses, never authority. */
export function distCache(root, mode) {
  const manifestPath = join(root, '.dist-manifest.json')
  let inputs
  try {
    inputs = readCacheInputs(root)
  } catch (error) {
    if (mode === 'write') throw error
    const packages = packagesAt(root)
    for (const pkg of packages.values())
      rmSync(join(root, pkg.path, 'dist'), { recursive: true, force: true })
    return { fresh: 0, rebuild: packages.size, reason: String(error.message) }
  }
  const current = {}
  for (const pkg of inputs.packages.values()) {
    try {
      const output = inventory(join(root, pkg.path, 'dist'))
      if (Object.keys(output).length) current[pkg.path] = { input: pkg.input, output }
    } catch (_error) {
      /* Missing or unsupported output is uncacheable. */
    }
  }
  if (mode === 'write') {
    writeFileSync(
      manifestPath,
      `${JSON.stringify({ format: FORMAT, context: inputs.context, packages: current })}\n`,
    )
    return { written: Object.keys(current).length }
  }
  let previous
  try {
    previous = JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (_error) {
    /* Cache miss. */
  }
  const compatible = previous?.format === FORMAT && previous.context === inputs.context
  const valid = new Set()
  if (compatible) {
    for (const [path, entry] of Object.entries(current)) {
      if (canonical(previous.packages?.[path]) === canonical(entry)) valid.add(path)
    }
  }
  let fresh = 0
  const now = new Date()
  for (const pkg of inputs.packages.values()) {
    const dist = join(root, pkg.path, 'dist')
    if (!pkg.closure.every((path) => valid.has(path))) {
      rmSync(dist, { recursive: true, force: true })
      continue
    }
    for (const file of Object.keys(current[pkg.path].output)) utimesSync(join(dist, file), now, now)
    fresh++
  }
  return { fresh, rebuild: inputs.packages.size - fresh }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv.includes('--write')
    ? 'write'
    : process.argv.includes('--apply')
      ? 'apply'
      : null
  if (!mode) throw new Error('Usage: dist-cache-manifest.mjs --write | --apply')
  const result = distCache(ROOT, mode)
  console.log(
    mode === 'write'
      ? `dist manifest written: ${result.written} package(s)`
      : `dist cache applied: ${result.fresh} package(s) reused, ${result.rebuild} to rebuild.${result.reason ? ` ${result.reason}` : ''}`,
  )
}
