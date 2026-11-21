/**
 * DOM normalization for cross-framework comparison.
 *
 * Removes only what cannot change a pixel or an accessibility tree:
 * comment nodes (Vue/Svelte/Angular anchors), whitespace that does not draw,
 * Angular's own compile-time attributes (`_ngcontent-*`, `_nghost-*`,
 * `ng-version`, `ng-reflect-*`), the Angular component's attribute selector
 * (`mol-*` attributes such as `mol-button`), React Router's `data-discover`
 * link marker, and the harness's own
 * `data-parity-unwrap` scaffolding elements. Generated ids (`useId`, Vue/Svelte
 * counters) are renumbered in order of appearance, together with every
 * attribute that references them — an `aria-controls`, and the `url(#id)` paint
 * references an SVG's `fill`/`stroke`/`mask` carry — so `:r1:` and `v-0`
 * compare equal. A
 * generated reference to an id no element carries (an inactive tab's
 * `aria-controls`) is renumbered too, as `#ref<n>` in order of appearance, so
 * it still differs from a reference that resolves. A dangling reference the
 * caller wrote itself (`keepReferences`, such as a Label's `htmlFor`) stays
 * verbatim, so a component that mangles it still differs. A radio button's `name`
 * only groups the radios that share it (one checked at a time, one Tab stop), and a
 * component usually generates it (`useId`), so it is renumbered the same way, as
 * `radio<n>` in order of appearance; a name the case wrote stays verbatim.
 *
 * Adjacent text nodes are merged before comparison (comments and scaffolding
 * between them are transparent): `'One'`+`'Two'` renders exactly like
 * `'OneTwo'`, and `'Hello '`+`'Ada'` like `'Hello Ada'`. Whitespace is then kept
 * exactly where CSS draws it, read from the document's computed style (the
 * case runner loads the reference stylesheet, see `stylesheet.ts`): inside
 * a flex or grid container every text run is trimmed (each run is its own
 * item); elsewhere whitespace is dropped at the start and end of the parent's
 * content and next to a block-level sibling, and kept, collapsed to one space,
 * between text and an inline-level element (`<strong>12</strong> unread`) or
 * between two inline-level elements. Text under `white-space: pre*` is kept
 * verbatim.
 *
 * Everything else is kept and canonicalized: attributes sorted by name,
 * class tokens sorted and de-duplicated (class ORDER never affects CSS),
 * inline style declarations sorted, whitespace runs inside text collapsed.
 *
 * With `hashClasses`, every class token is replaced by a short stable hash of
 * itself (`c3f2a19b0`). Equal hashes mean equal real classes, so goldens keep the
 * full pixel guarantee without storing a CSS class name outside the ClassMap bond.
 *
 * @module
 */

/** Attributes whose value is (a list of) element ids. */
const ID_REFERENCE_ATTRS = new Set([
  'aria-activedescendant',
  'aria-controls',
  'aria-describedby',
  'aria-details',
  'aria-errormessage',
  'aria-flowto',
  'aria-labelledby',
  'aria-owns',
  'for',
  'form',
  'list',
  'popovertarget',
])

/**
 * Attributes a framework or router library adds for its own bookkeeping:
 * Angular's compile-time attributes, and React Router's `data-discover` (its
 * `<Link>` marks every in-app link for its own lazy route discovery). Neither
 * draws a pixel or reaches the accessibility tree.
 */
const isFrameworkArtifact = (name: string): boolean =>
  name.startsWith('_ngcontent-') ||
  name.startsWith('_nghost-') ||
  name === 'ng-version' ||
  name.startsWith('ng-reflect-') ||
  /^mol-[a-z-]+$/.test(name) ||
  name === 'data-discover'

