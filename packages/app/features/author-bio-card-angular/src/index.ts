/**
 * Angular author bio card — avatar + name + bio + social links + follow button
 * — the counterpart of `@molecule/app-author-bio-card-react`: the same props
 * and the same DOM for the same input.
 *
 * Renders an author identity preview suitable for blog/podcast/video-streaming
 * article footers, sidebar "About the author" panels, and any other place a
 * lightweight user-profile card is needed. Two layouts (`compact`, `full`)
 * cover the common shapes.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { AuthorBioCard } from '@molecule/app-author-bio-card-angular'
 *
 * @Component({
 *   selector: 'app-author-footer',
 *   standalone: true,
 *   imports: [AuthorBioCard],
 *   template: `
 *     <div
 *       mol-author-bio-card
 *       [author]="author"
 *       layout="full"
 *       [following]="following"
 *       [onFollow]="setFollowing"
 *     ></div>
 *   `,
 * })
 * export class AuthorFooter {
 *   following = false
 *   author = {
 *     id: 'alice',
 *     name: 'Alice Example',
 *     avatar: '/avatars/alice.png',
 *     bio: 'Writes about distributed systems and tea.',
 *     href: '/authors/alice',
 *     socials: { twitter: 'alice', github: 'alice', website: 'alice.example' },
 *   }
 *   readonly setFollowing = (next: boolean): void => {
 *     this.following = next
 *   }
 * }
 * ```
 *
 * @remarks
 * All UI text routes through `useTranslation()` from `@molecule/app-angular`
 * so apps can override copy via the companion locale bond
 * `@molecule/app-locales-author-bio-card`.
 *
 * @module
 */

export * from './author-bio-card.component.js'
export * from './types.js'
