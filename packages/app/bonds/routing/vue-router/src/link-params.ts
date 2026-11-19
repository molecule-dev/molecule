/**
 * Type-level reading of the parameter names a Vue Router path declares. The link
 * arguments `defineRoute` accepts, and the params a page receives, both come from here.
 * This module is internal: `src/index.ts` does not re-export it.
 *
 * @module
 */

/** Characters a Vue Router parameter name may contain. */
type VueParamNameChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'

/**
 * Drops a parenthesised regular expression, counting nested groups and skipping
 * escaped characters.
 *
 * @template S - The text after the opening parenthesis.
 * @template Depth - One tuple entry for each group still open.
 */
type SkipVueRegexp<
  S extends string,
  Depth extends readonly unknown[],
> = S extends `\\${string}${infer R}`
  ? SkipVueRegexp<R, Depth>
  : S extends `(${infer R}`
    ? SkipVueRegexp<R, readonly [...Depth, unknown]>
    : S extends `)${infer R}`
      ? Depth extends readonly [unknown]
        ? R
        : Depth extends readonly [unknown, ...infer Rest]
          ? SkipVueRegexp<R, Rest>
          : R
      : S extends `${string}${infer R}`
        ? SkipVueRegexp<R, Depth>
        : ''

/**
 * Drops the optional `(regex)` that follows a parameter name.
 *
 * @template S - The text after a parameter name.
 */
type SkipVueRegexpGroup<S extends string> = S extends `(${infer R}`
  ? SkipVueRegexp<R, readonly [unknown]>
  : S

/**
 * Marks an optional parameter name in the scan, so the two kinds stay apart.
 *
 * @template Name - A parameter name.
 */
type OptionalVueParam<Name extends string> = `?${Name}`

/**
 * Records a parameter's optionality, then resumes the scan.
 *
 * @template S - The text after the parameter name or its `(regex)`.
 * @template Name - The parameter name just read.
 * @template Found - The names collected before this one.
 */
type MarkVueParam<S extends string, Name extends string, Found extends string> = Name extends ''
  ? ScanVueParams<S, Found>
  : S extends `?${infer R}`
    ? ScanVueParams<R, Found | OptionalVueParam<Name>>
    : S extends `*${infer R}`
      ? ScanVueParams<R, Found | OptionalVueParam<Name>>
      : S extends `+${infer R}`
        ? ScanVueParams<R, Found | Name>
        : ScanVueParams<S, Found | Name>

/**
 * Reads a parameter name one character at a time, then reads its optionality.
 *
 * @template S - The text from the next unread character.
 * @template Name - The name read so far.
 * @template Found - The names collected before this one.
 */
type ReadVueParamName<
  S extends string,
  Name extends string,
  Found extends string,
> = S extends `${infer C}${infer R}`
  ? VueParamNameChars extends `${string}${C}${string}`
    ? ReadVueParamName<R, `${Name}${C}`, Found>
    : MarkVueParam<SkipVueRegexpGroup<S>, Name, Found>
  : MarkVueParam<'', Name, Found>

/**
 * Scans a path for the names after each `:`, keeping optional ones marked.
 *
 * @template S - The path text still to scan.
 * @template Found - The names collected so far.
 */
type ScanVueParams<S extends string, Found extends string = never> = S extends `:${infer R}`
  ? ReadVueParamName<R, '', Found>
  : S extends `${string}${infer R}`
    ? ScanVueParams<R, Found>
    : Found

/**
 * Every parameter name the scan found, optional ones marked with a leading `?`.
 *
 * @template Path - A route path.
 */
type MarkedVueParamName<Path extends string> = string extends Path
  ? string
  : Exclude<ScanVueParams<Path>, ''>

/**
 * The name an optional mark carries.
 *
 * @template Mark - An optional (`?`) mark around a name.
 */
type UnmarkOptionalVueParam<Mark extends string> =
  Mark extends OptionalVueParam<infer Name> ? Name : never

/**
 * The parameter names a Vue Router path declares, split by whether a link must
 * supply them. Covers `:name`, `:name?`, `:name(regex)`, `:name+` and `:name*`.
 * A path that is not a literal declares any name.
 *
 * @template Path - A route path.
 */
export type VueRouteLinkNames<Path extends string> = {
  /** Names a link must supply: `:name`, `:name(regex)` and `:name+`. */
  required: string extends Path
    ? string
    : Exclude<MarkedVueParamName<Path>, OptionalVueParam<string>>
  /** Names a link may leave out: `:name?` and `:name*`. */
  optional: string extends Path
    ? string
    : UnmarkOptionalVueParam<Extract<MarkedVueParamName<Path>, OptionalVueParam<string>>>
}