/** An SVG paint reference to an element id: `fill`/`stroke`/`mask` = `url(#id)`. */
const URL_ID_REFERENCE = /url\(#([^()]*)\)/g

const escapeText = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const escapeAttr = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

/**
 * Vendor names every browser treats as the same property, mapped to the standard name. Vue's
 * runtime-dom sets a style object's `filter` through `webkitFilter` whenever the DOM has it (its
 * `autoPrefix` special-cases `filter`), and so writes `-webkit-filter` for any style that reaches
 * it as an object, a string merged through `mergeProps` included. Browsers alias the two, so the
 * style attribute they serialize says `filter`, as React's does; jsdom keeps them apart.
 */
const STYLE_ALIASES: ReadonlyMap<string, string> = new Map([['-webkit-filter', 'filter']])

/**
 * The declarations of a style attribute, split at the semicolons outside quotes and brackets, so
 * a `url("data:…;base64,…")` stays one declaration.
 *
 * @param value - A style attribute.
 * @returns Its trimmed, non-empty declarations.
 */
const styleDeclarations = (value: string): string[] => {
  const out: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
    } else if (c === '"' || c === "'") quote = c
    else if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if (c === ';' && depth === 0) {
      out.push(value.slice(start, i))
      start = i + 1
    }
  }
  out.push(value.slice(start))
  return out.map((d) => d.trim()).filter(Boolean)
}

/** A declaration with its property name lower-cased and aliased and its whitespace collapsed. */
const writtenDeclaration = (d: string): string => {
  const i = d.indexOf(':')
  if (i < 0) return d
  const name = d.slice(0, i).trim().toLowerCase()
  return `${STYLE_ALIASES.get(name) ?? name}: ${d
    .slice(i + 1)
    .trim()
    .replace(/\s+/g, ' ')}`
}

/** One detached element per document, whose CSSOM parses declaration lists. */
const styleParsers = new WeakMap<Document, HTMLElement>()

/** Normalized style attributes by their written text (the same few thousand repeat in every case). */
const styleCache = new Map<string, string>()
const STYLE_CACHE_LIMIT = 20_000

/**
 * A style attribute as the sorted declarations a browser's CSSOM reads from it, so two styles
 * that draw the same compare equal however they were written. React sets each property through
 * the CSSOM, which records `flex: 1` as `flex: 1 1 0%`, `border: none` as `border: medium` and
 * `#d4a017` as `rgb(212, 160, 23)`; Solid writes a static style object into its template HTML,
 * where the attribute keeps the text as written. A declaration the CSSOM does not read (an
 * invalid value, or a property jsdom does not implement) is kept as written, so it still counts.
 *
 * @param value - The style attribute.
 * @param doc - The document whose CSSOM parses it.
 * @returns The normalized declarations, `; `-joined.
 */
const normalizeStyle = (value: string, doc: Document): string => {
  const cached = styleCache.get(value)
  if (cached !== undefined) return cached
  let parser = styleParsers.get(doc)
  if (!parser) {
    parser = doc.createElement('div')
    styleParsers.set(doc, parser)
  }
  const style = parser.style
  // One property at a time, in order, as React's style object sets them: assigning the list
  // to `cssText` at once loses declarations in jsdom (`background: transparent` before
  // `border: medium` is dropped).
  const read = (declarations: string[]): string => {
    style.cssText = ''
    for (const d of declarations) {
      const i = d.indexOf(':')
      if (i < 0) continue
      const important = /\s*!\s*important$/i.exec(d)
      const end = important ? important.index : d.length
      style.setProperty(d.slice(0, i), d.slice(i + 1, end).trim(), important ? 'important' : '')
    }
    return style.cssText
  }
  const written = styleDeclarations(value).map(writtenDeclaration)
  const unread = written.filter((d) => !read([d]))
  const normalized = [...styleDeclarations(read(written)), ...unread].sort().join('; ')
  if (styleCache.size >= STYLE_CACHE_LIMIT) styleCache.clear()
  styleCache.set(value, normalized)
  return normalized
}

/**
 * FNV-1a 32-bit hash of a class token, as `c` + 8 hex digits.
 *
 * @param token - One class token.
 * @returns Its stable hash token.
 */
export function hashClassToken(token: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `c${h.toString(16).padStart(8, '0')}`
}

