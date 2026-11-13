/**
 * Route patterns with React Router's matching rules, so a pattern means the same thing
 * under every routing bond: `:name` params, optional `:name?` params and `segment?`
 * segments, a trailing `*` splat, case-insensitive by default, and a trailing slash
 * allowed. The rules follow React Router's `matchPath` (MIT, Remix Software Inc.).
 *
 * @module
 */

/** Options for {@link matchRoutePattern}. */
export interface RoutePatternOptions {
  /** Whether the whole pathname must match (default `true`); `false` matches a prefix. */
  end?: boolean
  /** Whether letter case must match (default `false`, as in React Router). */
  caseSensitive?: boolean
}

/** A pathname matched by {@link matchRoutePattern}. */
export interface RoutePatternMatch {
  /**
   * The captured params, still URL-encoded except for `%2F`. An optional param that did
   * not match is present as `undefined`; a splat is `*`.
   */
  params: Record<string, string | undefined>
  /** The part of the pathname the pattern matched. */
  pathname: string
}

interface CompiledParam {
  name: string
  optional: boolean
}

/**
 * Builds the regular expression for a pattern.
 *
 * @param pattern - The route pattern.
 * @param caseSensitive - Whether letter case must match.
 * @param end - Whether the whole pathname must match.
 * @returns The expression and its params, in capture order.
 */
function compile(pattern: string, caseSensitive: boolean, end: boolean): [RegExp, CompiledParam[]] {
  const params: CompiledParam[] = []
  let source =
    '^' +
    pattern
      // The trailing `/` and `/*` are handled below.
      .replace(/\/*\*?$/, '')
      .replace(/^\/*/, '/')
      .replace(/[\\.*+^${}|()[\]]/g, '\\$&')
      .replace(
        /\/:([\w-]+)(\?)?/g,
        (match: string, name: string, optional: string | undefined, index: number, all: string) => {
          params.push({ name, optional: optional !== undefined })
          if (optional === undefined) return '/([^\\/]+)'
          const next = all.charAt(index + match.length)
          return next && next !== '/' ? '/([^\\/]*)' : '(?:/([^\\/]*))?'
        },
      )
      // An optional static segment: `/en?/about`.
      .replace(/\/((?:[^/?()[\]*^\\]|\\.)+)\?(?=\/|$|\()/g, '(?:/$1)?')
  if (pattern.endsWith('*')) {
    params.push({ name: '*', optional: false })
    source += pattern === '*' || pattern === '/*' ? '(.*)$' : '(?:\\/(.+)|\\/*)$'
  } else if (end) {
    source += '\\/*$'
  } else if (pattern !== '' && pattern !== '/') {
    source += '(?:(?=\\/|$))'
  }
  return [new RegExp(source, caseSensitive ? undefined : 'i'), params]
}

/**
 * Matches a pathname against a route pattern with React Router's rules.
 *
 * @param pattern - The route pattern (`/users/:id`, `/docs/*`, `/:lang?/about`).
 * @param pathname - The pathname to match.
 * @param options - Whether the match must be whole and case-sensitive.
 * @returns The match, or `null`.
 *
 * @example
 * ```ts
 * matchRoutePattern('/category/:slug', '/Category/books/')
 * // { params: { slug: 'books' }, pathname: '/Category/books/' }
 * ```
 */
export function matchRoutePattern(
  pattern: string,
  pathname: string,
  options: RoutePatternOptions = {},
): RoutePatternMatch | null {
  const [matcher, params] = compile(pattern, options.caseSensitive ?? false, options.end ?? true)
  const match = matcher.exec(pathname)
  if (!match) return null
  const captures = match.slice(1)
  const values: Record<string, string | undefined> = {}
  params.forEach(({ name, optional }, index) => {
    const value = captures[index]
    values[name] = optional && !value ? undefined : (value ?? '').replace(/%2F/g, '/')
  })
  return { params: values, pathname: match[0] }
}
