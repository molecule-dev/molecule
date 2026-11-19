/**
 * The test titles a package's test files declare, read from their source.
 *
 * A title is the first argument of `it(…)` or `test(…)`, including the forms that take a table
 * or a condition first (`it.each([...])('%s …')`, a tagged-template table
 * (`it.each\`a | b\`('$a …')`), `it.for(...)`, `it.runIf(x)(…)`, `it.skipIf(x)(…)`) and the modifiers (`it.concurrent`, `it.only`, `it.fails`). A table title
 * is read as written, with its `%s`/`$name` placeholders, because the counterpart of a table
 * test is a table test with the same template. `.skip` and `.todo` titles declare no test that
 * runs and are not read; `describe` names are not read.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** A test file name: `x.test.ts`, `x.spec.tsx`, `x.svelte.test.ts`, `x.test.mjs`, … */
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/

/**
 * The index just past the backtick closing a template literal, skipping escapes and the
 * strings, templates and brackets inside each `${…}`.
 *
 * @param text - The source.
 * @param from - The index after the opening backtick.
 * @returns The index after the closing backtick, or -1 when it never closes.
 */
const templateEnd = (text, from) => {
  for (let i = from; i >= 0 && i < text.length; i++) {
    if (text[i] === '\\') i++
    else if (text[i] === '`') return i + 1
    else if (text[i] === '$' && text[i + 1] === '{') {
      const end = closeOf(text, i + 2)
      if (end < 0) return -1
      i = end - 1
    }
  }
  return -1
}

/**
 * The index just past the bracket closing the one opened right before `from`, skipping
 * strings, template literals and comments.
 *
 * @param text - The source.
 * @param from - The index after the opening bracket.
 * @returns The index after the closing bracket, or -1 when it never closes.
 */
const closeOf = (text, from) => {
  let depth = 1
  for (let i = from; i < text.length; i++) {
    const c = text[i]
    if (c === '`') {
      const end = templateEnd(text, i + 1)
      if (end < 0) return -1
      i = end - 1
    } else if (c === '"' || c === "'") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++
    } else if (c === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i)
      i = end === -1 ? text.length : end
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      i = end === -1 ? text.length : end + 1
    } else if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  return -1
}

/**
 * The titles one test file declares, in order.
 *
 * @param text - The file's source.
 * @returns The titles (a title declared twice is listed twice).
 */
export const titlesIn = (text) => {
  const out = []
  for (const m of text.matchAll(/(?<![\w$.])(?:it|test)((?:\s*\.\s*[A-Za-z]+)*)\s*([(`])/g)) {
    const modifiers = m[1]
      .split('.')
      .map((x) => x.trim())
      .filter(Boolean)
    if (modifiers.some((x) => x === 'skip' || x === 'todo')) continue
    const table = modifiers.some((x) => ['each', 'for'].includes(x))
    // A tagged template is a table (`it.each\`a | b\`(…)`), nothing else.
    if (m[2] === '`' && !table) continue
    let at = m.index + m[0].length
    // A table or a condition comes first: skip its call (or template), then read the title of the
    // call it returns.
    if (m[2] === '`') {
      at = templateEnd(text, at)
      if (at < 0) continue
      const next = /^\s*\(/.exec(text.slice(at))
      if (!next) continue
      at += next[0].length
    } else if (table || modifiers.some((x) => ['runIf', 'skipIf'].includes(x))) {
      at = closeOf(text, at)
      if (at < 0) continue
      const next = /^\s*\(/.exec(text.slice(at))
      if (!next) continue
      at += next[0].length
    }
    const title = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/s.exec(text.slice(at))
    if (title) out.push(title[2])
  }
  return out
}

/**
 * Every test file under a package's `src/`, skipping `node_modules` and `dist`.
 *
 * @param dir - The package directory (absolute).
 * @returns Paths relative to `dir`, sorted.
 */
export const testFilesOf = (dir) => {
  const out = []
  const walk = (p) => {
    if (!existsSync(p)) return
    for (const e of readdirSync(p, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue
      const q = join(p, e.name)
      if (e.isDirectory()) walk(q)
      else if (TEST_FILE.test(e.name)) out.push(relative(dir, q))
    }
  }
  walk(join(dir, 'src'))
  return out.sort()
}

/**
 * Title → the first test file (relative to the package) declaring it.
 *
 * @param dir - The package directory (absolute).
 * @param [keep] - Which test files to read (relative paths); every one by default.
 * @returns The map.
 */
export const testTitlesOf = (dir, keep = () => true) => {
  const out = new Map()
  for (const file of testFilesOf(dir).filter(keep))
    for (const title of titlesIn(readFileSync(join(dir, file), 'utf8')))
      if (!out.has(title)) out.set(title, file)
  return out
}