const normalizeClass = (value: string, hash: boolean): string =>
  [
    ...new Set(
      value
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => (hash ? hashClassToken(t) : t)),
    ),
  ]
    .sort()
    .join(' ')

/**
 * The hashed form of a snapshot taken with real class names: each element's `class` value as
 * {@link normalizeDom} writes it with `hashClasses`. A readable golden that is current gives back
 * the committed golden it was recorded beside; one recorded before a re-record does not.
 *
 * @param snapshot - A snapshot from {@link normalizeDom} without `hashClasses`.
 * @returns The snapshot with hashed classes.
 */
export function hashSnapshotClasses(snapshot: string): string {
  // Each element's opening tag is a line of its own and the only place ` class="` can appear:
  // text escapes '<', and every other attribute value escapes its quotes.
  return snapshot
    .split('\n')
    .map((line) =>
      line.startsWith('<')
        ? line.replace(/ class="([^"]*)"/, (_match, value: string) => {
            const tokens = value
              .replaceAll('&lt;', '<')
              .replaceAll('&quot;', '"')
              .replaceAll('&amp;', '&')
            return ` class="${normalizeClass(tokens, true)}"`
          })
        : line,
    )
    .join('\n')
}

/**
 * The readable copy of a case's snapshots, when it still describes the committed golden: every
 * snapshot hashes to the golden's. A copy recorded before a re-record (elsewhere, or before a
 * pull) describes an older recording, and a diff against it would show changes that are not there.
 *
 * @param cached - The case's readable snapshots from the local cache, if any.
 * @param golden - The case's committed (hashed) snapshots.
 * @returns `cached` when it matches the golden, otherwise undefined.
 */
export function currentReadable(
  cached: readonly string[] | undefined,
  golden: readonly string[],
): readonly string[] | undefined {
  return cached?.length === golden.length &&
    cached.every((snapshot, i) => hashSnapshotClasses(snapshot) === golden[i])
    ? cached
    : undefined
}

/** Options for {@link normalizeDom}. */
export interface NormalizeOptions {
  /** Replace each class token with {@link hashClassToken}. */
  hashClasses?: boolean
  /**
   * Strings the caller supplied (a case's props): a reference to one of these
   * that no element carries is kept verbatim instead of renumbered.
   */
  keepReferences?: ReadonlySet<string>
  /**
   * Computed style of an element, deciding which whitespace draws. Defaults to
   * the document's own `getComputedStyle`; the case runner passes the
   * reference stylesheet's (`referenceStyles` in `stylesheet.ts`).
   */
  computedStyle?: (el: Element) => CSSStyleDeclaration | undefined
}

/** Elements whose children are not rendered text (keep their text verbatim). */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'pre'])

interface IdMap {
  map: Map<string, string>
  next: number
  /** References to ids that no element in the subtree carries. */
  dangling: Map<string, string>
  nextDangling: number
  /** Dangling references kept verbatim ({@link NormalizeOptions.keepReferences}). */
  keep: ReadonlySet<string>
  /** Radio group names (`<input type="radio" name>`), renumbered as `radio<n>`. */
  radios: Map<string, string>
}

const referenceToken = (ids: IdMap, id: string): string => {
  const resolved = ids.map.get(id)
  if (resolved) return resolved
  if (ids.keep.has(id)) return id
  let token = ids.dangling.get(id)
  if (!token) {
    token = `#ref${ids.nextDangling++}`
    ids.dangling.set(id, token)
  }
  return token
}

/**
 * Flattens a node list into what renders: comments dropped, scaffolding
 * (`data-parity-unwrap`) and fragments expanded, adjacent text merged.
 *
 * @param nodes - Child nodes in document order.
 * @param out - Receives elements and merged text strings.
 * @returns The same `out` array.
 */
const renderedChildren = (
  nodes: Iterable<Node>,
  out: (Element | string)[] = [],
): (Element | string)[] => {
  for (const node of nodes) {
    if (node.nodeType === 3) {
      const text = node.textContent ?? ''
      const last = out.length - 1
      if (last >= 0 && typeof out[last] === 'string') out[last] += text
      else out.push(text)
    } else if (node.nodeType === 11) {
      renderedChildren(Array.from(node.childNodes), out)
    } else if (node.nodeType === 1) {
      const el = node as Element
      if (el.hasAttribute('data-parity-unwrap')) renderedChildren(Array.from(el.childNodes), out)
      else out.push(el)
    }
  }
  return out
}

