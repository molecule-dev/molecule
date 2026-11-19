/**
 * The props the pages of the `lazy-page` cases declare. Each page annotates its `$props()`
 * with one of these, so `svelte-check` rejects a page whose declaration drifts from it, and
 * the cases read the same declaration the page renders from.
 *
 * @module
 */

/** Props of the page that declares none (React's `function About(): JSX.Element`). */
export type EmptyPageProps = Record<string, never>

/** Props of the page that requires one (React's `function Post({ slug })`). */
export interface PostProps {
  /** The post's slug. */
  slug: string
}

/** Props of the page whose props parameter is optional (React's `Draft`, `= {}`). */
export interface DraftProps {
  /** The draft's saved initial value. */
  initial?: string
}
