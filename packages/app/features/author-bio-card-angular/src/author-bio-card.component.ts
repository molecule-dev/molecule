/**
 * AuthorBioCard component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, Button } from '@molecule/app-ui-angular'

import type { AuthorBioCardAuthor, AuthorSocials } from './types.js'

const SOCIAL_KEYS = ['twitter', 'github', 'linkedin', 'mastodon', 'website'] as const

/**
 * One social platform key.
 */
type SocialKey = (typeof SOCIAL_KEYS)[number]

/**
 * Resolve a social value (URL or bare handle) into an `href`. URLs pass
 * through unchanged; bare handles are routed to a sensible per-platform
 * default. Mastodon handles of the form `@user@instance` become
 * `https://instance/@user`.
 *
 * @param key - Which platform the value is for.
 * @param value - The raw social value (URL or handle).
 * @returns A fully-qualified URL safe to use as `<a href>`.
 */
export function resolveSocialHref(key: SocialKey, value: string): string {
  const trimmed = value.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (key === 'website') return `https://${trimmed.replace(/^\/+/, '')}`
  const handle = trimmed.replace(/^@/, '')
  if (key === 'twitter') return `https://twitter.com/${handle}`
  if (key === 'github') return `https://github.com/${handle}`
  if (key === 'linkedin') return `https://www.linkedin.com/in/${handle}`
  if (key === 'mastodon') {
    const parts = handle.split('@')
    if (parts.length === 2) return `https://${parts[1]}/@${parts[0]}`
    return `https://mastodon.social/@${handle}`
  }
  return trimmed
}

/**
 * Author bio card — avatar + name + bio + social links + optional follow
 * button. Designed for blog/podcast/video-streaming article footers and
 * other user-profile previews. Two layouts:
 *
 * - `compact` (default): single horizontal row, suitable for inline
 *   author bylines or sidebar "About the author" panels.
 * - `full`: stacked layout with a larger avatar and a dedicated social row
 *   beneath the bio paragraph.
 *
 * The host IS the Card `div` (`div[mol-author-bio-card]`), matching React's
 * root exactly — same classes, same `data-mol-id`. All user-facing strings
 * (Follow / Following labels, social aria-labels) route through
 * `useTranslation()` so apps can override text via the companion locale bond
 * `@molecule/app-locales-author-bio-card`.
 *
 * This is the Angular counterpart of `@molecule/app-author-bio-card-react`.
 */