const collectIds = (root: Node, ids: IdMap): void => {
  const walker = (root.ownerDocument ?? (root as Document)).createTreeWalker(root, 1)
  let node: Node | null = walker.currentNode
  while (node) {
    const el = node as Element
    const id = el.getAttribute?.('id')
    if (id && !ids.map.has(id)) ids.map.set(id, `#id${ids.next++}`)
    node = walker.nextNode()
  }
}

const documentStyle = (el: Element): CSSStyleDeclaration | undefined =>
  el.ownerDocument.defaultView?.getComputedStyle(el)

/** The computed-style source for the normalization in progress (synchronous, so one at a time). */
let computed = documentStyle

/** `flex`, `inline-flex`, `grid`, `inline-grid`: each text run is its own item. */
const isItemContainer = (el: Element | null): boolean =>
  !!el && /^(inline-)?(flex|grid)$/.test(computed(el)?.display ?? '')

/** A block-level sibling ends the line: whitespace next to it does not draw. */
const isBlockLevel = (el: Element): boolean => {
  const display = computed(el)?.display || 'inline'
  return !display.startsWith('inline') && display !== 'contents' && display !== 'none'
}

/** `white-space: pre`, `pre-wrap` or `break-spaces` keeps every space and newline. */
const preservesWhitespace = (el: Element): boolean =>
  /^(pre|pre-wrap|break-spaces)$/.test(computed(el)?.whiteSpace ?? '')

const serializeChildren = (
  parent: Element | null,
  nodes: Iterable<Node>,
  ids: IdMap,
  inRaw: boolean,
  out: string[],
  hash: boolean,
): void => {
  const children = renderedChildren(nodes)
  children.forEach((child, i) => {
    if (typeof child !== 'string') {
      serializeElement(child, ids, inRaw, out, hash)
      return
    }
    if (inRaw) {
      out.push(escapeText(child))
      return
    }
    let text = child
    // Computed style is read only when the edge whitespace of this run is in question.
    if (/^\s|\s$/.test(text)) {
      if (isItemContainer(parent)) {
        text = text.trim()
      } else {
        const before = children[i - 1]
        const after = children[i + 1]
        if (before === undefined || (typeof before !== 'string' && isBlockLevel(before)))
          text = text.trimStart()
        if (after === undefined || (typeof after !== 'string' && isBlockLevel(after)))
          text = text.trimEnd()
      }
    }
    // A whitespace-only run left between two inline-level elements draws one space.
    if (text) out.push(escapeText(text.replace(/\s+/g, ' ')))
  })
}

