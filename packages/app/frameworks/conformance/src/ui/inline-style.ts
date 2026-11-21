/**
 * Inline-style assertions that compare what a browser applies, not how an engine writes it.
 *
 * A port's unit test that reads `innerHTML` and looks for `'grid-column: span 6'` or
 * `'outline: 2px solid currentColor'` tests the DOM engine's serializer, not the component: jsdom
 * 31 (like a browser) writes `grid-column` + `grid-row` as one `grid-area` and `currentColor` as
 * `currentcolor`, and every such assertion failed on the jsdom upgrade with markup that renders
 * identically. React's tests read `renderToStaticMarkup` text, which no CSSOM touches, so the
 * same words could not be copied across.
 *
 * @module
 */

/** A style property name in camelCase (React's) or kebab-case, as the CSSOM's dash form. */
const dashed = (name: string): string =>
  name.startsWith('--') ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

/**
 * Checks that some element of `markup` carries every expected inline declaration, compared the
 * way the document's CSSOM applies them: each expected declaration is written into a probe
 * element of the same document and read back from the probe and from each candidate element, so
 * the engine's serialization (`grid-area` for `grid-column` + `grid-row`, `currentcolor`, `0px`)
 * never decides the test, and a value the engine applies differently does.
 *
 * @param markup - Rendered HTML (a test's `innerHTML`).
 * @param expected - Declarations, by property name (camelCase or kebab-case), to their values.
 * @param selector - Limits the candidates (default: every element).
 * @returns `null` when some candidate carries every declaration; otherwise a message listing the
 *   candidates' inline styles, for the assertion to print.
 * @throws {Error} When an expected value is one the CSSOM rejects (a typo in the test).
 *
 * @example
 * ```ts
 * expect(inlineStyleMismatch(markup, { gridColumn: 'span 6', gridRow: 'span 2' })).toBeNull()
 * ```
 */
export function inlineStyleMismatch(
  markup: string,
  expected: Readonly<Record<string, string>>,
  selector = '*',
): string | null {
  const host = document.createElement('div')
  host.innerHTML = markup
  const probe = document.createElement('div')
  const names = Object.keys(expected).map(dashed)
  for (const [name, value] of Object.entries(expected)) {
    probe.style.setProperty(dashed(name), value)
    if (!probe.style.getPropertyValue(dashed(name)))
      throw new Error(`inlineStyleMismatch: the CSSOM rejects ${dashed(name)}: ${value}`)
  }
  const candidates = [...host.querySelectorAll<HTMLElement>(selector)]
  if (
    candidates.some((el) =>
      names.every((name) => el.style.getPropertyValue(name) === probe.style.getPropertyValue(name)),
    )
  )
    return null
  const want = names.map((name) => `${name}: ${probe.style.getPropertyValue(name)}`).join('; ')
  const seen = candidates
    .filter((el) => el.hasAttribute('style'))
    .map((el) => `<${el.localName} style="${el.getAttribute('style')}">`)
  return `no element (${selector}) has ${want}; inline styles: ${seen.length ? seen.join(', ') : '(none)'}`
}
