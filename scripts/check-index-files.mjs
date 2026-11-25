/** Check the candidate files in the snapshot created by run-on-index.mjs. */
import { spawnSync } from 'node:child_process'
import console from 'node:console'
import { existsSync, lstatSync, readFileSync } from 'node:fs'
import process from 'node:process'

const changed = readFileSync(process.env.MOL_INDEX_PATHS_FILE, 'utf8').split('\0').filter(Boolean)
const files = changed
  .filter((file) => existsSync(file) && lstatSync(file).isFile())
  .map((file) => `./${file}`)
const code = files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|svelte)$/.test(file))
const format = files.filter((file) =>
  /\.(ts|tsx|js|jsx|mjs|cjs|svelte|json|md|css|scss|html|yaml|yml)$/.test(file),
)
const typescript = files.filter((file) => /\.(ts|tsx|mts|cts)$/.test(file))
const peerPaths = changed.filter((file) => /^packages\/.+\/(?:package\.json$|src\/)/.test(file))

/**
 * Run one named gate from the exported tree and preserve its output on failure.
 *
 * @param name - The name reported to the committer.
 * @param bin - Its executable.
 * @param args - Command arguments.
 * @param input - Optional stdin for the peer-floor package selector.
 */
function check(name, bin, args, input) {
  const child = spawnSync(bin, args, { input, stdio: ['pipe', 'inherit', 'inherit'] })
  if (child.status === 0) return
  console.error(
    `pre-commit: ${name} failed (${child.error?.message ?? child.signal ?? child.status})`,
  )
  process.exit(child.status || 1)
}

if (format.length) check('prettier', './node_modules/.bin/prettier', ['--check', ...format])
if (code.length)
  check('eslint', './node_modules/.bin/eslint', [
    '--no-error-on-unmatched-pattern',
    '--max-warnings',
    '0',
    ...code,
  ])
if (typescript.length)
  check('check-syntax', process.execPath, ['scripts/check-syntax.mjs', ...typescript])
// Deletions can change what a package exports too, and no peer lookup runs
// unless the proposed commit touches a package manifest or its src/ tree.
if (peerPaths.length)
  check(
    'check-peer-floors',
    process.execPath,
    ['scripts/check-peer-floors.mjs', '--paths-from-stdin'],
    `${peerPaths.join('\n')}\n`,
  )
const compilerPaths = changed.filter((file) => /^packages\/.+\/tsconfig[^/]*\.json$/.test(file))
if (peerPaths.length || compilerPaths.length)
  check(
    'check-peer-floor-types',
    process.execPath,
    ['scripts/check-peer-floor-types.mjs', '--paths-from-stdin'],
    `${[...peerPaths, ...compilerPaths].join('\n')}\n`,
  )
