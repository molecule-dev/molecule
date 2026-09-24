/**
 * Author bio card — avatar + name + bio + social links + follow button.
 *
 * Renders an author identity preview suitable for blog/podcast/video-streaming
 * article footers, sidebar "About the author" panels, and any other place a
 * lightweight user-profile card is needed. Two layouts (`compact`, `full`)
 * cover the common shapes.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { AuthorBioCard } from '@molecule/app-author-bio-card-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as authorBioCardLocales from '@molecule/app-locales-author-bio-card'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(authorBioCardLocales)
 *
 * const author = {
 *   id: 'alice',
 *   name: 'Alice Example',
 *   avatar: '/avatars/alice.png',
 *   bio: 'Writes about distributed systems and tea.',
 *   href: '/authors/alice',
 *   socials: { twitter: 'alice', github: 'alice', website: 'alice.example' },
 * }
 *
 * export function ArticleFooter() {
 *   const [following, setFollowing] = useState(false)
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <AuthorBioCard author={author} layout="full" following={following} onFollow={setFollowing} />
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs an i18n provider and a ClassMap.** It calls `useTranslation()`
 *   from `@molecule/app-react`, which throws unless an `I18nProvider` (or
 *   `MoleculeProvider i18n={...}`) is mounted above it, and `getClassMap()`,
 *   which throws until `setClassMap(...)` ran. It renders `Card`/`Avatar`/
 *   `Button` from `@molecule/app-ui-react` (a peer dependency).
 * - The follow button is controlled: it renders only when `onFollow` is
 *   passed, and calls `onFollow(!following)` — keep `following` in state or
 *   the label never flips. It does not persist follows anywhere.
 * - Bare social handles become profile URLs (`alice` →
 *   `https://github.com/alice`, `website` gets `https://`); full URLs pass
 *   through. Social links always open in a new tab.
 *
 * All UI text routes through `useTranslation()` from `@molecule/app-react`
 * so apps can override copy via the companion locale bond
 * `@molecule/app-locales-author-bio-card`.
 *
 * @module
 */

export * from './AuthorBioCard.js'
