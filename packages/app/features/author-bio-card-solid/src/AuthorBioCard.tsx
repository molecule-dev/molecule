/**
 * Solid author bio card: avatar + name + bio + social links + optional follow
 * button.
 *
 * Solid counterpart of `@molecule/app-author-bio-card-react`'s `AuthorBioCard`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, Button, Card } from '@molecule/app-ui-solid'

import type { AuthorBioCardAuthor } from './types.js'

const SOCIAL_KEYS = ['twitter', 'github', 'linkedin', 'mastodon', 'website'] as const

type SocialKey = (typeof SOCIAL_KEYS)[number]

/** Props accepted by the {@link AuthorBioCard} component. */
interface AuthorBioCardProps {
  /** Author identity + bio + socials. */
  author: AuthorBioCardAuthor
  /**
   * Layout preset:
   * - `compact` (default) — single horizontal row, avatar + meta + button.
   * - `full` — large avatar, stacked meta block, social row + button.
   */
  layout?: 'compact' | 'full'
  /** Whether the viewer currently follows this author. */
  following?: boolean
  /** Toggle handler for the follow button. Omit to hide the button entirely. */
  onFollow?: (following: boolean) => void
  /** Extra classes on the outer card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. Defaults to `author-bio-card`. */
  dataMolId?: string
}

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
 * All user-facing strings (Follow / Following labels, social aria-labels)
 * route through `useTranslation()` so apps can override text via the
 * companion locale bond `@molecule/app-locales-author-bio-card`.
 *
 * @param props - Component props (see {@link AuthorBioCardProps}).
 * @returns The rendered author bio card.
 */
