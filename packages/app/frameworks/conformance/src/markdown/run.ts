/**
 * `runMarkdownConformance(name, createProvider)`: the cases every
 * `@molecule/app-markdown` provider passes, so an app can swap a React-only
 * markdown bond for a framework-neutral one and get the same DOM and the same
 * table of contents.
 *
 * Each markdown bond calls this from its own tests with its built
 * `createProvider`. A case renders its markdown with its options, then
 * compares the rendered HTML as a DOM (see {@link normalizeMarkdownHtml}) and,
 * when the case gives one, the table of contents. A provider that throws fails
 * that case with the error.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { MarkdownProvider } from '@molecule/app-markdown'

import { markdownCases } from './cases.js'

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8

/** Collapsible HTML whitespace: everything a browser's `white-space: normal` folds to one space. */
const COLLAPSIBLE_WHITESPACE = /[ \t\n\r\f]+/g

/** Escapes for text nodes, so two different texts never serialise the same. */
const TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
}

/** Escapes for attribute values, applied exactly once. */
const ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

/**
 * Elements that start a new line in normal flow. Whitespace next to one is
 * not rendered, so two serialisations that differ only there are the same DOM.
 */
const BLOCK_ELEMENTS: ReadonlySet<string> = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
])

/**
 * Reports whether a DOM node is an element.
 *
 * @param node - A node, or null.
 * @returns `true` when the node is an element.
 */
function isElement(node: Node | null): node is Element {
  return node !== null && node.nodeType === ELEMENT_NODE
}

/**
 * Reports whether an element starts a new line in normal flow.
 *
 * @param element - The element.
 * @returns `true` for a block-level element.
 */
function isBlockElement(element: Element): boolean {
  return BLOCK_ELEMENTS.has(element.localName)
}

/**
 * Reports whether a node sits inside a `<pre>`, where whitespace is content
 * and must be compared exactly.
 *
 * @param node - The node.
 * @returns `true` when a `<pre>` ancestor exists.
 */
function isInsidePre(node: Node): boolean {
  let parent: Node | null = node.parentNode
  while (parent) {
    if (isElement(parent) && parent.localName === 'pre') return true
    parent = parent.parentNode
  }
  return false
}

/**
 * Escapes a text node's content once.
 *
 * @param text - The text.
 * @returns The escaped text.
 */
function escapeText(text: string): string {
  return text.replace(/[&<>]/g, (char) => TEXT_ESCAPES[char] ?? char)
}

/**
 * Escapes an attribute value once.
 *
 * @param value - The raw value.
 * @returns The escaped value.
 */
function escapeAttribute(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ATTRIBUTE_ESCAPES[char] ?? char)
}

/**
 * Serialises one text node: collapses runs of collapsible whitespace to one
 * space, drops whitespace that only separated two block elements, and keeps
 * whitespace inside a `<pre>` exactly.
 *
 * @param node - The text node.
 * @returns Its normalised, escaped text.
 */
function serializeTextNode(node: Node): string {
  const raw = node.nodeValue ?? ''
  if (isInsidePre(node)) return escapeText(raw)
  let text = raw.replace(COLLAPSIBLE_WHITESPACE, ' ')
  const previous = node.previousSibling
  const next = node.nextSibling
  const afterLineBreak =
    isElement(previous) && (isBlockElement(previous) || previous.localName === 'br')
  const beforeBlock = isElement(next) && isBlockElement(next)
  if (afterLineBreak) text = text.replace(/^ /, '')
  if (beforeBlock || !next) text = text.replace(/ $/, '')
  if (!text) return ''
  if (text === ' ') {
    // Whitespace with no rendered content: at a container edge, or between
    // two blocks. Between two inline elements it does render, so keep it.
    if (!previous || !next || afterLineBreak || beforeBlock) return ''
    return ' '
  }
  return escapeText(text)
}

/**
 * Serialises an element's attributes, sorted by name, each as `name="value"`.
 *
 * @param element - The element.
 * @returns The attribute string, with a leading space per attribute.
 */
function serializeAttributes(element: Element): string {
  const attributes = Array.from(element.attributes, (attribute) => ({
    name: attribute.name,
    value: attribute.value,
  }))
  attributes.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  return attributes.map(({ name, value }) => ` ${name}="${escapeAttribute(value)}"`).join('')
}

/**
 * Serialises one node and its descendants.
 *
 * @param node - The node.
 * @returns Its normalised serialisation.
 */
function serializeNode(node: ChildNode): string {
  if (node.nodeType === TEXT_NODE) return serializeTextNode(node)
  if (node.nodeType === COMMENT_NODE) return ''
  if (!isElement(node)) return ''
  const tag = node.localName
  const children = Array.from(node.childNodes, serializeNode).join('')
  return `<${tag}${serializeAttributes(node)}>${children}</${tag}>`
}

/**
 * Normalises rendered HTML so two strings that parse to the same DOM give the
 * same string, and any real difference — an element, an attribute, its value,
 * a text difference — does not.
 *
 * It parses into a `<template>`, drops whitespace-only text between block
 * elements, collapses runs of whitespace inside other text to one space
 * (keeping `<pre>` content exactly), sorts each element's attributes by name,
 * and serialises element by element with lowercase tag names, `name="value"`
 * attributes with the value escaped once, and empty attributes as `name=""`.
 *
 * @param html - Rendered HTML.
 * @returns The normalised serialisation.
 */
export function normalizeMarkdownHtml(html: string): string {
  const template = document.createElement('template')
  template.innerHTML = html
  return Array.from(template.content.childNodes, serializeNode).join('')
}

/**
 * Registers the markdown conformance cases for one provider.
 *
 * @param name - The provider (`marked`, `react-markdown`, …).
 * @param createProvider - Builds the provider under test.
 */
export function runMarkdownConformance(name: string, createProvider: () => MarkdownProvider): void {
  describe(`${name} markdown conformance`, () => {
    for (const testCase of markdownCases) {
      it(testCase.name, () => {
        const provider = createProvider()
        if (testCase.throws) {
          let thrown: unknown
          try {
            provider.render(testCase.markdown, testCase.options)
          } catch (error) {
            thrown = error
          }
          expect(thrown, 'render() must refuse these options').toBeInstanceOf(Error)
          expect(thrown).toMatchObject({ i18nKey: testCase.throws })
          return
        }
        const result = provider.render(testCase.markdown, testCase.options)
        expect(normalizeMarkdownHtml(result.html)).toBe(normalizeMarkdownHtml(testCase.html))
        if (testCase.toc) expect(result.toc).toEqual(testCase.toc)
      })
    }
  })
}
