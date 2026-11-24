#!/usr/bin/env node
/**
 * Every relative import in a committed file must resolve to a file the same
 * commit carries.
 *
 * WHY THIS GATE EXISTS: a file git does not track (never added, or matched by
 * an ignore rule such as `packages/**\/src/**\/*.js`, the compiled-output rule)
 * still sits in the checkout, so every local build, test and lint resolves it.
 * A clean clone does not have it, so CI and every consumer fail on the import.
 * On 2026-11-13 app-ui-svelte's conformance adapter imported `./bag.svelte.js`,
 * which that rule ignored: the package was green locally, molecule CI failed,
 * and the release waited on the fix.
 *
 * Rules:
 * - "Carried" means present in the index (`git ls-files`), so the check judges
 *   the commit being made, including a private `GIT_INDEX_FILE` and the
 *   temporary index of a pathspec commit. Source is read from the index blob,
 *   never the worktree.
 * - Relative specifiers only (`./`, `../`), from `import`/`export … from`,
 *   `import()` and `require()` in TS/JS files and the `<script>` blocks of
 *   `.svelte`/`.vue` files. Comments and strings are not imports.
 * - A `.js`/`.jsx`/`.mjs`/`.cjs` specifier also resolves to its TypeScript
 *   source (`.ts`/`.tsx`/`.mts`/`.cts`); an extensionless one also to the usual
 *   extensions and `index` files. Any carried candidate satisfies the import.
 * - Reported: an import whose target EXISTS in the worktree but is not carried,
 *   or that this commit deletes. Any other import that resolves nowhere already
 *   fails locally, where the compiler names it. A deleted target is reported
 *   even when it is gone from the worktree, because the importer may be gone
 *   from the worktree too, so nothing local runs it (2026-11-22: a commit kept
 *   two tests whose imported rule files it deleted, and CI failed on them).
 * - Build output is exempt: a target with a `dist` path segment is what
 *   `npm run build` writes, and CI builds before it tests.
 *
 * Fix an offender by committing the target. When an ignore rule matches it
 * (the report names the rule), rename it so the rule does not match (a
 * `.svelte.js` module can be `.svelte.ts`), or add a narrow `!` negation.
 *
 * Usage:
 *   node scripts/check-tracked-imports.mjs            # every carried file
 *   node scripts/check-tracked-imports.mjs --staged   # pre-commit: added/changed files, and importers of deleted ones
 *   node scripts/check-tracked-imports.mjs <files…>   # the named carried files
 *
 * `--staged` diffs against `MOL_PRECOMMIT_BASE` when it is set (the pinned
 * parent of a private-index commit, see `.husky/pre-commit`), else `HEAD`.
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { statSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import process from 'node:process'

import ts from 'typescript'

/** Files whose imports are read. */
export const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|svelte|vue)$/

/** Extensions a JS-style specifier may name while the source is TypeScript. */
const TS_SOURCE_FOR = {
  '.js': ['.ts', '.tsx'],
  '.jsx': ['.tsx'],
  '.mjs': ['.mts'],
  '.cjs': ['.cts'],
}

/** What an extensionless specifier may resolve to, in resolver order. */
const IMPLICIT = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.json',
  '/index.ts',
  '/index.tsx',
  '/index.js',
]

/**
 * The relative module specifiers a source file imports.
 *
 * @param text - File contents.
 * @param fileName - Its path (decides whether `<script>` blocks are extracted).
 * @returns Relative specifiers, in source order.
 */
export function relativeImports(text, fileName) {
  let code = text
  if (/\.(?:svelte|vue)$/.test(fileName)) {
    code = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n')
  }
  return ts
    .preProcessFile(code, true, true)
    .importedFiles.map((f) => f.fileName)
    .filter((s) => s.startsWith('./') || s.startsWith('../'))
}

/**
 * The repo paths a relative specifier may resolve to.
 *
 * @param importer - Repo-relative path of the importing file.
 * @param specifier - The relative specifier.
 * @returns Candidate repo-relative paths; empty when it leaves the repo.
 */
export function candidates(importer, specifier) {
  const bare = specifier.replace(/[?#].*$/, '')
  const target = normalize(join(dirname(importer), bare))
  if (target.startsWith('..')) return []
  const ext = /\.[^./]+$/.exec(target)?.[0] ?? ''
  const stem = ext ? target.slice(0, -ext.length) : target
  const found = [target]
  for (const alt of TS_SOURCE_FOR[ext] ?? []) found.push(stem + alt)
  if (!(ext in TS_SOURCE_FOR) && !/\.(?:[cm]?[jt]sx?|json|svelte|vue|css|scss)$/.test(target)) {
    for (const suffix of IMPLICIT) found.push(target + suffix)
  }
  return found
}

/**
 * Whether a path is build output, which the build writes before CI tests.
 *
 * @param path - Repo-relative path.
 * @returns True under a `dist` directory.
 */
export function isBuildOutput(path) {
  return path.split('/').includes('dist')
}

/**
 * Finds imports whose target is not carried while it exists in the worktree or
 * this commit deletes it.
 *
 * @param input - What to judge.
 * @param input.files - Repo-relative importers to check.
 * @param input.carried - Repo-relative paths the commit carries.
 * @param input.read - Reads an importer's committed contents.
 * @param input.exists - Whether a path is a file in the worktree.
 * @param [input.deleted] - Repo-relative paths this commit deletes.
 * @returns The offenders; `deleted` is true for a target this commit deletes.
 */
export function findUncarried({ files, carried, read, exists, deleted = new Set() }) {
  const offenders = []
  for (const importer of files) {
    if (!SOURCE_FILE.test(importer)) continue
    for (const specifier of relativeImports(read(importer), importer)) {
      const options = candidates(importer, specifier)
      if (options.some((p) => carried.has(p))) continue
      const target = options.find((p) => exists(p)) ?? options.find((p) => deleted.has(p))
      if (target && !isBuildOutput(target))
        offenders.push({ importer, specifier, target, deleted: deleted.has(target) })
    }
  }
  return offenders
}

/**
 * Runs git in the current repository.
 *
 * @param args - Git arguments.
 * @param [options] - Extra exec options.
 * @returns Stdout.
 */
function git(args, options = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 30, ...options })
}

