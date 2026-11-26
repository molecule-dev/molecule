#!/usr/bin/env node
/**
 * A raised package version ships with its CHANGELOG.md section.
 *
 * `changeset version` bumps a package and writes `## <version>` into its CHANGELOG.md, creating the
 * file for a package that has none. A commit of tracked files only (`git commit -a`, `git add -u`)
 * takes the bump and leaves a new CHANGELOG.md behind: the published notes then lack the version,
 * and the next release, which writes the file again, conflicts with the stray copy in the shared
 * tree (2026-11-26: 923334bb5d raised three document-text packages to 1.1.0 without theirs).
 *
 * A version raised by the change being judged needs `## <version>` in that package's CHANGELOG.md.
 * A lowered version (a revert) and a package the change creates are not judged; a private package
 * is never published, so it is not either.
 *
 * Usage:
 *   node scripts/check-version-changelogs.mjs --staged     # the index against MOL_PRECOMMIT_BASE or HEAD
 *   node scripts/check-version-changelogs.mjs --base=<rev>  # HEAD against <rev>; `ci` is the push or PR base
 *
 * Run from a tree with no `.git` (the release runs CI's steps on an export of the commit it pushes),
 * it reads history from the repository `MOL_INDEX_REPO` names, up to `MOL_INDEX_TIP` when that is
 * set: the export's own directory is no repository, and the one around it is not molecule
 * (2026-11-26: the pre-push run failed on `bad object` for main's tip).
 */
import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import process from 'node:process'

import { ciBase } from './check-framework-conformance.mjs'
import { isMainModule } from './lib/is-main.mjs'

/**
 * The numeric `major.minor.patch` of a version, or null when it has none.
 *
 * @param version - A version string.
 * @returns The three numbers, or null.
 */
function core(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version)
  return match ? match.slice(1).map(Number) : null
}

/**
 * Whether `to` is a lower version than `from` (a revert), by `major.minor.patch`.
 *
 * @param from - The earlier version.
 * @param to - The later version.
 * @returns True when the version went down.
 */
function lowered(from, to) {
  const [a, b] = [core(from), core(to)]
  if (!a || !b) return false
  const differs = a.findIndex((part, i) => part !== b[i])
  return differs !== -1 && b[differs] < a[differs]
}

/**
 * Whether a CHANGELOG has a `## <version>` heading.
 *
 * @param text - The CHANGELOG text, or null when there is none.
 * @param version - The version heading to find.
 * @returns Whether the heading is there.
 */
function hasSection(text, version) {
  return (text ?? '').split(/\r?\n/).some((line) => line.trim() === `## ${version}`)
}

/**
 * Parse a manifest, or null when it is absent or malformed (the syntax gates report that).
 *
 * @param text - The package.json text, or null.
 * @returns The manifest, or null.
 */
function manifest(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch (_error) {
    // Malformed JSON is check-syntax's finding; it reads as no package here.
    return null
  }
}

/**
 * The packages whose version the change raises while their CHANGELOG.md lacks that version.
 *
 * @param options - What to compare.
 * @param options.manifests - The changed `packages/**\/package.json` paths.
 * @param options.before - Read a file as it was before the change (null when absent).
 * @param options.after - Read a file as the change leaves it (null when absent).
 * @returns One entry per package missing its section, sorted by name.
 */
