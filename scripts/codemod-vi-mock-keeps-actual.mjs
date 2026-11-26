/**
 * Rewrite Molecule Vitest module factories so they keep the real module exports.
 *
 * Dry-run mode records every owned file, old and new factory text, and module totals. Apply mode
 * consumes that plan and refuses to write if a source slice changed after the dry run. Files with
 * uncommitted changes (another session's work in progress) are never candidates.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import console from 'node:console'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'

const ROOT = resolve(import.meta.dirname, '..')
const MOLECULE_MODULE = /^@molecule\/.+/
const FACTORY_KINDS = new Set([ts.SyntaxKind.ArrowFunction, ts.SyntaxKind.FunctionExpression])

/**
 * Whether a path is a package test file.
 *
 * @param file - A path relative to the molecule root.
 * @returns True for a test or spec file.
 */
function isTestFile(file) {
  return (
    /\.(?:[cm]?js|tsx?)$/.test(file) &&
    (file.includes('/__tests__/') || /\.(?:test|spec)\.[^/]+$/.test(file))
  )
}

/**
 * Recursively list package source files without entering generated dependencies.
 *
 * @param directory - The directory to scan.
 * @returns Absolute file paths.
 */
function filesUnder(directory) {
  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['.git', '.svelte-kit', '.turbo', 'coverage', 'dist', 'node_modules'].includes(entry.name))
      continue
    const file = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...filesUnder(file))
    else files.push(file)
  }
  return files
}

/**
 * Parse a test source file with the TypeScript parser.
 *
 * @param fileName - The file name used for parser mode.
 * @param text - Source text.
 * @returns The parsed source file.
 */
function parse(fileName, text) {
  const kind = fileName.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : fileName.endsWith('.mjs') || fileName.endsWith('.js')
      ? ts.ScriptKind.JS
      : ts.ScriptKind.TS
  return ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true, kind)
}

/**
 * Remove transparent TypeScript and parenthesis wrappers.
 *
 * @param node - The expression.
 * @returns The unwrapped expression.
 */
function unwrapExpression(node) {
  let current = node
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isPartiallyEmittedExpression(current))
  )
    current = current.expression
  return current
}

/**
 * Return a simple function parameter's name.
 *
 * @param parameter - The parameter.
 * @returns The identifier name, or null for a binding pattern.
 */
function parameterName(parameter) {
  let current = parameter?.name
  if (current && ts.isBindingElement(current)) current = current.name
  return current && ts.isIdentifier(current) ? current.text : null
}

/**
 * Whether a node is a nested function that must not contribute returns to the outer factory.
 *
 * @param node - The node.
 * @returns True for a nested function-like node.
 */
function isNestedFunction(node) {
  return (
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  )
}

/**
 * Walk a factory body without entering nested functions.
 *
 * @param node - The node to walk.
 * @param factory - The outer factory.
 * @param visit - The visitor.
 */
function walkFactory(node, factory, visit) {
  if (node !== factory && isNestedFunction(node)) return
  visit(node)
  ts.forEachChild(node, (child) => walkFactory(child, factory, visit))
}

/**
 * Whether an expression reads the factory's real-module loader or the same module via
 * `vi.importActual`.
 *
 * @param expression - The expression.
 * @param loader - The first factory parameter name.
 * @param specifier - The mocked module specifier.
 * @returns True when the expression reads the real module.
 */
function readsRealModule(expression, loader, specifier) {
  let node = unwrapExpression(expression)
  while (ts.isAwaitExpression(node)) node = unwrapExpression(node.expression)
  if (!ts.isCallExpression(node)) return false
  if (ts.isIdentifier(node.expression)) return loader !== null && node.expression.text === loader
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'vi' &&
    node.expression.name.text === 'importActual' &&
    node.arguments.length >= 1 &&
    ts.isStringLiteralLike(node.arguments[0]) &&
    node.arguments[0].text === specifier
  )
}

/**
 * Extract a factory's returns, declarations, and loader name.
 *
 * @param factory - The factory.
 * @returns Factory data.
 */
function factoryData(factory) {
  const loader = parameterName(factory.parameters[0]) ?? 'importOriginal'
  const returns = []
  const variables = new Map()
  if (ts.isBlock(factory.body)) {
    walkFactory(factory.body, factory, (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
        variables.set(node.name.text, node.initializer)
      if (ts.isReturnStatement(node) && node.expression) returns.push(node.expression)
    })
  } else returns.push(factory.body)
  return { loader, returns, variables }
}

/**
 * Whether an object expression already spreads the real module.
 *
 * @param object - The object expression.
 * @param data - Factory data.
 * @param specifier - The mocked module specifier.
 * @returns True when the object spreads the actual module.
 */
