/**
 * Refuse to publish a package whose tarball lacks the files its package.json
 * points at.
 *
 * `npm publish` packs whatever is in the package directory at that moment. A
 * package published before its build finished (or after a build that wrote
 * nothing) goes out with only LICENSE, package.json and a stray file — and
 * every consumer that imports it fails with ERR_MODULE_NOT_FOUND at runtime.
 * On 2026-09-29 two new transcript readers were published that way, and a
 * production API image that installed them crash-looped for 25 minutes. npm
 * accepts the upload; nothing downstream notices until something imports it.
 *
 * So before each publish: pack with `--dry-run`, and require every entry
 * point the manifest names — `main`, `types`, and each string target inside
 * `exports` — to be in the file list.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Every file path a manifest names as an entry point.
 *
 * @param manifest - The package.json.
 * @returns Normalized relative paths (no leading `./`).
 */
export function entryPoints(manifest) {
  const out = new Set()
  const add = (p) => {
    if (typeof p !== 'string' || p.includes('*')) return
    out.add(p.replace(/^\.\//, ''))
  }
  add(manifest.main)
  add(manifest.types)
  add(manifest.typings)
  const walk = (node) => {
    if (typeof node === 'string') add(node)
    else if (node && typeof node === 'object') for (const v of Object.values(node)) walk(v)
  }
  walk(manifest.exports)
  return [...out]
}

/**
 * Throws when the package's tarball would be missing an entry point.
 *
 * @param dir - The package directory.
 * @returns How many files the tarball holds.
 */
export function assertPackComplete(dir) {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: dir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }),
  )
  // npm ≤11 prints an array of results; npm 12 prints an object keyed by name.
  const result = Array.isArray(packed)
    ? packed[0]
    : (packed[manifest.name] ?? Object.values(packed)[0])
  if (!Array.isArray(result?.files)) {
    throw new Error(
      `${manifest.name}@${manifest.version}: could not read the file list from \`npm pack --json\`.`,
    )
  }
  const files = new Set(result.files.map((f) => f.path))
  const missing = entryPoints(manifest).filter((p) => !files.has(p))
  if (missing.length) {
    throw new Error(
      `${manifest.name}@${manifest.version}: the tarball would be missing ${missing.join(', ')} ` +
        `(${files.size} files packed). Build the package before publishing it.`,
    )
  }
  return files.size
}