export function versionsWithoutChangelog({ manifests, before, after }) {
  const missing = []
  for (const file of manifests) {
    if (!/^packages\/.+\/package\.json$/s.test(file)) continue
    const [was, now] = [manifest(before(file)), manifest(after(file))]
    if (!was?.version || !now?.version || now.private || !now.name?.startsWith('@molecule/'))
      continue
    if (was.version === now.version || lowered(was.version, now.version)) continue
    const changelog = file.replace(/package\.json$/, 'CHANGELOG.md')
    if (hasSection(after(changelog), now.version)) continue
    missing.push({ name: now.name, from: was.version, to: now.version, changelog })
  }
  return missing.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Print one finding per package, each with its fix.
 *
 * @param missing - The findings from {@link versionsWithoutChangelog}.
 */
function report(missing) {
  for (const { name, from, to, changelog } of missing) {
    console.error(
      `✗ ${name}: the version goes ${from} → ${to}, but ${changelog} has no \`## ${to}\` section.`,
    )
    console.error(
      `  Fix: stage the ${changelog} that \`changeset version\` wrote (\`git add ${changelog}\`). ` +
        'A commit of tracked files only (`git commit -a`, `git add -u`) leaves a new CHANGELOG.md out.',
    )
  }
}

/**
 * Read many files at revisions in one `git cat-file --batch` call: a release's version commit
 * changes hundreds of manifests, and one `git show` per file took longer than CI should.
 *
 * @param cwd - The repository.
 * @param specs - `<revision>:<path>` names; `:<path>` is the index.
 * @returns Each name mapped to its text, or to null when it names no file.
 */
export function readRevisionFiles(cwd, specs) {
  const files = new Map()
  if (!specs.length) return files
  const out = execFileSync('git', ['-C', cwd, 'cat-file', '--batch', '-z'], {
    input: `${specs.join('\0')}\0`,
    maxBuffer: 1 << 30,
  })
  let at = 0
  for (const spec of specs) {
    // A missing response repeats the spec, which can contain a newline in its path.
    const missing = Buffer.from(`${spec} missing\n`)
    if (out.subarray(at, at + missing.length).equals(missing)) {
      files.set(spec, null)
      at += missing.length
      continue
    }
    const lineEnd = out.indexOf(10, at)
    const header = /^[0-9a-f]+ (\S+) (\d+)$/.exec(out.subarray(at, lineEnd).toString('utf8'))
    at = lineEnd + 1
    if (!header) {
      files.set(spec, null)
      continue
    }
    const size = Number(header[2])
    files.set(spec, header[1] === 'blob' ? out.subarray(at, at + size).toString('utf8') : null)
    at += size + 1
  }
  return files
}

/**
 * Judge the manifests one change touches, reading every file it needs in one batch.
 *
 * @param cwd - The repository.
 * @param manifests - The changed manifest paths.
 * @param before - The revision before the change.
 * @param after - The revision the change leaves ('' for the index).
 * @returns The findings from {@link versionsWithoutChangelog}.
 */
export function judgeChange(cwd, manifests, before, after) {
  const name = (revision, file) => `${revision}:${file}`
  const files = readRevisionFiles(
    cwd,
    manifests.flatMap((file) => [
      name(before, file),
      name(after, file),
      name(after, file.replace(/package\.json$/, 'CHANGELOG.md')),
    ]),
  )
  return versionsWithoutChangelog({
    manifests,
    before: (file) => files.get(name(before, file)) ?? null,
    after: (file) => files.get(name(after, file)) ?? null,
  })
}

if (isMainModule(import.meta.url)) {
  const repo = process.env.MOL_INDEX_REPO || '.'
  const tip = process.env.MOL_INDEX_TIP || 'HEAD'
  const git = (args) =>
    execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 1 << 28 })
  const changedManifests = (args) =>
    git([
      'diff',
      '--name-only',
      '-z',
      '--no-renames',
      ...args,
      '--',
      ':(glob)packages/**/package.json',
    ])
      .split('\0')
      .filter(Boolean)
  const baseArg = process.argv.find((arg) => arg.startsWith('--base='))?.slice('--base='.length)
  let missing
  if (process.argv.includes('--staged')) {
    const base = process.env.MOL_PRECOMMIT_BASE || 'HEAD'
    missing = judgeChange(repo, changedManifests(['--cached', base]), base, '')
  } else if (baseArg) {
    const base =
      baseArg === 'ci'
        ? ciBase(process.env, (ref) => git(['merge-base', ref, tip]).trim())
        : baseArg
    if (!base) {
      console.log(
        'version-changelogs: no push or pull-request base, so no range is judged here (the pre-commit hook judges each commit)',
      )
      process.exit(0)
    }
    missing = judgeChange(repo, changedManifests([base, tip]), base, tip)
  } else {
    console.error('usage: check-version-changelogs.mjs --staged | --base=<rev|ci>')
    process.exit(2)
  }
  report(missing)
  if (missing.length) process.exit(1)
}
