/**
 * The elements markdown produces and the checks a provider applies to the
 * `elementAttributes` option, so both providers accept and refuse the same
 * attribute sets.
 *
 * @module
 */

import { I18nError } from '@molecule/app-i18n'

import type { MarkdownOptions } from './types.js'

/**
 * The elements a markdown renderer produces, as a readonly tuple.
 */
export const MARKDOWN_ELEMENTS = [
  'a',
  'img',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'pre',
  'code',
  'blockquote',
  'hr',
  'em',
  'strong',
  'del',
  'input',
  'footnotes',
] as const

/** An element markdown produces, the keys allowed in `elementAttributes`. */
export type MarkdownElement = (typeof MARKDOWN_ELEMENTS)[number]

/** Fast membership test for {@link MARKDOWN_ELEMENTS}. */
const MARKDOWN_ELEMENT_SET: ReadonlySet<string> = new Set(MARKDOWN_ELEMENTS)

/** HTML escapes applied to an attribute value, each exactly once. */
const ATTRIBUTE_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Reports whether a name names an attribute the renderer owns and must set:
 * `href`, `src`, `id`, or any event handler (`on…`, in any case).
 *
 * @param name - The attribute name from `elementAttributes`.
 * @returns `true` when the renderer owns the attribute.
 */
function isRendererOwnedAttribute(name: string): boolean {
  const lower = name.toLowerCase()
  return lower === 'href' || lower === 'src' || lower === 'id' || lower.startsWith('on')
}

/**
 * Reports whether a name cannot be an attribute name: empty, or containing
 * whitespace, a quote, `>`, `/` or `=`.
 *
 * @param name - The attribute name from `elementAttributes`.
 * @returns `true` when the name is not a valid attribute name.
 */
function isInvalidAttributeName(name: string): boolean {
  return name.length === 0 || /[\s"'/>]/.test(name) || name.includes('=')
}

/**
 * Validates the `elementAttributes` option before rendering.
 *
 * Throws an {@link I18nError} when an element is not one markdown produces,
 * when an attribute is one the renderer owns (`href`, `src`, `id`, `on…`), or
 * when a name is not a valid attribute name. Valid maps pass unchanged.
 *
 * @param attributes - The `elementAttributes` option, if any.
 * @throws {I18nError} when an element or attribute name is refused.
 */
export function checkElementAttributes(attributes: MarkdownOptions['elementAttributes']): void {
  if (!attributes) return
  for (const [element, names] of Object.entries(attributes)) {
    if (!MARKDOWN_ELEMENT_SET.has(element)) {
      throw new I18nError(
        'markdown.elementAttributes.unknownElement',
        { element },
        'elementAttributes names <{{element}}>, which markdown does not produce',
      )
    }
    for (const name of Object.keys(names ?? {})) {
      if (isRendererOwnedAttribute(name)) {
        throw new I18nError(
          'markdown.elementAttributes.refused',
          { element, name },
          'elementAttributes cannot set "{{name}}" on <{{element}}>: the renderer owns it',
        )
      }
      if (isInvalidAttributeName(name)) {
        throw new I18nError(
          'markdown.elementAttributes.invalidName',
          { element, name },
          '"{{name}}" is not an attribute name (on <{{element}}>)',
        )
      }
    }
  }
}

/**
 * Escapes a string for use inside a double- or single-quoted HTML attribute.
 *
 * `&`, `<`, `>`, `"` and `'` are each escaped exactly once.
 *
 * @param value - The raw attribute value.
 * @returns The escaped value.
 */
export function escapeAttributeValue(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ATTRIBUTE_ESCAPES[char] ?? char)
}