function spreadsRealModule(object, data, specifier) {
  const real = new Set(
    [...data.variables]
      .filter(([, value]) => readsRealModule(value, data.loader, specifier))
      .map(([name]) => name),
  )
  return object.properties.some(
    (property) =>
      ts.isSpreadAssignment(property) &&
      (readsRealModule(property.expression, data.loader, specifier) ||
        (ts.isIdentifier(property.expression) && real.has(property.expression.text))),
  )
}

/**
 * Whether every object a factory can return starts from the real module.
 *
 * @param factory - The factory.
 * @param specifier - The mocked module specifier.
 * @returns True when the factory already preserves actual exports.
 */
function keepsActual(factory, specifier) {
  const data = factoryData(factory)
  if (data.returns.length === 0) return false
  const objects = data.returns.map((expression) => {
    const node = unwrapExpression(expression)
    if (ts.isObjectLiteralExpression(node)) return node
    if (ts.isIdentifier(node) && data.variables.has(node.text)) {
      const value = unwrapExpression(data.variables.get(node.text))
      return ts.isObjectLiteralExpression(value) ? value : null
    }
    return null
  })
  return objects.every((object) => object !== null && spreadsRealModule(object, data, specifier))
}

/**
 * Find `vi.mock` and `vi.doMock` calls for Molecule modules.
 *
 * @param text - Source text.
 * @param fileName - The source file name.
 * @returns Offending mock calls.
 */
function offendingMocks(text, fileName) {
  const source = parse(fileName, text)
  const found = []
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === 'vi' &&
      ['mock', 'doMock'].includes(node.expression.name.text) &&
      node.arguments.length >= 2 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      MOLECULE_MODULE.test(node.arguments[0].text)
    ) {
      const factory = node.arguments[1]
      if (FACTORY_KINDS.has(factory.kind) && !keepsActual(factory, node.arguments[0].text))
        found.push({ call: node, factory, specifier: node.arguments[0].text, source })
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}

/**
 * Add the actual-module spread to a direct object expression.
 *
 * @param loader - The loader parameter name.
 * @returns The inserted source text.
 */
function actualSpread(loader) {
  return `...(await ${loader}<Record<string, unknown>>()),`
}

/**
 * Rewrite one offending factory into an async factory that preserves real exports.
 *
 * @param text - The complete source text.
 * @param match - The offending match.
 * @returns The rewritten factory text.
 */
function rewriteFactory(text, match) {
  const { factory, source } = match
  const data = factoryData(factory)
  const edits = []
  const hasAsync = factory.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
  )
  const hasSimpleLoader = parameterName(factory.parameters[0]) !== null

  if (!hasAsync)
    edits.push({ start: factory.getStart(source), end: factory.getStart(source), text: 'async ' })
  if (!hasSimpleLoader) {
    const parameterInsert = factory.parameters.pos
    edits.push({
      start: parameterInsert,
      end: parameterInsert,
      text: factory.parameters.length === 0 ? data.loader : `${data.loader}, `,
    })
  }

  for (const expression of data.returns) {
    const object = unwrapExpression(expression)
    if (ts.isObjectLiteralExpression(object)) {
      edits.push({
        start: object.getStart(source) + 1,
        end: object.getStart(source) + 1,
        text: actualSpread(data.loader),
      })
      continue
    }
    const oldExpression = text.slice(expression.getStart(source), expression.getEnd())
    edits.push({
      start: expression.getStart(source),
      end: expression.getEnd(),
      text: `({ ${actualSpread(data.loader)} ...(await (${oldExpression})) })`,
    })
  }

  if (data.returns.length === 0 && ts.isBlock(factory.body)) {
    const insert = factory.body.getEnd() - 1
    edits.push({
      start: insert,
      end: insert,
      text: `\n  return { ${actualSpread(data.loader)} }\n`,
    })
  }

  const start = factory.getStart(source)
  const end = factory.getEnd()
  let rewritten = text.slice(start, end)
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    rewritten =
      rewritten.slice(0, edit.start - start) + edit.text + rewritten.slice(edit.end - start)
  }
  return rewritten
}

/**
 * Rewrite all offending Molecule mocks in one source string.
 *
 * @param text - Source text.
 * @param fileName - The source file name.
 * @returns The rewritten source and match records.
 */
export function rewriteSource(text, fileName) {
  const matches = offendingMocks(text, fileName)
  const source = matches[0]?.source ?? parse(fileName, text)
  const records = matches.map(({ call, factory, specifier }) => ({
    specifier,
    method: call.expression.name.text,
    line: source.getLineAndCharacterOfPosition(call.getStart(source)).line + 1,
    start: factory.getStart(source),
    end: factory.getEnd(),
    oldFactory: text.slice(factory.getStart(source), factory.getEnd()),
    newFactory: rewriteFactory(text, { factory, source, specifier }),
  }))
  let rewritten = text
  for (const record of [...records].sort((left, right) => right.start - left.start)) {
    if (rewritten.slice(record.start, record.end) !== record.oldFactory)
      throw new Error(`source changed while rewriting ${fileName}:${record.line}`)
    rewritten = rewritten.slice(0, record.start) + record.newFactory + rewritten.slice(record.end)
  }
  return {
    text: rewritten,
    matches: records.map(({ specifier, method, line, oldFactory, newFactory }) => ({
      specifier,
      method,
      line,
      oldFactory,
      newFactory,
    })),
  }
}