@Component({
  selector: 'div[mol-author-bio-card]',
  standalone: true,
  imports: [Avatar, Button],
  inputs: ['author', 'layout', 'following', 'onFollow', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'containerId()',
  },
  // prettier-ignore
  template: `@if (layout === 'full') {
  <div [class]="rowFullClasses()">
    <div [class]="shrink0Classes()"><div mol-avatar [src]="author?.avatar" [alt]="author?.name" [name]="author?.name" [size]="'lg'"></div></div>
    <div [class]="bodyFullClasses()">
      <header [class]="baselineClasses()">@if (author && author.href) {<a [href]="author.href" [attr.data-mol-id]="id('name')" [class]="nameClasses()">{{ author.name }}</a>} @else {<span [attr.data-mol-id]="id('name')" [class]="nameClasses()">{{ author?.name }}</span>}</header>
      @if (author && author.bio) {<p [attr.data-mol-id]="id('bio')" [class]="bioClasses()">{{ author.bio }}</p>}
      <div [class]="betweenClasses()">
        @if (socialEntries().length > 0) {<div [attr.data-mol-id]="id('socials')" [class]="socialRowClasses()">@for (entry of socialEntries(); track entry[0]) {<a [href]="hrefOf(entry)" [attr.data-mol-id]="socialId(entry[0])" [attr.aria-label]="socialAriaLabel(entry[0])" rel="noopener noreferrer" target="_blank" [class]="socialLinkClasses()">{{ socialText(entry[0]) }}</a>}</div>} @else {<span></span>}
        @if (onFollow) {<button mol-button [variant]="following ? 'outline' : 'solid'" [color]="'primary'" [size]="'sm'" (click)="toggleFollow()" [attr.data-mol-id]="id('follow')" [attr.aria-pressed]="following ? 'true' : 'false'">{{ followLabel() }}</button>}
      </div>
    </div>
  </div>
} @else {
  <div [class]="rowCompactClasses()">
    <div [class]="shrink0Classes()"><div mol-avatar [src]="author?.avatar" [alt]="author?.name" [name]="author?.name" [size]="'md'"></div></div>
    <div [class]="bodyCompactClasses()">
      <div [class]="baselineClasses()">@if (author && author.href) {<a [href]="author.href" [attr.data-mol-id]="id('name')" [class]="nameClasses()">{{ author.name }}</a>} @else {<span [attr.data-mol-id]="id('name')" [class]="nameClasses()">{{ author?.name }}</span>}</div>
      @if (author && author.bio) {<p [attr.data-mol-id]="id('bio')" [class]="bioClasses()">{{ author.bio }}</p>}
      @if (socialEntries().length > 0) {<div [attr.data-mol-id]="id('socials')" [class]="socialRowClasses()">@for (entry of socialEntries(); track entry[0]) {<a [href]="hrefOf(entry)" [attr.data-mol-id]="socialId(entry[0])" [attr.aria-label]="socialAriaLabel(entry[0])" rel="noopener noreferrer" target="_blank" [class]="socialLinkClasses()">{{ socialText(entry[0]) }}</a>}</div>}
    </div>
    @if (onFollow) {<div [class]="shrink0Classes()"><button mol-button [variant]="following ? 'outline' : 'solid'" [color]="'primary'" [size]="'sm'" (click)="toggleFollow()" [attr.data-mol-id]="id('follow')" [attr.aria-pressed]="following ? 'true' : 'false'">{{ followLabel() }}</button></div>}
  </div>
}`,
})
export class AuthorBioCard {
  /** Author identity + bio + socials. */
  author?: AuthorBioCardAuthor
  /** Layout preset: `compact` (default) or `full`. */
  layout?: 'compact' | 'full'
  /** Whether the viewer currently follows this author. */
  following?: boolean
  /** Toggle handler for the follow button. Omit to hide the button entirely. */
  onFollow?: (following: boolean) => void
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. Defaults to `author-bio-card`. */
  dataMolId?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The `data-mol-id` on the card (React's default parameter).
   * @returns The card's `data-mol-id`.
   */
  containerId(): string {
    return this.dataMolId ?? 'author-bio-card'
  }

  /**
   * A child `data-mol-id` (React's `${dataMolId}-<suffix>`).
   * @param suffix - The child selector suffix.
   * @returns The child's `data-mol-id`.
   */
  id(suffix: string): string {
    return `${this.containerId()}-${suffix}`
  }

  /**
   * The card class list (React's `<Card>` with its default variant/padding).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * A fixed-width wrapper (React's `cm.shrink0`).
   * @returns The class string.
   */
  shrink0Classes(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The compact row's class list (React's `cm.flex({ align: 'center', gap: 'md' })`).
   * @returns The class string.
   */
  rowCompactClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'md' })
  }

  /**
   * The full row's class list (React's `cm.flex({ align: 'start', gap: 'md' })`).
   * @returns The class string.
   */
  rowFullClasses(): string {
    return this.cm().flex({ align: 'start', gap: 'md' })
  }

  /**
   * The compact body column (React's `cm.cn(cm.flex1, cm.stack(1))`).
   * @returns The class string.
   */
  bodyCompactClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1 as const))
  }

  /**
   * The full body column (React's `cm.cn(cm.flex1, cm.stack(2))`).
   * @returns The class string.
   */
  bodyFullClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(2 as const))
  }

  /**
   * The name row (React's `cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  baselineClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The full social/follow row (React's between-aligned flex row).
   * @returns The class string.
   */
  betweenClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The social row (React's `cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  socialRowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * The social link (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))`).
   * @returns The class string.
   */
  socialLinkClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('medium'))
  }

  /**
   * The author name (React's `cm.cn(cm.fontWeight('semibold'), cm.textSize('base'))`).
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().fontWeight('semibold'), this.cm().textSize('base'))
  }

  /**
   * The bio paragraph (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  bioClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The translated follow-button label.
   * @returns `Following` or `Follow`.
   */
  followLabel(): string {
    return this.following
      ? this.i18n.t('authorBioCard.following', {}, { defaultValue: 'Following' })
      : this.i18n.t('authorBioCard.follow', {}, { defaultValue: 'Follow' })
  }

  /**
   * The social platforms the author actually has, in display order.
   * @returns `[key, value]` pairs for the social row.
   */
  socialEntries(): Array<[SocialKey, string]> {
    const socials: AuthorSocials | undefined = this.author?.socials
    return SOCIAL_KEYS.flatMap((key) => {
      const value = socials?.[key]
      return value ? [[key, value] as [SocialKey, string]] : []
    })
  }

  /**
   * One social entry's `href`.
   * @param entry - A `[key, value]` pair.
   * @returns The resolved URL.
   */
  hrefOf(entry: [SocialKey, string]): string {
    return resolveSocialHref(entry[0], entry[1])
  }

  /**
   * One social link's `data-mol-id`.
   * @param key - The social-network key.
   * @returns The link's `data-mol-id`.
   */
  socialId(key: SocialKey): string {
    return this.id(`social-${key}`)
  }

  /**
   * The translated accessible label of a social link. Every platform is a
   * literal key (the locale bond owns `authorBioCard.social.<platform>`).
   * @param key - The social-network key.
   * @returns The link's `aria-label`.
   */
  socialAriaLabel(key: SocialKey): string {
    const name = this.author?.name ?? ''
    switch (key) {
      case 'twitter':
        return this.i18n.t(
          'authorBioCard.social.twitter',
          { name },
          { defaultValue: '{{name}} on Twitter' },
        )
      case 'github':
        return this.i18n.t(
          'authorBioCard.social.github',
          { name },
          { defaultValue: '{{name}} on GitHub' },
        )
      case 'linkedin':
        return this.i18n.t(
          'authorBioCard.social.linkedin',
          { name },
          { defaultValue: '{{name}} on LinkedIn' },
        )
      case 'mastodon':
        return this.i18n.t(
          'authorBioCard.social.mastodon',
          { name },
          { defaultValue: '{{name}} on Mastodon' },
        )
      case 'website':
        return this.i18n.t(
          'authorBioCard.social.website',
          { name },
          { defaultValue: "{{name}}'s website" },
        )
    }
  }

  /**
   * The translated visible label of a social link. Every platform is a
   * literal key (the locale bond owns `authorBioCard.social.<platform>.label`).
   * @param key - The social-network key.
   * @returns The link's text.
   */
  socialText(key: SocialKey): string {
    switch (key) {
      case 'twitter':
        return this.i18n.t('authorBioCard.social.twitter.label', {}, { defaultValue: 'Twitter' })
      case 'github':
        return this.i18n.t('authorBioCard.social.github.label', {}, { defaultValue: 'GitHub' })
      case 'linkedin':
        return this.i18n.t('authorBioCard.social.linkedin.label', {}, { defaultValue: 'LinkedIn' })
      case 'mastodon':
        return this.i18n.t('authorBioCard.social.mastodon.label', {}, { defaultValue: 'Mastodon' })
      case 'website':
        return this.i18n.t('authorBioCard.social.website.label', {}, { defaultValue: 'Website' })
    }
  }

  /**
   * Reports the toggled follow state through the caller's handler.
   */
  toggleFollow(): void {
    this.onFollow?.(!this.following)
  }
}
