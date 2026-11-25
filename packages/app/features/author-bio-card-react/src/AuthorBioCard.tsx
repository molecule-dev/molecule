import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Avatar, Button, Card } from '@molecule/app-ui-react'
import { Anchor, Box, Text } from '@molecule/app-ui-react/elements'

/**
 * Social handles / profile links for an author. All keys are optional —
 * pass only the platforms the author actually has. Each value may be a
 * full URL or a bare handle (`"@alice"`); the card forwards values to
 * `<a href>` verbatim, so callers control the linking strategy.
 */
export interface AuthorSocials {
  /** Twitter / X profile URL or handle. */
  twitter?: string
  /** GitHub profile URL or handle. */
  github?: string
  /** LinkedIn profile URL. */
  linkedin?: string
  /** Mastodon profile URL or `@user@instance` handle. */
  mastodon?: string
  /** Personal website URL. */
  website?: string
}

/**
 * Author identity rendered by `<AuthorBioCard>`.
 */
export interface AuthorBioCardAuthor {
  /** Stable identifier (used as a link key, `data-mol-id` suffix, etc.). */
  id: string
  /** Display name — rendered as a clickable link if `href` is provided. */
  name: string
  /** Optional avatar image URL. Falls back to initials if omitted. */
  avatar?: string
  /** Optional bio paragraph. */
  bio?: string
  /** Optional profile URL — when set, the name renders as a link. */
  href?: string
  /** Optional dictionary of social handles / profile links. */
  socials?: AuthorSocials
}

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

const SOCIAL_KEYS = ['twitter', 'github', 'linkedin', 'mastodon', 'website'] as const

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
 * All user-facing strings (Follow / Following labels, social aria-labels)
 * route through `useTranslation()` so apps can override text via the
 * companion locale bond `@molecule/app-locales-author-bio-card`.
 *
 * @param props - Component props.
 * @param props.author - Author identity + bio + socials.
 * @param props.layout - Layout preset: `compact` (default) or `full`.
 * @param props.following - Whether the viewer currently follows this author.
 * @param props.onFollow - Toggle handler for the follow button.
 * @param props.className - Extra classes on the outer card.
 * @param props.dataMolId - `data-mol-id` for AI-agent selectors.
 * @returns The rendered author bio card.
 */
export function AuthorBioCard({
  author,
  layout = 'compact',
  following = false,
  onFollow,
  className,
  dataMolId = 'author-bio-card',
}: AuthorBioCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const socialEntries = SOCIAL_KEYS.flatMap<[SocialKey, string]>((key) => {
    const value = author.socials?.[key]
    return value ? [[key, value]] : []
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

  const followLabel = following
    ? t('authorBioCard.following', {}, { defaultValue: 'Following' })
    : t('authorBioCard.follow', {}, { defaultValue: 'Follow' })

  const nameElement = author.href ? (
    <Anchor
      href={author.href}
      data-mol-id={`${dataMolId}-name`}
      className={cm.cn(cm.fontWeight('semibold'), cm.textSize('base'))}
    >
      {author.name}
    </Anchor>
  ) : (
    <Text
      as="span"
      data-mol-id={`${dataMolId}-name`}
      className={cm.cn(cm.fontWeight('semibold'), cm.textSize('base'))}
    >
      {author.name}
    </Text>
  )

  const socialRow: ReactNode =
    socialEntries.length > 0 ? (
      <Box
        as="div"
        data-mol-id={`${dataMolId}-socials`}
        className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}
      >
        {socialEntries.map(([key, value]) => (
          <Anchor
            key={key}
            href={resolveSocialHref(key, value)}
            data-mol-id={`${dataMolId}-social-${key}`}
            aria-label={socialAriaLabel(key, author.name)}
            rel="noopener noreferrer"
            target="_blank"
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
          >
            {socialLabel(key)}
          </Anchor>
        ))}
      </Box>
    ) : null

  const followButton: ReactNode = onFollow ? (
    <Button
      variant={following ? 'outline' : 'solid'}
      color="primary"
      size="sm"
      onClick={() => onFollow(!following)}
      data-mol-id={`${dataMolId}-follow`}
      aria-pressed={following}
    >
      {followLabel}
    </Button>
  ) : null

  if (layout === 'full') {
    return (
      <Card data-mol-id={dataMolId} className={className}>
        <Box as="div" className={cm.flex({ align: 'start', gap: 'md' })}>
          <Box as="div" className={cm.shrink0}>
            <Avatar src={author.avatar} alt={author.name} name={author.name} size="lg" />
          </Box>
          <Box as="div" className={cm.cn(cm.flex1, cm.stack(2))}>
            <Box as="header" className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
              {nameElement}
            </Box>
            {author.bio && (
              <Text as="p" data-mol-id={`${dataMolId}-bio`} className={cm.textSize('sm')}>
                {author.bio}
              </Text>
            )}
            <Box
              as="div"
              className={cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' })}
            >
              {socialRow ?? <Box as="span" />}
              {followButton}
            </Box>
          </Box>
        </Box>
      </Card>
    )
  }

  return (
    <Card data-mol-id={dataMolId} className={className}>
      <Box as="div" className={cm.flex({ align: 'center', gap: 'md' })}>
        <Box as="div" className={cm.shrink0}>
          <Avatar src={author.avatar} alt={author.name} name={author.name} size="md" />
        </Box>
        <Box as="div" className={cm.cn(cm.flex1, cm.stack(1))}>
          <Box as="div" className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
            {nameElement}
          </Box>
          {author.bio && (
            <Text as="p" data-mol-id={`${dataMolId}-bio`} className={cm.textSize('sm')}>
              {author.bio}
            </Text>
          )}
          {socialRow}
        </Box>
        {followButton && (
          <Box as="div" className={cm.shrink0}>
            {followButton}
          </Box>
        )}
      </Box>
    </Card>
  )
}
