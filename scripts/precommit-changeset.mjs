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
for (const file of changed) {
  const source = file.match(/^(packages\/.+?)\/src\/(.+)$/)
  const publishedSource = source && !source[2].startsWith('__tests__/')
  const manifestFile = file.match(/^(packages\/.+)\/package\.json$/)
  if (!publishedSource && !(manifestFile && exportsChanged(file))) continue
  const dir = source?.[1] ?? manifestFile[1]
  const pkg = manifest(dir)
  if (pkg?.name?.startsWith('@molecule/') && !pkg.private) needingChangeset.add(pkg.name)
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

const missing = [...needingChangeset].filter((name) => !covered.has(name)).sort()
for (const name of missing) {
  console.error(`✗ ${name}: staged published-file changes have no pending changeset.`)
  console.error(
    `  Fix: run \`npx changeset\`, select ${name}, then stage the new .changeset/*.md file.`,
  )
}
if (missing.length) process.exit(1)