const serializeElement = (
  el: Element,
  ids: IdMap,
  inRaw: boolean,
  out: string[],
  hash: boolean,
): void => {
  const tag = el.tagName.toLowerCase()
  const attrs: string[] = []
  for (const attr of Array.from(el.attributes).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = attr.name.toLowerCase()
    if (isFrameworkArtifact(name)) continue
    let value = attr.value
    if (name === 'class') {
      value = normalizeClass(value, hash)
      if (!value) continue
    } else if (name === 'style') {
      value = normalizeStyle(value, el.ownerDocument)
      if (!value) continue
    } else if (name === 'id') {
      value = ids.map.get(value) ?? value
    } else if (
      name === 'name' &&
      tag === 'input' &&
      el.getAttribute('type')?.toLowerCase() === 'radio' &&
      !ids.keep.has(value)
    ) {
      let token = ids.radios.get(value)
      if (!token) {
        token = `radio${ids.radios.size}`
        ids.radios.set(value, token)
      }
      value = token
    } else if (ID_REFERENCE_ATTRS.has(name)) {
      value = value
        .split(/\s+/)
        .filter(Boolean)
        .map((v) => referenceToken(ids, v))
        .join(' ')
    } else if (value.includes('url(#')) {
      // SVG paint references (`fill`/`stroke`/`mask`/… = `url(#gradient-id)`)
      // name generated ids the same way an `aria-controls` does: renumber them
      // through the same map, so React's `_r3` and Vue's `v-0` compare equal.
      // The tokens themselves carry the `#` (`#id0`, `#ref1`), which the url
      // form already spells, so it is not doubled.
      value = value.replace(
        URL_ID_REFERENCE,
        (_ref, id: string) => `url(#${referenceToken(ids, id).replace(/^#/, '')})`,
      )
    }
    attrs.push(value === '' ? name : `${name}="${escapeAttr(value)}"`)
  }
  // Live properties that frameworks set without reflecting to an attribute.
  const live: string[] = []
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    const field = el as HTMLInputElement
    if (field.type === 'checkbox' || field.type === 'radio') {
      live.push(`checked=${field.checked}`)
      if (field.indeterminate) live.push('indeterminate=true')
    } else {
      live.push(`value=${JSON.stringify(field.value)}`)
    }
  }
  const head = [tag, ...attrs].join(' ')
  out.push(`<${head}${live.length ? ` {${live.join(' ')}}` : ''}>`)
  if (tag === 'textarea') {
    // The textarea's live value is recorded above; its child text is only the initial value.
    out.push(`</${tag}>`)
    return
  }
  const raw =
    inRaw ||
    RAW_TEXT.has(tag) ||
    (/\s\s|[\n\t]/.test(el.textContent ?? '') && preservesWhitespace(el))
  serializeChildren(el, Array.from(el.childNodes), ids, raw, out, hash)
  out.push(`</${tag}>`)
}

/**
 * Serializes a DOM subtree into a canonical string that is equal across
 * frameworks exactly when the rendered result is equal.
 *
 * @param root - The subtree to serialize (usually `document.body`).
 * @param options - Normalization options.
 * @returns Canonical, line-per-tag serialization.
 */
export function normalizeDom(root: Node, options: NormalizeOptions = {}): string {
  computed = options.computedStyle ?? documentStyle
  try {
    return serializeRoot(root, options)
  } finally {
    computed = documentStyle
  }
}

const serializeRoot = (root: Node, options: NormalizeOptions): string => {
  const ids: IdMap = {
    map: new Map(),
    next: 0,
    dangling: new Map(),
    nextDangling: 0,
    keep: options.keepReferences ?? new Set(),
    radios: new Map(),
  }
  collectIds(root, ids)
  const out: string[] = []
  serializeChildren(
    root.nodeType === 1 ? (root as Element) : null,
    Array.from(root.childNodes),
    ids,
    false,
    out,
    options.hashClasses ?? false,
  )
  return out.join('\n')
}

/**
 * Normalizes a callback argument to plain, comparable data. DOM events become
 * `{ event: type, target: tag }`; elements become their tag; functions become
 * `[function]`; everything else is cloned structurally.
 *
 * @param value - The argument a component passed to a callback.
 * @returns A JSON-comparable representation.
 */
export function normalizeArg(value: unknown): unknown {
  if (value === undefined || value === null) return value ?? null
  if (typeof value === 'function') return '[function]'
  if (typeof Event !== 'undefined' && value instanceof Event) {
    const target = value.target as Element | null
    return { event: value.type, target: target?.tagName?.toLowerCase() ?? null }
  }
  if (typeof Node !== 'undefined' && value instanceof Node) {
    return `[node ${(value as Element).tagName?.toLowerCase() ?? value.nodeName}]`
  }
  if (Array.isArray(value)) return value.map(normalizeArg)
  if (typeof value === 'object') {
    // Framework-specific synthetic events (React's SyntheticEvent) carry nativeEvent.
    const maybeEvent = value as { nativeEvent?: unknown }
    if (typeof Event !== 'undefined' && maybeEvent.nativeEvent instanceof Event) {
      return normalizeArg(maybeEvent.nativeEvent)
    }
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = normalizeArg((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}
