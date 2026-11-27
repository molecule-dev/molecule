/**
 * Rich translations from the portable subset of legacy catalog HTML.
 *
 * @module
 */

import type {
  InterpolationValues,
  RichNode,
  RichTag,
  RichTranslateFunction,
  TranslateFunction,
  TranslateOptions,
} from './types.js'
import { interpolate } from './utilities.js'

type PortableNode = Exclude<RichNode, { kind: 'legacy-html' }>

// Match the whole token, including quoted attributes, to distinguish catalog
// text from markup. Only balanced, attribute-free portable tags enter the tree.
const MARKUP =
  /<!--[\s\S]*?(?:-->|$)|<(?:(\/?)([a-z][^\t\n\f\r />]*)(?:[^>"']|"[^"]*(?:"|$)|'[^']*(?:'|$))*|[!?][^>]*)(?:>|$)/gi
const ENTITY =
  /&(?:#[xX][\da-fA-F]+;?|#\d+;?|[a-zA-Z][a-zA-Z\d]*;|(?:amp|lt|gt|quot|nbsp|AMP|LT|GT|QUOT)(?![a-zA-Z\d]))/g
const ENTITIES = new Map([
  ['amp', '&'],
  ['AMP', '&'],
  ['lt', '<'],
  ['LT', '<'],
  ['gt', '>'],
  ['GT', '>'],
  ['quot', '"'],
  ['QUOT', '"'],
  ['apos', "'"],
  ['nbsp', '\u00a0'],
])
// The legacy Windows-1252 replacements specified for HTML numeric references 0x80–0x9F.
const LEGACY_CONTROLS = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030, 0x160, 0x2039, 0x152,
  0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x2dc, 0x2122,
  0x161, 0x203a, 0x153, 0x9d, 0x17e, 0x178,
]
const RAW_TEXT_TAGS = new Set([
  'script',
  'style',
  'title',
  'textarea',
  'xmp',
  'iframe',
  'noembed',
  'noframes',
  'noscript',
  'plaintext',
])

/**
 * Decodes portable catalog references. The web compatibility path handles other named entities.
 *
 * @param entity - A character reference from the template.
 * @returns Its text or `undefined` when it requires the web compatibility path.
 */
function decodeReference(entity: string): string | undefined {
  const name = entity.slice(1).replace(/;$/, '')
  if (!name.startsWith('#')) return ENTITIES.get(name)
  const hexadecimal = name[1]?.toLowerCase() === 'x'
  const code = Number.parseInt(name.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
  if (code === 0 || code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) return '\ufffd'
  return String.fromCodePoint(LEGACY_CONTROLS[code - 0x80] ?? code)
}

/**
 * Decodes references in literal text from the catalog.
 *
 * @param text - A literal span of the catalog template.
 * @returns The decoded text.
 */
function decodeText(text: string): string {
  return text.replace(ENTITY, (entity) => decodeReference(entity) ?? entity)
}

/**
 * Checks the tags and content models the portable renderers implement.
 *
 * @param parent - The enclosing tag, if any.
 * @param tag - Candidate child tag.
 * @returns Whether the tag can be rendered as this parent's child.
 */
function allowsChild(parent: RichTag | undefined, tag: RichTag): boolean {
  if (parent === 'ul') return tag === 'li'
  if (parent === 'p' || parent === 'h2' || parent === 'strong') return tag === 'strong'
  return tag !== 'li'
}

/**
 * Builds a tree without interpolating any values.
 *
 * @param template - Catalog template.
 * @param markup - Pre-tokenized markup, in source order.
 * @returns Portable nodes or the first unsupported construct.
 */
function parseTemplate(
  template: string,
  markup: readonly RegExpExecArray[],
): PortableNode[] | string {
  const root: PortableNode[] = []
  const stack: { tag: RichTag; children: PortableNode[] }[] = []
  let offset = 0

  for (const token of [...markup, { index: template.length }]) {
    const frame = stack.at(-1)
    const children = frame?.children ?? root
    const text = template.slice(offset, token.index)
    const unknownReference = Array.from(text.matchAll(ENTITY)).find(
      ([entity]) => decodeReference(entity) === undefined,
    )
    if (unknownReference) return unknownReference[0]
    if (frame?.tag === 'ul' && text.trim()) return '<ul>'
    if (text) children.push({ kind: 'text', text })
    if (!Array.isArray(token)) break

    const [source, slash, name] = token
    const tag = name?.toLowerCase()
    const construct = tag ? `<${tag}>` : source.startsWith('<!--') ? '<!-- -->' : '<!…>'
    // The tokenizer retains attributes for the legacy path. Portable tags have none.
    if (
      !isRichTag(tag) ||
      !source.endsWith('>') ||
      source.slice(1, -1).trimEnd().toLowerCase() !== `${slash}${tag}`
    ) {
      return construct
    }
    if (slash) {
      if (frame?.tag !== tag) return construct
      stack.pop()
    } else {
      if (!allowsChild(frame?.tag, tag)) return construct
      const nested: PortableNode[] = []
      children.push({ kind: 'element', tag, children: nested })
      stack.push({ tag, children: nested })
    }
    offset = token.index + source.length
  }

  const unclosed = stack.at(-1)
  return unclosed ? `<${unclosed.tag}>` : root
}

/**
 * Narrows a tag name to the portable tag union.
 *
 * @param tag - Normalized tag name.
 * @returns Whether the tag has portable rendering semantics.
 */
function isRichTag(tag: string | undefined): tag is RichTag {
  return tag === 'p' || tag === 'h2' || tag === 'ul' || tag === 'li' || tag === 'strong'
}

/**
 * Escapes values for legacy HTML text positions while retaining catalog markup.
 *
 * @param template - Trusted catalog HTML.
 * @param markup - Pre-tokenized markup, in source order.
 * @param values - Values to insert in ordinary text positions.
 * @returns The legacy web message.
 */
function legacyHtml(
  template: string,
  markup: readonly RegExpExecArray[],
  values?: InterpolationValues,
): string {
  if (!values) return template
  const escaped = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [
      name,
      (value instanceof Date ? value.toLocaleDateString() : String(value))
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;'),
    ]),
  )
  let result = ''
  let offset = 0
  let rawTextTag: string | undefined
  for (const token of markup) {
    const [source, slash, name] = token
    const tag = name?.toLowerCase()
    const text = template.slice(offset, token.index)
    result += (rawTextTag ? text : interpolate(text, escaped)) + source
    if (rawTextTag) {
      if (slash && tag === rawTextTag && rawTextTag !== 'plaintext') rawTextTag = undefined
    } else if (!slash && tag && RAW_TEXT_TAGS.has(tag)) {
      rawTextTag = tag
    }
    offset = token.index + source.length
  }
  const tail = template.slice(offset)
  return result + (rawTextTag ? tail : interpolate(tail, escaped))
}

/**
 * Parses legacy catalog HTML into portable nodes before substituting any values.
 * When a message needs arbitrary HTML, the legacy node carries a web rendition
 * and a migration diagnostic for native renderers.
 *
 * @param key - Catalog key included in the migration diagnostic.
 * @param template - Uninterpolated catalog template.
 * @param values - Interpolation values inserted only in text.
 * @returns Renderable rich nodes.
 */
export function parseRichMessage(
  key: string,
  template: string,
  values?: InterpolationValues,
): readonly RichNode[] {
  const markup = Array.from(template.matchAll(MARKUP))
  const tree = parseTemplate(template, markup)
  if (typeof tree === 'string') {
    return [
      {
        kind: 'legacy-html',
        html: legacyHtml(template, markup, values),
        diagnostic: `Unsupported rich translation markup ${tree} in ${JSON.stringify(key)}`,
      },
    ]
  }
  const fill = (nodes: readonly PortableNode[]): PortableNode[] =>
    nodes.map((node) => {
      if (node.kind === 'element') return { ...node, children: fill(node.children) }
      return {
        kind: 'text',
        text: values ? interpolate(node.text, values, decodeText) : decodeText(node.text),
      }
    })
  return fill(tree)
}

/**
 * Binds the rich reader to a provider's string translator or a framework's reactive translator.
 *
 * @param translate - Translator that honors `skipInterpolation` when resolving a template.
 * @returns The corresponding rich translation function.
 */
export function createRichTranslator(translate: TranslateFunction): RichTranslateFunction {
  return (
    key: string,
    values?: InterpolationValues,
    options?: Omit<TranslateOptions, 'skipInterpolation'>,
  ): readonly RichNode[] => {
    const count = options?.count ?? (typeof values?.count === 'number' ? values.count : undefined)
    // Some providers select plural forms from interpolation values. Promote only the numeric
    // selector so a provider that interpolates anyway cannot inject text into the raw template.
    const template = translate(key, undefined, { ...options, count, skipInterpolation: true })
    const allValues = options?.count === undefined ? values : { count: options.count, ...values }
    // A missing key is an identifier supplied by the caller, not catalog markup.
    if (template === key && options?.defaultValue === undefined && key) {
      return [{ kind: 'text', text: allValues ? interpolate(key, allValues) : key }]
    }
    return parseRichMessage(key, template, allValues)
  }
}
