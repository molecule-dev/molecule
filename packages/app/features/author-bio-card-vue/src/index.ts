/**
 * Vue author bio card — avatar + name + bio + social links + follow button.
 *
 * Renders an author identity preview suitable for blog/podcast/video-streaming
 * article footers, sidebar "About the author" panels, and any other place a
 * lightweight user-profile card is needed. Two layouts (`compact`, `full`)
 * cover the common shapes.
 *
 * This is the Vue counterpart of `@molecule/app-author-bio-card-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { AuthorBioCard } from '@molecule/app-author-bio-card-vue'
 *
 * const AuthorFooter = defineComponent({
 *   setup() {
 *     const following = ref(false)
 *     return () =>
 *       h(AuthorBioCard, {
 *         author: {
 *           id: 'alice',
 *           name: 'Alice Example',
 *           avatar: '/avatars/alice.png',
 *           bio: 'Writes about distributed systems and tea.',
 *           href: '/authors/alice',
 *           socials: { twitter: 'alice', github: 'alice', website: 'alice.example' },
 *         },
 *         layout: 'full',
 *         following: following.value,
 *         onFollow: (next: boolean) => {
 *           following.value = next
 *         },
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * All UI text routes through `useTranslation()` from `@molecule/app-vue`
 * so apps can override copy via the companion locale bond
 * `@molecule/app-locales-author-bio-card`.
 *
 * @module
 */

export * from './AuthorBioCard.js'
export * from './types.js'