/**
 * Reads many index blobs in one `git cat-file --batch` call.
 *
 * @param paths - Carried repo-relative paths.
 * @returns Contents by path.
 */
function readIndexBlobs(paths) {
  const contents = new Map()
  const chunk = 2000
  for (let i = 0; i < paths.length; i += chunk) {
    const slice = paths.slice(i, i + chunk)
    const out = execFileSync('git', ['cat-file', '--batch'], {
      input: slice.map((p) => `:${p}\n`).join(''),
      maxBuffer: 1 << 30,
    })
    let at = 0
    for (const path of slice) {
      const eol = out.indexOf(10, at)
      const header = out.subarray(at, eol).toString()
      at = eol + 1
      if (header.endsWith(' missing')) continue
      const size = Number(header.split(' ')[2])
      contents.set(path, out.subarray(at, at + size).toString('utf8'))
      at += size + 1
    }
  }
  return contents
}

/**
 * Why a path is absent from the index: the ignore rule that matches it, or untracked.
 *
 * @param path - Repo-relative path.
 * @returns A short reason.
 */
function absenceReason(path) {
  try {
    const rule = git(['check-ignore', '-v', '--no-index', path]).trim()
    return `git ignores it (${rule.split('\t')[0]})`
  } catch (_error) {
    // check-ignore exits 1 when no rule matches: the file is simply untracked.
    return 'git does not track it'
  }
}

/**
 * Entry point.
 *
 * @param argv - CLI arguments.
 * @returns Exit code.
 */
function main(argv) {
  const carried = new Set(git(['ls-files', '-z']).split('\0').filter(Boolean))
  let files
  let deleted = new Set()
  if (argv[0] === '--staged') {
    const base = process.env.MOL_PRECOMMIT_BASE || 'HEAD'
    const diff = (filter) =>
      git([
        'diff',
        '--cached',
        '--no-renames',
        '--name-only',
        '-z',
        `--diff-filter=${filter}`,
        base,
      ])
        .split('\0')
        .filter(Boolean)
    files = new Set(diff('AM'))
    deleted = new Set(diff('D'))
    // A carried file that names any deleted module's stem may import it. One grep for every stem: a
    // grep per deleted file took over 15 minutes for a commit that deleted 1,667 files of mlcl's
    // templates (2026-11-24). The patterns go on stdin, so no argument list grows with the commit.
    const stems = [
      ...new Set(
        [...deleted].map((path) =>
          path
            .split('/')
            .pop()
            .replace(/\.[^.]+$/, ''),
        ),
      ),
    ].filter(Boolean)
    if (stems.length > 0) {
      let importers = []
      try {
        importers = git(['grep', '--cached', '-l', '-F', '-f', '-'], {
          input: `${stems.join('\n')}\n`,
        })
          .split('\n')
          .filter(Boolean)
      } catch (_error) {
        // git grep exits 1 when nothing matches: no file names a deleted one.
      }
      for (const importer of importers) files.add(importer)
    }
  } else if (argv.length > 0) {
    files = new Set(argv.filter((p) => carried.has(p)))
  } else {
    files = new Set([...carried].filter((p) => SOURCE_FILE.test(p)))
  }
  const sources = [...files].filter((p) => SOURCE_FILE.test(p) && carried.has(p))
  const blobs = readIndexBlobs(sources)
  const offenders = findUncarried({
    files: sources,
    carried,
    read: (p) => blobs.get(p) ?? '',
    exists: (p) => {
      try {
        return statSync(p).isFile()
      } catch (_error) {
        // No such path in the worktree: unless this commit deletes it, the import resolves
        // nowhere, which the compiler reports locally.
        return false
      }
    },
    deleted,
  })
  if (offenders.length === 0) {
    console.log(`✓ tracked imports: ${sources.length} file(s), every relative import is committed`)
    return 0
  }
  console.error(`✗ ${offenders.length} import(s) name a file this commit does not carry:`)
  for (const o of offenders) {
    const reason = o.deleted ? 'this commit deletes it' : absenceReason(o.target)
    console.error(`  ${o.importer}: '${o.specifier}' → ${o.target} — ${reason}`)
  }
  console.error(
    '  A clean clone (CI, every consumer) cannot resolve these. Commit the target; if an ignore rule' +
      ' matches it, rename it so the rule does not (a .svelte.js module can be .svelte.ts) or add a narrow `!` negation.' +
      ' When this commit deletes the target, change or delete each importer in the same commit.',
  )
  return 1
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)))
