/**
 * Types for `device-classes.mjs`, which the build and the preset test both run.
 *
 * @module
 */

/**
 * The class-like words of a source file (Tailwind's scan splits on the same characters).
 *
 * @param text - A source file.
 * @returns Its words.
 */
export declare function words(text: string): string[]

/**
 * The classes `forDevice` produces from the words of the web ClassMap's files that none
 * of those files names.
 *
 * @param texts - The files Tailwind scans for the web ClassMap.
 * @param forDevice - The device rewrite.
 * @returns The classes, sorted.
 */
export declare function deviceOnlyClasses(
  texts: string[],
  forDevice: (classes: string) => string,
): string[]

/**
 * The classes descendants apply from their containers' descendant rules (`[&_p]:leading-relaxed`
 * makes a `p` apply `leading-relaxed`), which the native elements write at run time and no file
 * names alone.
 *
 * @param texts - The files Tailwind scans for the web ClassMap.
 * @param forDevice - The device rewrite.
 * @param descendantRule - Reads a class's rule.
 * @returns The classes, sorted.
 */
export declare function descendantClasses(
  texts: string[],
  forDevice: (classes: string) => string,
  descendantRule: (cls: string) => { tag: string; cls: string } | null,
): string[]

/**
 * Expands one class pattern as Tailwind 4's `@source inline()` does: `{a,b}` alternatives
 * (nested too) and `{1..96}` / `{0..100..10}` numeric ranges.
 *
 * @param pattern - A pattern without whitespace.
 * @returns The classes.
 */
export declare function expandBraces(pattern: string): string[]

/**
 * The classes a stylesheet's `@source inline("…")` rules ask Tailwind 4 to generate.
 *
 * @param css - The stylesheet.
 * @returns The classes, sorted.
 */
export declare function inlineSourceClasses(css: string): string[]

/**
 * The direction class splitForNative gives a flex container that names no direction (a web flex
 * container is a row; a device's is a column), at each variant the files write `flex` with.
 *
 * @param texts - The files Tailwind scans for the web ClassMap.
 * @returns The `flex-row` classes, sorted.
 */
export declare function flexRowClasses(texts: string[]): string[]
