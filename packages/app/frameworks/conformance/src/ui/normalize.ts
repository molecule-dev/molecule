/**
 * DOM normalization for cross-framework comparison.
 *
 * Removes only what cannot change a pixel or an accessibility tree:
 * comment nodes (Vue/Svelte/Angular anchors), whitespace-only text nodes,
 * Angular's own compile-time attributes (`_ngcontent-*`, `_nghost-*`,
 * `ng-version`, `ng-reflect-*`), the Angular component's attribute selector
 * (`mol-*` attributes such as `mol-button`), and the harness's own
 * `data-parity-unwrap` scaffolding elements. Generated ids (`useId`, Vue/Svelte
 * counters) are renumbered in order of appearance, together with every
 * attribute that references them, so `:r1:` and `v-0` compare equal.
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

/** Angular attributes that exist only because Angular compiled the template. */
const isAngularArtifact = (name: string): boolean =>
  name.startsWith('_ngcontent-') ||
  name.startsWith('_nghost-') ||
  name === 'ng-version' ||
  name.startsWith('ng-reflect-') ||
  /^mol-[a-z-]+$/.test(name)

const escapeText = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const escapeAttr = (s: string): string =>
  s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

const normalizeStyle = (value: string): string =>
  value
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':')
      if (i < 0) return d
      return `${d.slice(0, i).trim().toLowerCase()}: ${d
        .slice(i + 1)
        .trim()
        .replace(/\s+/g, ' ')}`
    })
    .sort()
    .join('; ')

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

/** Options for {@link normalizeDom}. */
export interface NormalizeOptions {
  /** Replace each class token with {@link hashClassToken}. */
  hashClasses?: boolean
}

/** Elements whose children are not rendered text (keep their text verbatim). */
const RAW_TEXT = new Set(['script', 'style', 'textarea', 'pre'])

interface IdMap {
  map: Map<string, string>
  next: number
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

const serializeNode = (
  node: Node,
  ids: IdMap,
  inRaw: boolean,
  out: string[],
  hash: boolean,
): void => {
  if (node.nodeType === 8) return // comment
  if (node.nodeType === 3) {
    const text = node.textContent ?? ''
    if (inRaw) {
      out.push(escapeText(text))
      return
    }
    if (!text.trim()) return
    out.push(escapeText(text.replace(/\s+/g, ' ')))
    return
  }
  if (node.nodeType === 11) {
    for (const child of Array.from(node.childNodes)) serializeNode(child, ids, inRaw, out, hash)
    return
  }
  if (node.nodeType !== 1) return
  const el = node as Element
  if (el.hasAttribute('data-parity-unwrap')) {
    for (const child of Array.from(el.childNodes)) serializeNode(child, ids, inRaw, out, hash)
    return
  }
  const tag = el.tagName.toLowerCase()
  const attrs: string[] = []
  for (const attr of Array.from(el.attributes).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = attr.name.toLowerCase()
    if (isAngularArtifact(name)) continue
    let value = attr.value
    if (name === 'class') {
      value = normalizeClass(value, hash)
      if (!value) continue
    } else if (name === 'style') {
      value = normalizeStyle(value)
      if (!value) continue
    } else if (name === 'id') {
      value = ids.map.get(value) ?? value
    } else if (ID_REFERENCE_ATTRS.has(name)) {
      value = value
        .split(/\s+/)
        .filter(Boolean)
        .map((v) => ids.map.get(v) ?? v)
        .join(' ')
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
  const raw = inRaw || RAW_TEXT.has(tag)
  for (const child of Array.from(el.childNodes)) serializeNode(child, ids, raw, out, hash)
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
  const ids: IdMap = { map: new Map(), next: 0 }
  collectIds(root, ids)
  const out: string[] = []
  for (const child of Array.from(root.childNodes))
    serializeNode(child, ids, false, out, options.hashClasses ?? false)
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
