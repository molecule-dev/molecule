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
