#!/usr/bin/env node
/* global console, process */
/** Refuse a staged published-file change with no pending changeset for that package. */
import { spawnSync } from 'node:child_process'
import { isDeepStrictEqual } from 'node:util'

const base = process.env.MOL_PRECOMMIT_BASE || 'HEAD'

/**
 * Run git and return its stdout; exit with its status on failure unless allowed.
 *
 * @param args - git arguments.
 * @param [allowFailure] - Return null instead of exiting when git fails.
 * @returns stdout, or null for an allowed failure.
 */
function git(args, allowFailure = false) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 20 })
  if (result.status !== 0 && !allowFailure) {
    process.stderr.write(result.stderr ?? '')
    process.exit(result.status ?? 1)
  }
  return result.status === 0 ? result.stdout : null
}

const changed = git(['diff', '--cached', '--name-only', '--diff-filter=ACDMR', base, '--'])
  .split('\n')
  .filter(Boolean)

const blob = (revision, file) => git(['show', `${revision}:${file}`], true)
const manifest = (dir) => {
  const file = `${dir}/package.json`
  for (const text of [blob('', file), blob(base, file)]) {
    if (!text) continue
    try {
      return JSON.parse(text)
    } catch (_error) {
      // Syntax/metadata gates own malformed JSON; this gate only needs identity.
    }
  }
  return null
}

/**
 * Whether a staged package.json changed the package's public entry points.
 *
 * @param file - A staged package.json path.
 * @returns Whether its `exports` differ from the base revision.
 */
function exportsChanged(file) {
  const parse = (text) => {
    if (!text) return undefined
    try {
      return JSON.parse(text).exports
    } catch (_error) {
      // Malformed JSON is the syntax gate's finding; it reads as no exports here.
      return undefined
    }
  }
  return !isDeepStrictEqual(parse(blob('', file)), parse(blob(base, file)))
}

const needingChangeset = new Set()
/** Package name → its directory, for the packages that need a changeset. */
const packageDirs = new Map()
for (const file of changed) {
  const source = file.match(/^(packages\/.+?)\/src\/(.+)$/)
  // Nothing under a `__tests__/` directory is published, at any depth
  // (`src/composables/__tests__/` too): check:published-tests holds every build to that.
  const publishedSource = source && !/(^|\/)__tests__\//.test(source[2])
  const manifestFile = file.match(/^(packages\/.+)\/package\.json$/)
  if (!publishedSource && !(manifestFile && exportsChanged(file))) continue
  const dir = source?.[1] ?? manifestFile[1]
  // A package whose package.json leaves the index is removed by this commit: there is
  // no next version to describe, and a changeset naming it would break `changeset
  // version`. A deleted FILE in a package that stays still needs one.
  if (blob('', `${dir}/package.json`) === null) continue
  const pkg = manifest(dir)
  if (pkg?.name?.startsWith('@molecule/') && !pkg.private) {
    needingChangeset.add(pkg.name)
    packageDirs.set(pkg.name, dir)
  }
}

const covered = new Set()
const changesets = git(['ls-files', '--', '.changeset/*.md']).split('\n').filter(Boolean)
for (const file of changesets) {
  const text = blob('', file) ?? ''
  const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  for (const line of frontmatter.split(/\r?\n/)) {
    const entry = line.match(/^\s*['"]?(@molecule\/[^'":\s]+)['"]?\s*:/)
    if (entry) covered.add(entry[1])
  }
}

/**
 * The text of a CHANGELOG.md section: the lines under `## <version>` up to the next `## `.
 *
 * @param text - The CHANGELOG text, or null when there is none.
 * @param version - The version heading to find.
 * @returns The section body, or null when the CHANGELOG has no such heading.
 */
