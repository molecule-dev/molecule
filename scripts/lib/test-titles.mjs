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
 * The file is parsed with TypeScript, so only real calls count: an "it (" or "test (" in a
 * string, a comment or a fixture's source text declares nothing (a text scan read the assertion
 * string "update it (`npm install …`)" as a test titled "npm install …").
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import ts from 'typescript'

/** A test file name: `x.test.ts`, `x.spec.tsx`, `x.svelte.test.ts`, `x.test.mjs`, … */
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/

/** The test functions whose calls declare titles. */
const TEST_FUNCTIONS = new Set(['it', 'test'])

/** Modifiers whose call takes a table first and returns the call that takes the title. */
const TABLES = new Set(['each', 'for'])

/** Modifiers whose call takes a condition first and returns the call that takes the title. */
const CONDITIONS = new Set(['runIf', 'skipIf'])

/**
 * The script kind TypeScript parses a file name as (`x.tsx` holds JSX, `x.ts` may hold `<T>x`).
 *
 * @param fileName - The file's name.
 * @returns The kind.
 */
const scriptKindOf = (fileName) =>
  /\.tsx$/.test(fileName)
    ? ts.ScriptKind.TSX
    : /\.jsx$/.test(fileName)
      ? ts.ScriptKind.JSX
      : /\.[cm]?js$/.test(fileName)
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS

/**
 * The modifiers of a test function reference (`it.concurrent.only` → `['concurrent', 'only']`).
 *
 * @param node - A callee or tag.
 * @returns The modifiers, or null when the reference is not `it` or `test` (`cache.it` is not).
 */
const modifiersOf = (node) => {
  const names = []
  let n = node
  while (ts.isPropertyAccessExpression(n)) {
    names.unshift(n.name.text)
    n = n.expression
  }
  return ts.isIdentifier(n) && TEST_FUNCTIONS.has(n.text) ? names : null
}

/**
 * The modifiers of the test function a call declares a title with, when it does.
 *
 * @param call - A call expression.
 * @returns The modifiers, or null when its first argument is not a test title.
 */
const titleCallModifiers = (call) => {
  const callee = call.expression
  const direct = modifiersOf(callee)
  // `it.each([...])` itself takes the table; the call it returns takes the title.
  if (direct) return direct.some((m) => TABLES.has(m) || CONDITIONS.has(m)) ? null : direct
  if (ts.isCallExpression(callee)) {
    const first = modifiersOf(callee.expression)
    return first?.some((m) => TABLES.has(m) || CONDITIONS.has(m)) ? first : null
  }
  if (ts.isTaggedTemplateExpression(callee)) {
    const first = modifiersOf(callee.tag)
    return first?.some((m) => TABLES.has(m)) ? first : null
  }
  return null
}

/**
 * The titles one test file declares, in order.
 *
 * @param text - The file's source.
 * @param [fileName] - Its name, which picks the parse (`.tsx` and `.jsx` hold JSX); `x.test.ts` by default.
 * @returns The titles as written between their quotes, a `'a ' + 'b'` title joined (a title
 *   declared twice is listed twice).
 */
export const titlesIn = (text, fileName = 'x.test.ts') => {
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    false,
    scriptKindOf(fileName),
  )
  // A title as written between its quotes; a long one split with `+` reads as its pieces joined.
  const titleOf = (node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    )
      return text.slice(node.getStart(source) + 1, node.end - 1)
    if (ts.isParenthesizedExpression(node)) return titleOf(node.expression)
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = titleOf(node.left)
      const right = left === null ? null : titleOf(node.right)
      return right === null ? null : left + right
    }
    return null
  }
  const out = []
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const modifiers = titleCallModifiers(node)
      const title = node.arguments.length > 0 ? titleOf(node.arguments[0]) : null
      if (modifiers && !modifiers.some((m) => m === 'skip' || m === 'todo') && title !== null)
        out.push(title)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
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
    for (const title of titlesIn(readFileSync(join(dir, file), 'utf8'), file))
      if (!out.has(title)) out.set(title, file)
  return out
}