/**
 * Read the initial dirty paths from the molecule git checkout.
 *
 * @returns Dirty paths relative to the molecule root.
 */
function dirtyPaths() {
  const output = execFileSync('git', ['status', '--short', '--untracked-files=all'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  return new Set(
    output
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3))
      .filter((file) => file.startsWith('packages/')),
  )
}

/**
 * Build a dry-run plan from the current checkout.
 *
 * @returns A JSON-serializable codemod plan.
 */
function buildPlan() {
  const dirty = dirtyPaths()
  const fileRecords = []
  const moduleCounts = new Map()
  const skipped = { dirty: [] }
  for (const absolute of filesUnder(resolve(ROOT, 'packages')).filter((file) =>
    isTestFile(relative(ROOT, file)),
  )) {
    const file = relative(ROOT, absolute)
    if (dirty.has(file)) {
      skipped.dirty.push(file)
      continue
    }
    const text = readFileSync(absolute, 'utf8')
    const result = rewriteSource(text, file)
    if (result.matches.length === 0) continue
    const matches = result.matches.map((match) => {
      moduleCounts.set(match.specifier, (moduleCounts.get(match.specifier) ?? 0) + 1)
      return match
    })
    fileRecords.push({
      file,
      sha256: createHash('sha256').update(text).digest('hex'),
      matchCount: matches.length,
      moduleCounts: Object.fromEntries(
        [...new Set(matches.map((match) => match.specifier))]
          .sort()
          .map((specifier) => [
            specifier,
            matches.filter((match) => match.specifier === specifier).length,
          ]),
      ),
      matches,
    })
  }
  return {
    version: 1,
    root: ROOT,
    generatedAt: new Date().toISOString(),
    summary: {
      files: fileRecords.length,
      matches: fileRecords.reduce((total, file) => total + file.matchCount, 0),
      modules: Object.fromEntries(
        [...moduleCounts].sort(([left], [right]) => left.localeCompare(right)),
      ),
    },
    skipped: {
      dirtyFiles: skipped.dirty.sort(),
    },
    files: fileRecords.sort((left, right) => left.file.localeCompare(right.file)),
  }
}

/**
 * Apply a plan after verifying every source file and factory slice is unchanged.
 *
 * @param plan - The dry-run plan.
 * @returns The number of rewritten files.
 */
export function applyPlan(plan, root = ROOT) {
  const pending = []
  for (const record of plan.files) {
    const absolute = resolve(root, record.file)
    const text = readFileSync(absolute, 'utf8')
    const hash = createHash('sha256').update(text).digest('hex')
    if (hash !== record.sha256) throw new Error(`source changed after dry run: ${record.file}`)
    const source = record.matches.reduce((current, match) => {
      const start = current.indexOf(match.oldFactory)
      if (start < 0) throw new Error(`factory changed after dry run: ${record.file}:${match.line}`)
      return (
        current.slice(0, start) + match.newFactory + current.slice(start + match.oldFactory.length)
      )
    }, text)
    pending.push({ absolute, source })
  }
  for (const record of pending) writeFileSync(record.absolute, record.source)
  return pending.length
}

/**
 * Read a command-line option's value.
 *
 * @param args - Command-line arguments.
 * @param name - Option name.
 * @returns The option value.
 */
function option(args, name) {
  const index = args.indexOf(name)
  return index >= 0 ? (args[index + 1] ?? null) : null
}

/**
 * Run the codemod CLI.
 *
 */
function main() {
  const args = process.argv.slice(2)
  const report = option(args, '--report')
  if (!report || args.includes('--dry-run') === args.includes('--apply')) {
    throw new Error(
      'usage: node scripts/codemod-vi-mock-keeps-actual.mjs --dry-run|--apply --report <file>',
    )
  }
  const reportPath = resolve(process.cwd(), report)
  if (args.includes('--dry-run')) {
    const plan = buildPlan()
    writeFileSync(reportPath, `${JSON.stringify(plan, null, 2)}\n`)
    console.log(`dry run: ${plan.summary.matches} mock factories in ${plan.summary.files} files`)
    return
  }
  const plan = JSON.parse(readFileSync(reportPath, 'utf8'))
  console.log(`applied: ${applyPlan(plan)} files, ${plan.summary.matches} mock factories`)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main()
