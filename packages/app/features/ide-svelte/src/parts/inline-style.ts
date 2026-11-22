/**
 * The inline-style action the ported chat parts share.
 *
 * Svelte's `style={text}` (and a static `style` attribute on its first render)
 * hands the whole declaration list to `cssText`, whose parser drops or rewrites
 * some declarations — `background: none` beside `width`, a `font: inherit`
 * shorthand that swallows an earlier `background` — while React writes a style
 * object ONE PROPERTY AT A TIME through the CSSOM. This action does the same:
 * each declaration of the CSS text is applied with `style.setProperty`, and a
 * name that disappears from a later value is removed again, so the element's
 * serialized `style` attribute equals React's for the same input.
 *
 * @module
 */

/** One parsed declaration. */
interface Declaration {
  /** The CSS property name (kebab-case). */
  name: string
  /** The property value, verbatim. */
  value: string
}

/**
 * Splits CSS text into its declarations (values never contain a semicolon in
 * the styles this package writes).
 *
 * @param text - The CSS text.
 * @returns The declarations, in source order.
 */
function parseDeclarations(text: string): Declaration[] {
  const declarations: Declaration[] = []
  for (const part of text.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const colon = trimmed.indexOf(':')
    if (colon < 0) continue
    declarations.push({
      name: trimmed.slice(0, colon).trim(),
      value: trimmed.slice(colon + 1).trim(),
    })
  }
  return declarations
}

/**
 * Applies a CSS text one declaration at a time, exactly the way React's style
 * objects reach the DOM. Declarations that disappear from a later text are
 * removed again.
 *
 * @param node - The element the action is attached to.
 * @param text - The CSS text (null/undefined clears the inline style).
 * @returns The action's update hook for later values.
 */
export function styleText(
  node: Element & ElementCSSInlineStyle,
  text: string | null | undefined,
): { update: (next: string | null | undefined) => void } {
  let names: string[] = []

  /**
   * Writes one CSS text onto the element.
   *
   * @param css - The CSS text.
   */
  const apply = (css: string | null | undefined): void => {
    const declarations = parseDeclarations(css ?? '')
    const nextNames = declarations.map((declaration) => declaration.name)
    for (const name of names) {
      if (!nextNames.includes(name)) node.style.removeProperty(name)
    }
    for (const declaration of declarations) {
      node.style.setProperty(declaration.name, declaration.value)
    }
    names = nextNames
  }

  apply(text)
  return { update: apply }
}
