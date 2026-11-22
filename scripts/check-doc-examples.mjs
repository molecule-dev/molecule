#!/usr/bin/env node
/* global console, process */
/**
 * Guard: every Svelte, Vue and Angular example in a package's JSDoc compiles with its
 * framework's own compiler (`scripts/lib/doc-examples.mjs` says how, and why).
 *
 * Usage:
 *   node scripts/check-doc-examples.mjs                 # report every package source file
 *   node scripts/check-doc-examples.mjs --check         # exit 1 on any example that does not compile (CI)
 *   node scripts/check-doc-examples.mjs --check <files> # only these files (a commit's staged sources)
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { exampleProblem, jsdocExamples } from './lib/doc-examples.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const given = args.filter((a) => !a.startsWith('--'))

/** A package source file whose JSDoc reaches a reader (not a test, not a declaration file). */
const isSource = (file) =>
  /^packages\/.+\/src\/.+\.tsx?$/.test(file) &&
  !file.includes('/__tests__/') &&
  !file.endsWith('.d.ts')

/** Directories that hold no package source. */
const SKIP = new Set(['node_modules', 'dist', '.svelte-kit', '.turbo', 'coverage'])

/**
 * Every file under `packages/`, read from the disk: the release runs this check in a
 * `git archive` export, which has no git index to list.
 *
 * @param dir - The directory to walk.
 * @returns The files' paths, relative to the repo root.
 */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else if (entry.isFile()) out.push(relative(ROOT, path).split('\\').join('/'))
  }
  return out
}

const files = (given.length > 0 ? given : walk(join(ROOT, 'packages'))).filter(
  (file) => isSource(file) && existsSync(join(ROOT, file)),
)
if (files.length === 0) {
  // A check that reads no file passes everything; say so instead.
  console.error('✗ check-doc-examples: found no package source file to check')
  process.exit(1)
}

/** How to fix an example of each language, for the report. */
const FIX = {
  svelte:
    'write it as a Svelte 5 component that compiles in runes mode ($props(), $derived, onclick, {@render children?.()}), with every tag closed',
  vue: 'write it as a single-file component that compiles: <script setup lang="ts"> and a <template> with every tag closed',
  ts: 'make the @Component template one Angular parses: close every element; self-close only void and custom elements',
  html: 'make the template one Angular parses: close every element; self-close only void and custom elements',
}

const problems = []
let examples = 0
for (const file of files) {
  for (const example of jsdocExamples(readFileSync(join(ROOT, file), 'utf8'), file)) {
    examples += 1
    const problem = exampleProblem(example)
    if (problem) problems.push({ ...example, problem })
  }
}

if (problems.length === 0) {
  console.log(`✓ doc examples compile (${examples} example(s) in ${files.length} file(s))`)
  process.exit(0)
}
console.log(`✗ ${problems.length} doc example(s) do not compile:\n`)
for (const p of problems)
  console.log(`  ${p.file}:${p.line} (\`\`\`${p.lang}): ${p.problem}\n    → ${FIX[p.lang]}`)
console.log(
  '\nA model copies these examples from the README and the .d.ts, so each one must compile as written.',
)
process.exit(CHECK ? 1 : 0)
