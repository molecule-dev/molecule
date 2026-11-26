#!/usr/bin/env node
/**
 * Keep modal semantics in the UI kits. They attach the behavior that makes
 * `aria-modal` true: focus, dismissal order and scroll locking.
 */
import console from 'node:console'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'

import ts from 'typescript'

import { isMainModule } from './lib/is-main.mjs'

const ROOT = resolve(import.meta.dirname, '..')

// Keys are feature directory names. Any exception must explain which kit
// capability is missing and why this feature needs to assert modal semantics.
const EXEMPT_FEATURES = new Map([])
const SCRIPT = /\.[cm]?[jt]sx?$/u
const MARKUP = /\.(?:html|svelte|vue)$/u
const TEST = /(?:[\\/](?:__tests__|__fixtures__|__mocks__|tests?)[\\/]|\.(?:test|spec)\.)/u
const ATTRIBUTE =
  /\s(?:aria-modal|\[(?:attr\.aria-modal|ariaModal)\]|(?:v-bind)?:aria-modal)(?=[\s=/>])/iu

/**
 * Finds modal attributes in HTML-shaped source, including inline templates.
 *
 * @param source - Markup or a template literal fragment.
 * @returns Attribute offsets.
 */
function templateAttributes(source) {
  const markup = source.replace(/<!--[\s\S]*?-->/gu, (comment) => ' '.repeat(comment.length))
  const offsets = []
  for (const tag of markup.matchAll(/<[a-z][\w.:-]*(?:[^"'<>]|"[^"]*"|'[^']*')*/giu)) {
    const names = tag[0].replace(/"[^"]*"|'[^']*'/gu, (value) => ' '.repeat(value.length))
    const attribute = ATTRIBUTE.exec(`${names}>`)
    if (attribute) offsets.push(tag.index + attribute.index + 1)
  }
  return offsets
}

/**
 * Finds literal ARIA attribute writes in JSX, render props and DOM calls.
 *
 * @param file - Filename used to select the script dialect.
 * @param source - Script source.
 * @returns Attribute offsets.
 */
function scriptAttributes(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const offsets = []
  const ariaName = (name) =>
    /^(?:aria-modal|ariaModal|attr\.aria-modal|\[attr\.aria-modal\])$/iu.test(name)
  const ariaKey = (key) =>
    ((ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && ariaName(key.text)) ||
    (ts.isComputedPropertyName(key) &&
      ts.isStringLiteralLike(key.expression) &&
      ariaName(key.expression.text))

  /**
   * Collects each write and visits its children.
   * @param node - The TypeScript syntax node to inspect.
   */
  function visit(node) {
    if (ts.isJsxAttribute(node) && ariaName(node.name.getText(tree))) {
      offsets.push(node.getStart(tree))
    } else if (ts.isPropertyAssignment(node) && ariaKey(node.name)) {
      offsets.push(node.name.getStart(tree))
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ['setAttribute', 'toggleAttribute', 'setAttributeNS'].includes(node.expression.name.text)
    ) {
      const name = node.arguments[node.expression.name.text === 'setAttributeNS' ? 1 : 0]
      if (name && ts.isStringLiteralLike(name) && ariaName(name.text))
        offsets.push(name.getStart(tree))
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ((ts.isPropertyAccessExpression(node.left) && node.left.name.text === 'ariaModal') ||
        (ts.isElementAccessExpression(node.left) &&
          ts.isStringLiteralLike(node.left.argumentExpression) &&
          /^(?:ariaModal|aria-modal)$/u.test(node.left.argumentExpression.text)))
    ) {
      offsets.push(node.left.getStart(tree))
    } else if (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node)) {
      const start = node.getStart(tree) + 1
      let markup = source.slice(start, node.end - 1)
      if (ts.isTemplateExpression(node)) {
        let expressionStart = node.head.end - 2 - start
        for (const { literal } of node.templateSpans) {
          const expressionEnd = literal.getStart(tree) + 1 - start
          markup =
            markup.slice(0, expressionStart) +
            ' '.repeat(expressionEnd - expressionStart) +
            markup.slice(expressionEnd)
          expressionStart = literal.end - 2 - start
        }
      }
      offsets.push(...templateAttributes(markup).map((offset) => start + offset))
    }
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return offsets
}

/**
 * Finds writes in component markup and in props created by its script blocks.
 *
 * @param source - The component or HTML template source.
 * @returns Attribute offsets.
 */
function componentAttributes(source) {
  const offsets = templateAttributes(source)
  for (const block of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/dgiu)) {
    const start = block.indices[1][0]
    offsets.push(...scriptAttributes('component.ts', block[1]).map((offset) => start + offset))
  }
  return offsets
}

/**
 * Finds feature sources that author the modal attribute.
 *
 * @param root - The molecule checkout to check.
 * @returns Paths and lines that write the attribute.
 */
export function featureModalWrites(root) {
  const features = join(root, 'packages/app/features')
  const violations = []
  for (const feature of readdirSync(features, { withFileTypes: true })) {
    if (!feature.isDirectory() || EXEMPT_FEATURES.has(feature.name)) continue
    const src = join(features, feature.name, 'src')
    const files = readdirSync(src, { recursive: true, withFileTypes: true, throwIfNoEntry: false })
    for (const entry of files ?? []) {
      if (!entry.isFile()) continue
      const file = join(entry.parentPath, entry.name)
      const path = relative(root, file)
      if (TEST.test(path) || (!SCRIPT.test(file) && !MARKUP.test(file))) continue
      const source = readFileSync(file, 'utf8')
      if (!/aria-?modal/iu.test(source)) continue
      const offsets = SCRIPT.test(file)
        ? scriptAttributes(file, source)
        : componentAttributes(source)
      for (const offset of offsets) {
        const line = source.slice(0, offset).split('\n').length
        violations.push(`${path}:${line}`)
      }
    }
  }
  return [...new Set(violations)].sort()
}

if (isMainModule(import.meta.url)) {
  const violations = featureModalWrites(ROOT)
  for (const location of violations) {
    console.error(`${location}: use the kit Modal or Drawer for a blocking dialog.`)
  }
  if (violations.length) process.exitCode = 1
  else console.log('Every feature delegates modal semantics to the UI kit.')
}
