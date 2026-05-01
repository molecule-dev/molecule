/**
 * XML / CDATA / URL escape helpers used by every serializer.
 *
 * **All user-supplied content MUST flow through one of these helpers**
 * before it lands in serialized output. The serializers in this package
 * call them defensively at every interpolation site, but consumers
 * extending this package (e.g. adding a custom namespace) MUST do the same.
 *
 * @module
 */

/**
 * Escape a string for inclusion in an XML text node or attribute value.
 *
 * Maps the five XML predefined entities:
 * - `&` → `&amp;`
 * - `<` → `&lt;`
 * - `>` → `&gt;`
 * - `"` → `&quot;`
 * - `'` → `&apos;`
 *
 * Also strips XML 1.0 illegal control characters (`U+0000`–`U+0008`,
 * `U+000B`, `U+000C`, `U+000E`–`U+001F`). `\t`, `\n`, `\r` are preserved.
 *
 * @param value - Raw string. `undefined` / `null` collapse to `''`.
 * @returns Escaped string safe for any XML position.
 */
export function escapeXml(value: string | number | boolean | null | undefined): string {
  if (value === undefined || value === null) return ''
  const s = typeof value === 'string' ? value : String(value)
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    // Strip XML 1.0 illegal control chars (allow \t=9, \n=10, \r=13).
    if (ch < 0x20 && ch !== 0x09 && ch !== 0x0a && ch !== 0x0d) continue
    const c = s[i]!
    if (c === '&') out += '&amp;'
    else if (c === '<') out += '&lt;'
    else if (c === '>') out += '&gt;'
    else if (c === '"') out += '&quot;'
    else if (c === "'") out += '&apos;'
    else out += c
  }
  return out
}

/**
 * Wrap an HTML payload in a `<![CDATA[ ... ]]>` section, splitting any
 * accidental closing-marker (`]]>`) inside the payload across two CDATA
 * sections so the result remains valid XML.
 *
 * Use for `<description>` / `<content:encoded>` / Atom `<content type="html">`
 * where the body is HTML and we want to avoid double-escaping.
 *
 * Also strips XML 1.0 illegal control characters before wrapping (`\t`,
 * `\n`, `\r` preserved). The CDATA payload still cannot contain raw
 * `<![CDATA[` openers, but those are not produced by typical HTML and
 * any literal occurrence is treated as ordinary text by browsers.
 *
 * @param value - Raw HTML / text. `undefined` / `null` collapse to `''`.
 * @returns A complete CDATA section, e.g. `<![CDATA[<p>x</p>]]>`.
 */
export function wrapCdata(value: string | null | undefined): string {
  if (value === undefined || value === null || value === '') {
    return '<![CDATA[]]>'
  }
  // Strip illegal XML 1.0 control chars first.
  let cleaned = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i)
    if (ch < 0x20 && ch !== 0x09 && ch !== 0x0a && ch !== 0x0d) continue
    cleaned += value[i]
  }
  // Split any embedded `]]>` so it can't terminate the CDATA early.
  const safe = cleaned.split(']]>').join(']]]]><![CDATA[>')
  return `<![CDATA[${safe}]]>`
}

/**
 * Escape an attribute value (alias of {@link escapeXml} kept distinct so
 * future tightening — e.g. enforcing quote style — has a single call site).
 *
 * @param value - Raw attribute value.
 * @returns Escaped string suitable for `="..."` attribute syntax.
 */
export function escapeAttr(value: string | number | boolean | null | undefined): string {
  return escapeXml(value)
}

/**
 * Validate + escape a URL for safe use as an `href` / `src` / RSS `<link>`
 * value. Strips `javascript:` and other dangerous schemes — those are
 * replaced with `about:blank`.
 *
 * Allowed schemes (case-insensitive): `http`, `https`, `mailto`, `ftp`,
 * `tel`, plus protocol-relative (`//...`) and absolute paths (`/...`) and
 * relative paths (`./...`, `../...`, `name`, `name?...`, `name#...`).
 *
 * @param value - Raw URL. `undefined` / `null` collapse to `''`.
 * @returns Escaped URL or `'about:blank'` for disallowed schemes.
 */
export function escapeUrl(value: string | null | undefined): string {
  if (value === undefined || value === null) return ''
  const s = String(value).trim()
  if (s === '') return ''
  // Match `<scheme>:` (must start with a letter, then [a-z0-9+.-]).
  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(s)
  if (schemeMatch) {
    const scheme = schemeMatch[1]!.toLowerCase()
    const allowed = new Set(['http', 'https', 'mailto', 'ftp', 'tel'])
    if (!allowed.has(scheme)) return 'about:blank'
  }
  return escapeXml(s)
}
