#!/usr/bin/env node
/**
 * Refuse a publishable package whose manifest names an entry point nothing in the tree builds.
 *
 * `main`, `types` and every `exports` target of a package are files its tarball must hold. A
 * manifest that names `dist/elements/index.js` with no source for it builds green and packs a
 * tarball without it. The publisher refuses that package at its pack check, after the
 * build and every package before it in the queue: on 2026-11-26 `@molecule/app-ui-react-native`
 * 2.0.0 was refused that way at the end of a four-hour publish, because a version commit had
 * taken a `./elements` export from the shared tree without the parked `src/elements` it needs.
 *
 * Check the publisher's non-private `@molecule/*` packages under `packages/`. Conventional
 * `dist/` targets need a matching source under `src/`. Svelte packages can also ship assets
 * copied from `src/` and declaration files for `.svelte` components. Other paths must be files
 * in the tree. For outputs that the build renames or generates, declare the inputs in
 * `package.json` under `molecule.entrySources`, keyed by the target without its leading `./`.
 * For example, `"dist/preset.cjs": ["scripts/build-preset.mjs", "src/preset.cjs"]` requires
 * both inputs in the tree. The publisher checks the actual tarball for literal targets after
 * the build. Wildcard targets are skipped.
 *
 *   node scripts/check-entry-sources.mjs    # exit 1 with every finding
 */
import console from 'node:console'
import { readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { listFiles } from './check-published-tests.mjs'
import { entryPoints } from './lib/assert-pack-complete.mjs'
import { isMainModule } from './lib/is-main.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// Match declaration suffixes before runtime ones. TypeScript preserves .mts/.cts as distinct
// module formats. An input declaration does not emit JS or another declaration under `tsc`.
const EMIT_INPUTS = {
  '.d.ts': ['.ts', '.tsx', '.js', '.jsx'],
  '.d.mts': ['.mts', '.mjs'],
  '.d.cts': ['.cts', '.cjs'],
  '.js': ['.ts', '.tsx', '.js', '.jsx'],
  '.jsx': ['.tsx', '.jsx'],
  '.mjs': ['.mts', '.mjs'],
  '.cjs': ['.cts', '.cjs'],
}

/** Return conventional source paths for an entry under `dist/`. */
function sourceCandidates(entry, sveltePackage) {
  const source = `src/${entry.slice('dist/'.length)}`
  const suffix = Object.keys(EMIT_INPUTS).find((ext) => source.endsWith(ext))
  const stem = suffix ? source.slice(0, -suffix.length) : source
  const candidates = suffix ? EMIT_INPUTS[suffix].map((ext) => `${stem}${ext}`) : []
  if (sveltePackage) {
    // svelte-package transpiles .ts, copies other inputs, and emits types for .svelte files.
    if (!source.endsWith('.ts') || source.endsWith('.d.ts')) candidates.push(source)
    if (suffix === '.d.ts' && stem.endsWith('.svelte')) candidates.push(stem)
  }
  return [...new Set(candidates)]
}

/** Check that every explicitly declared build input is a committed package-relative path. */
function declaredInputProblem(entry, inputs, hasFile) {
  if (
    !Array.isArray(inputs) ||
    !inputs.length ||
    inputs.some(
      (path) =>
        typeof path !== 'string' ||
        path.includes('\\') ||
        path.split('/').some((part) => ['', '.', '..', 'dist', 'node_modules'].includes(part)),
    )
  )
    return `names ${entry}, but molecule.entrySources must list package-relative build inputs`
  const missing = inputs.filter((path) => !hasFile(path))
  return missing.length
    ? `names ${entry}, but its build inputs are missing: ${missing.join(', ')}`
    : null
}

/**
 * The findings for a tree.
 *
 * @param root - The repo root (or an export of the index).
 * @param files - Every file path under `packages/`, relative to the root.
 * @returns `{ dir, entry, problem }` for each entry point nothing in the tree provides.
 */
export function findSourcelessEntries(root, files) {
  const present = new Set(files)
  const findings = []
  for (const file of files) {
    const manifestDir = /^(packages\/.+)\/package\.json$/s.exec(file)?.[1]
    if (!manifestDir || manifestDir.split('/').some((part) => part.startsWith('.'))) continue
    const text = readFileSync(join(root, file), 'utf8')
    let manifest
    try {
      manifest = JSON.parse(text)
    } catch (_error) {
      // The publisher skips unreadable manifests. The syntax gate reports invalid JSON.
      continue
    }
    if (
      manifest?.private ||
      typeof manifest?.name !== 'string' ||
      !manifest.name.startsWith('@molecule/')
    )
      continue
    const sveltePackage = /(?:^|&&)\s*svelte-package(?:\s|$)/.test(manifest.scripts?.build ?? '')
    const declared = manifest.molecule?.entrySources ?? {}
    const hasFile = (path) => present.has(`${manifestDir}/${path}`)
    for (const entry of entryPoints(manifest)) {
      let problem
      if (Object.hasOwn(declared, entry)) {
        problem = declaredInputProblem(entry, declared[entry], hasFile)
      } else if (entry.startsWith('dist/')) {
        const candidates = sourceCandidates(entry, sveltePackage)
        if (!candidates.some(hasFile))
          problem = `names ${entry}, but has no source${candidates.length ? ` (checked ${candidates.join(', ')})` : ''}`
      } else if (!hasFile(entry)) {
        problem = `names ${entry}, which is not in the tree`
      }
      if (problem) findings.push({ dir: manifestDir, entry, problem })
    }
  }
  return findings
}

if (isMainModule(import.meta.url)) {
  const root = realpathSync(ROOT)
  const findings = findSourcelessEntries(root, listFiles(root))
  for (const finding of findings) console.log(`✗ ${finding.dir}: ${finding.problem}`)
  if (findings.length) {
    console.log(
      `\n${findings.length} entry point(s) have nothing in the tree that builds them. Commit the ` +
        'source with the manifest. For generated or renamed outputs, declare the build inputs in ' +
        'package.json under molecule.entrySources.',
    )
    process.exit(1)
  }
  console.log('✓ every entry point of every publishable package has a source in the tree')
}
