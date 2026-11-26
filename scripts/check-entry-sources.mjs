#!/usr/bin/env node
/**
 * Refuse a publishable package whose manifest names an entry point nothing in the tree builds.
 *
 * `main`, `types` and every `exports` target of a package are files its tarball must hold. A
 * `dist/` entry is written by the build from the source at the same path under `src/`, so a
 * manifest that names `dist/elements/index.js` with no `src/elements/index.ts` builds green and
 * packs a tarball without it. The publisher refuses that package at its pack check, after the
 * build and every package before it in the queue: on 2026-11-26 `@molecule/app-ui-react-native`
 * 2.0.0 was refused that way at the end of a four-hour publish, because a version commit had
 * taken a `./elements` export from the shared tree without the parked `src/elements` it needs.
 *
 * What it checks, for every non-private package under `packages/`:
 * - an entry under `dist/` has a source at the same path under `src/`, with a TypeScript,
 *   JavaScript or Svelte extension (`dist/x/index.js` and `dist/x/index.d.ts` from
 *   `src/x/index.ts`, `src/x/index.tsx`, `src/x/index.svelte.ts`, `src/x/index.js` and so on);
 * - any other entry is a file in the tree itself (`./src/styles.css`, `./package.json`).
 * Patterns with `*` are left to the pack check, which sees the build output.
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

/** Source extensions a build turns into a `dist/` file of the same stem. */
export const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.svelte.ts',
  '.d.ts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.svelte',
]

/** A `dist/` entry's path without its emitted extension (`dist/a/index.d.ts` → `a/index`). */
const distStem = (entry) =>
  entry
    .slice('dist/'.length)
    .replace(/\.d\.[cm]?ts$/, '')
    .replace(/\.[cm]?jsx?$/, '')
    .replace(/\.svelte$/, '')

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
    const manifestDir = /^(packages\/.+)\/package\.json$/.exec(file)?.[1]
    if (!manifestDir || /\/(?:node_modules|__tests__|__fixtures__|fixtures)\//.test(file)) continue
    const manifest = JSON.parse(readFileSync(join(root, file), 'utf8'))
    if (manifest.private) continue
    for (const entry of entryPoints(manifest)) {
      if (entry.startsWith('dist/')) {
        const stem = distStem(entry)
        const sources = SOURCE_EXTENSIONS.map((ext) => `${manifestDir}/src/${stem}${ext}`)
        if (!sources.some((source) => present.has(source)))
          findings.push({
            dir: manifestDir,
            entry,
            problem: `names ${entry}, but no src/${stem}.{ts,tsx,svelte,js,…} builds it`,
          })
      } else if (!present.has(`${manifestDir}/${entry}`))
        findings.push({
          dir: manifestDir,
          entry,
          problem: `names ${entry}, which is not in the tree`,
        })
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
        'source with the manifest, or leave the entry point out until it lands.',
    )
    process.exit(1)
  }
  console.log('✓ every entry point of every publishable package has a source in the tree')
}