export const AuthorBioCard: Component<AuthorBioCardProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const dataMolId = (): string => props.dataMolId ?? 'author-bio-card'
  const following = (): boolean => props.following ?? false
  const layout = (): 'compact' | 'full' => props.layout ?? 'compact'

  /**
   * The social platforms the author actually has, in display order.
   *
   * @returns `[key, value]` pairs for the social row.
   */
  const socialEntries = (): Array<[SocialKey, string]> =>
    SOCIAL_KEYS.flatMap((key) => {
      const value = props.author.socials?.[key]
      return value ? [[key, value] as [SocialKey, string]] : []
    })

  /**
   * The translated accessible label of a social link. Every platform is a
   * literal key (the locale bond owns `authorBioCard.social.<platform>`).
   *
   * @param key - The social-network key.
   * @param name - The author's display name.
   * @returns The link's `aria-label`.
   */
  const socialAriaLabel = (key: SocialKey, name: string): string => {
    switch (key) {
      case 'twitter':
        return t('authorBioCard.social.twitter', { name }, { defaultValue: '{{name}} on Twitter' })
      case 'github':
        return t('authorBioCard.social.github', { name }, { defaultValue: '{{name}} on GitHub' })
      case 'linkedin':
        return t(
          'authorBioCard.social.linkedin',
          { name },
          { defaultValue: '{{name}} on LinkedIn' },
        )
      case 'mastodon':
        return t(
          'authorBioCard.social.mastodon',
          { name },
          { defaultValue: '{{name}} on Mastodon' },
        )
      case 'website':
        return t('authorBioCard.social.website', { name }, { defaultValue: "{{name}}'s website" })
    }
  }

  /**
   * The translated visible label of a social link. Every platform is a
   * literal key (the locale bond owns `authorBioCard.social.<platform>.label`).
   *
   * @param key - The social-network key.
   * @returns The link's text.
   */
  const socialLabel = (key: SocialKey): string => {
    switch (key) {
      case 'twitter':
        return t('authorBioCard.social.twitter.label', {}, { defaultValue: 'Twitter' })
      case 'github':
        return t('authorBioCard.social.github.label', {}, { defaultValue: 'GitHub' })
      case 'linkedin':
        return t('authorBioCard.social.linkedin.label', {}, { defaultValue: 'LinkedIn' })
      case 'mastodon':
        return t('authorBioCard.social.mastodon.label', {}, { defaultValue: 'Mastodon' })
      case 'website':
        return t('authorBioCard.social.website.label', {}, { defaultValue: 'Website' })
    }
  }

  /**
   * The translated follow-button label.
   *
   * @returns `Following` or `Follow`.
   */
  const followLabel = (): string =>
    following()
      ? t('authorBioCard.following', {}, { defaultValue: 'Following' })
      : t('authorBioCard.follow', {}, { defaultValue: 'Follow' })

  /**
   * The author name, as a link when `author.href` is set.
   *
   * @returns The name node.
   */
  const nameElement = (): JSX.Element =>
    props.author.href ? (
      <a
        href={props.author.href}
        data-mol-id={`${dataMolId()}-name`}
        class={cm.cn(cm.fontWeight('semibold'), cm.textSize('base'))}
      >
        {props.author.name}
      </a>
    ) : (
      <span
        data-mol-id={`${dataMolId()}-name`}
        class={cm.cn(cm.fontWeight('semibold'), cm.textSize('base'))}
      >
        {props.author.name}
      </span>
    )

  /**
   * The social row, or `null` when the author has no socials.
   *
   * @returns The social row node.
   */
  const socialRow = (): JSX.Element => {
    const entries = socialEntries()
    if (entries.length === 0) return null
    return (
      <div
        data-mol-id={`${dataMolId()}-socials`}
        class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
      >
        {entries.map(([key, value]) => (
          <a
            href={resolveSocialHref(key, value)}
            data-mol-id={`${dataMolId()}-social-${key}`}
            aria-label={socialAriaLabel(key, props.author.name)}
            rel="noopener noreferrer"
            target="_blank"
            class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
          >
            {socialLabel(key)}
          </a>
        ))}
      </div>
    )
  }

  /**
   * The follow button, or `null` when the caller gave no handler.
   *
   * @returns The follow button node.
   */
  const followButton = (): JSX.Element =>
    props.onFollow ? (
      <Button
        variant={following() ? 'outline' : 'solid'}
        color="primary"
        size="sm"
        onClick={() => props.onFollow?.(!following())}
        data-mol-id={`${dataMolId()}-follow`}
        aria-pressed={following()}
      >
        {followLabel()}
      </Button>
    ) : null

  /**
   * The bio paragraph, or `null` when `author.bio` is empty.
   *
   * @returns The bio node.
   */
  const bio = (): JSX.Element =>
    props.author.bio ? (
      <p data-mol-id={`${dataMolId()}-bio`} class={cm.textSize('sm')}>
        {props.author.bio}
      </p>
    ) : null

  /**
   * The full (stacked) layout.
   *
   * @returns The card.
   */
  const fullCard = (): JSX.Element => (
    <Card data-mol-id={dataMolId()} className={props.className}>
      <div class={cm.flex({ align: 'start', gap: 'md' })}>
        <div class={cm.shrink0}>
          <Avatar
            src={props.author.avatar}
            alt={props.author.name}
            name={props.author.name}
            size="lg"
          />
        </div>
        <div class={cm.cn(cm.flex1, cm.stack(2 as const))}>
          <header class={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
            {nameElement()}
          </header>
          {bio()}
          <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}>
            {socialRow() ?? <span />}
            {followButton()}
          </div>
        </div>
      </div>
    </Card>
  )

  /**
   * The compact (single row) layout.
   *
   * @returns The card.
   */
  const compactCard = (): JSX.Element => (
    <Card data-mol-id={dataMolId()} className={props.className}>
      <div class={cm.flex({ align: 'center', gap: 'md' })}>
        <div class={cm.shrink0}>
          <Avatar
            src={props.author.avatar}
            alt={props.author.name}
            name={props.author.name}
            size="md"
          />
        </div>
        <div class={cm.cn(cm.flex1, cm.stack(1 as const))}>
          <div class={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>{nameElement()}</div>
          {bio()}
          {socialRow()}
        </div>
        {props.onFollow && <div class={cm.shrink0}>{followButton()}</div>}
      </div>
    </Card>
  )

  return <>{layout() === 'full' ? fullCard() : compactCard()}</>
}
