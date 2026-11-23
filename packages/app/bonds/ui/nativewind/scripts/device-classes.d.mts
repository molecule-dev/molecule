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
