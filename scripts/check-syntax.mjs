#!/usr/bin/env node
/**
 * Every TypeScript source file must PARSE. No type-check, no build: the
 * TypeScript parser alone, so it runs in milliseconds per file at commit time
 * and in seconds over the whole fleet in CI.
 *
 * WHY THIS GATE EXISTS: a module-level JSDoc `@example` in
 * `@molecule/app-search-ui-react` carried `/* … *\/` comments inside its code
 * fence. The inner `*\/` ended the doc comment, everything after it compiled as
 * code, and the package failed to build — after it had cleared lint, format,
 * the doc-example verifier (which reads the fence text, never the file as
 * TypeScript sees it) and a commit made with `--no-verify`. The first thing
 * that actually parsed the file was the owner's `npm run trust:new`, minutes
 * before a publish. A parse error is the cheapest class of defect there is;
 * it must never travel that far.
 *
 * Usage:
 *   node scripts/check-syntax.mjs                     # every packages/** src file
 *   node scripts/check-syntax.mjs <file|dir> …        # only those (staged files, a package dir)
 */
import console from 'node:console'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXT = new Set(['.ts', '.tsx', '.mts', '.cts'])

/**
 * Collects TypeScript source files under a path (a file is returned as-is).
 *
 * @param p - A file or directory.
 * @param out - Accumulator.
 */
function collect(p, out) {
  if (!existsSync(p)) return
  const st = statSync(p)
  if (st.isFile()) {
    if (EXT.has(extname(p)) && !p.endsWith('.d.ts')) out.push(p)
    return
  }
  for (const entry of readdirSync(p)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue
    collect(join(p, entry), out)
  }
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const files = []
if (args.length) {
  for (const a of args) collect(resolve(ROOT, a), files)
} else {
  collect(join(ROOT, 'packages'), files)
}

let bad = 0
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind)
  const diags = sf.parseDiagnostics ?? []
  if (!diags.length) continue
  bad++
  console.error(`✗ ${relative(ROOT, file)}`)
  for (const d of diags.slice(0, 3)) {
    const { line, character } = sf.getLineAndCharacterOfPosition(d.start ?? 0)
    console.error(
      `    ${line + 1}:${character + 1}  TS${d.code}  ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`,
    )
  }
  if (diags.length > 3) console.error(`    …and ${diags.length - 3} more`)
}

if (bad) {
  console.error(
    `\n✗ ${bad} of ${files.length} file(s) do not parse as TypeScript. A \`*/\` inside a JSDoc example ends the doc comment early — write the example without block comments.`,
  )
  process.exit(1)
}
console.log(`✓ ${files.length} TypeScript file(s) parse`)