function changelogSection(text, version) {
  const lines = (text ?? '').split(/\r?\n/)
  const start = lines.findIndex((line) => line.trim() === `## ${version}`)
  if (start === -1) return null
  const end = lines.findIndex((line, i) => i > start && /^## /.test(line))
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n')
}

const uncovered = [...needingChangeset].filter((name) => !covered.has(name)).sort()
// A package whose recorded version npm does not have yet was already versioned by an earlier
// commit: this change ships in that version, and a changeset would describe the NEXT one. Such a
// change needs no changeset, but it must add its line to that version's CHANGELOG section, so
// the published notes still describe it. npm is asked only when something is uncovered.
const shipsInRecordedVersion = new Map()
if (uncovered.length) {
  const { fetchPublishedVersions } = await import('./check-peer-floors.mjs')
  let published = null
  let unreachable = null
  try {
    published = await fetchPublishedVersions(uncovered)
  } catch (error) {
    unreachable = error instanceof Error ? error.message : String(error)
  }
  for (const name of uncovered) {
    const dir = packageDirs.get(name)
    const version = manifest(dir)?.version
    if (!version) continue
    if (!published) {
      shipsInRecordedVersion.set(name, { dir, version, unreachable })
      continue
    }
    if ((published.get(name) ?? []).includes(version)) continue
    const file = `${dir}/CHANGELOG.md`
    const staged = changelogSection(blob('', file), version)
    const before = changelogSection(blob(base, file), version)
    const addsLine = staged !== null && staged !== before && /^\s*- \S/m.test(staged)
    shipsInRecordedVersion.set(name, { dir, version, addsLine })
  }
}

const missing = uncovered.filter((name) => !shipsInRecordedVersion.get(name)?.addsLine)
for (const name of missing) {
  console.error(`✗ ${name}: staged published-file changes have no pending changeset.`)
  const recorded = shipsInRecordedVersion.get(name)
  if (recorded?.unreachable) {
    console.error(
      `  (npm could not say whether ${name}@${recorded.version} is published: ${recorded.unreachable})`,
    )
  } else if (recorded) {
    console.error(
      `  ${name}@${recorded.version} is not on npm yet, so this change ships in it: add a line under ` +
        `\`## ${recorded.version}\` in ${recorded.dir}/CHANGELOG.md and stage it.`,
    )
    continue
  }
  console.error(
    `  Fix: run \`npx changeset\`, select ${name}, then stage the new .changeset/*.md file.`,
  )
}

// A staged changeset may not name a private package. npm never gets it, so its version
// carries no meaning, and `changeset version` would still bump it and rewrite every
// manifest that pins it (2026-11-16: one `@molecule/app-framework-conformance: patch`
// line would have rewritten the devDependency of six packages held out of that release).
const privateNamed = []
// Nor one that no package in the tree being committed declares: `changeset version` stops on an
// unknown name, which a release meets only after the commit is long in (2026-11-17: a changeset
// named `@molecule/app-animation-canvas-react` for `@molecule/app-feature-animation-canvas-react`).
const unknownNamed = []
for (const file of changed.filter((path) => /^\.changeset\/[^/]+\.md$/.test(path))) {
  const frontmatter = (blob('', file) ?? '').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
  for (const line of frontmatter.split(/\r?\n/)) {
    const name = line.match(/^\s*['"]?(@molecule\/[^'":\s]+)['"]?\s*:/)?.[1]
    if (!name) continue
    const owners = (
      git(
        [
          'grep',
          '--cached',
          '-l',
          '-E',
          `"name"[[:space:]]*:[[:space:]]*"${name.replace(/[.]/g, '\\.')}"`,
          '--',
          ':(glob)**/package.json',
        ],
        true,
      ) ?? ''
    )
      .split('\n')
      .filter(Boolean)
    const declared = owners
      .map((owner) => JSON.parse(blob('', owner) ?? '{}'))
      .filter((pkg) => pkg.name === name)
    if (!declared.length) unknownNamed.push({ file, name })
    if (declared.some((pkg) => pkg.private)) privateNamed.push({ file, name })
  }
}
for (const { file, name } of privateNamed) {
  console.error(`✗ ${file} names ${name}, which is private and never published.`)
  console.error(`  Fix: delete the \`'${name}': …\` line from ${file}.`)
}
for (const { file, name } of unknownNamed) {
  console.error(`✗ ${file} names ${name}, which no package.json in this commit declares.`)
  console.error(
    `  Fix: use the package's exact "name", or stage that package together with ${file}.`,
  )
}
if (missing.length || privateNamed.length || unknownNamed.length) process.exit(1)
