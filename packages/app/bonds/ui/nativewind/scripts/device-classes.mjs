/**
 * The classes the device ClassMap returns that no file of the web ClassMap names.
 *
 * Tailwind generates only the classes it finds in the files an app's `content` lists.
 * `forDevice` rewrites some web classes at run time (`space-y-2` → `gap-y-2`), and the
 * rewritten class appears in no file, so no app would get a rule for it. The build writes
 * them to `dist/device-classes.cjs`, inside the folder `moleculeContent()` names.
 *
 * @module
 */

/**
 * The class-like words of a source file (Tailwind's scan splits on the same characters).
 *
 * @param {string} text - A source file.
 * @returns {string[]} Its words.
 */
export function words(text) {
  return text.split(/[\s'"`\\]+/).filter(Boolean)
}

/**
 * The classes `forDevice` produces from the words of the web ClassMap's files that none
 * of those files names.
 *
 * @param {string[]} texts - The files Tailwind scans for the web ClassMap.
 * @param {(classes: string) => string} forDevice - The device rewrite.
 * @returns {string[]} The classes, sorted.
 */
export function deviceOnlyClasses(texts, forDevice) {
  const named = new Set(texts.flatMap(words))
  const found = new Set()
  for (const word of named)
    for (const cls of forDevice(word).split(/\s+/)) if (cls && !named.has(cls)) found.add(cls)
  return [...found].sort()
}

/**
 * The classes the native elements apply at run time in place of a class with a rule, which no
 * file names alone: a descendant's class from its container's `[&_p]:leading-relaxed`
 * (`leading-relaxed`), or a class whose data attributes match (`data-[state=checked]:bg-primary`
 * is `bg-primary`).
 *
 * @param {string[]} texts - The files Tailwind scans for the web ClassMap.
 * @param {(classes: string) => string} forDevice - The device rewrite.
 * @param {(cls: string) => { cls: string } | null} rule - Reads a class's rule.
 * @returns {string[]} The classes, sorted.
 */
export function ruleClasses(texts, forDevice, rule) {
  const found = new Set()
  for (const word of new Set(texts.flatMap(words)))
    for (const cls of forDevice(word).split(/\s+/)) {
      const read = cls ? rule(cls) : null
      if (read) found.add(read.cls)
    }
  return [...found].sort()
}

/**
 * Splits a brace group's body at its top-level commas.
 *
 * @param {string} body - The text between a group's braces.
 * @returns {string[]} The alternatives.
 */
function alternatives(body) {
  const parts = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') depth++
    else if (body[i] === '}') depth--
    else if (body[i] === ',' && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts
}

/**
 * Expands one class pattern as Tailwind 4's `@source inline()` does: `{a,b}` alternatives
 * (nested too) and `{1..96}` / `{0..100..10}` numeric ranges.
 *
 * @param {string} pattern - A pattern without whitespace.
 * @returns {string[]} The classes.
 */
export function expandBraces(pattern) {
  const open = pattern.indexOf('{')
  if (open === -1) return [pattern]
  let depth = 0
  let close = -1
  for (let i = open; i < pattern.length; i++) {
    if (pattern[i] === '{') depth++
    else if (pattern[i] === '}' && --depth === 0) {
      close = i
      break
    }
  }
  if (close === -1) throw new Error(`unbalanced braces in @source inline pattern ${pattern}`)
  const head = pattern.slice(0, open)
  const tail = pattern.slice(close + 1)
  const body = pattern.slice(open + 1, close)
  const range = /^(-?\d+)\.\.(-?\d+)(?:\.\.(\d+))?$/.exec(body)
  const options = range
    ? Array.from(
        { length: Math.floor((Number(range[2]) - Number(range[1])) / Number(range[3] ?? 1)) + 1 },
        (_, i) => String(Number(range[1]) + i * Number(range[3] ?? 1)),
      )
    : alternatives(body).flatMap(expandBraces)
  return options.flatMap((option) => expandBraces(`${head}${option}${tail}`))
}

/**
 * The classes a stylesheet's `@source inline("…")` rules ask Tailwind 4 to generate: the ones
 * the web ClassMap builds at run time (`text-${size}`), which no file names. Tailwind 3 has no
 * such rule, so the device build lists them for an app's scan. `@source not inline` is skipped.
 *
 * @param {string} css - The stylesheet.
 * @returns {string[]} The classes, sorted.
 */
export function inlineSourceClasses(css) {
  const found = new Set()
  for (const [, list] of css.matchAll(/@source\s+inline\(\s*"([^"]*)"\s*\)/g))
    for (const pattern of list.split(/\s+/).filter(Boolean))
      for (const cls of expandBraces(pattern)) found.add(cls)
  return [...found].sort()
}

/**
 * The direction class splitForNative gives a flex container that names no direction (a web flex
 * container is a row; a device's is a column), at each variant the files write `flex` with.
 *
 * @param {string[]} texts - The files Tailwind scans for the web ClassMap.
 * @returns {string[]} The `flex-row` classes, sorted.
 */
export function flexRowClasses(texts) {
  const found = new Set()
  for (const word of texts.flatMap(words)) {
    const match = /^((?:[\w[\]&=.-]+:)*)(?:inline-)?flex$/.exec(word)
    if (match) found.add(`${match[1]}flex-row`)
  }
  return [...found].sort()
}
