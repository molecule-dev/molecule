/**
 * Solid author bio card — avatar + name + bio + social links + follow button.
 *
 * Renders an author identity preview suitable for blog/podcast/video-streaming
 * article footers, sidebar "About the author" panels, and any other place a
 * lightweight user-profile card is needed. Two layouts (`compact`, `full`)
 * cover the common shapes.
 *
 * This is the Solid counterpart of `@molecule/app-author-bio-card-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { AuthorBioCard } from '@molecule/app-author-bio-card-solid'
 *
 * export function AuthorFooter() {
 *   const [following, setFollowing] = createSignal(false)
 *   return (
 *     <AuthorBioCard
 *       author={{
 *         id: 'alice',
 *         name: 'Alice Example',
 *         avatar: '/avatars/alice.png',
 *         bio: 'Writes about distributed systems and tea.',
 *         href: '/authors/alice',
 *         socials: { twitter: 'alice', github: 'alice', website: 'alice.example' },
 *       }}
 *       layout="full"
 *       following={following()}
 *       onFollow={setFollowing}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * All UI text routes through `useTranslation()` from `@molecule/app-solid`
 * so apps can override copy via the companion locale bond
 * `@molecule/app-locales-author-bio-card`.
 *
 * @module
 */

export * from './AuthorBioCard.jsx'
export * from './types.js'
