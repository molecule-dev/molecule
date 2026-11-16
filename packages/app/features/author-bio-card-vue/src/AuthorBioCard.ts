/**
 * Vue author bio card: avatar + name + bio + social links + optional follow
 * button.
 *
 * Vue counterpart of `@molecule/app-author-bio-card-react`'s `AuthorBioCard` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { Avatar, Button, Card } from '@molecule/app-ui-vue'
import { useTranslation } from '@molecule/app-vue'

import type { AuthorBioCardAuthor } from './types.js'

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
 * @param props - Component props: the author, the layout, the follow state and handler, extra classes and the id.
 * @returns The rendered author bio card.
 */
export const AuthorBioCard = defineComponent({
  name: 'AuthorBioCard',
  props: {
    author: {
      type: Object as PropType<AuthorBioCardAuthor>,
      required: true,
    },
    layout: {
      type: String as PropType<'compact' | 'full'>,
      default: 'compact',
    },
    following: {
      type: Boolean,
      default: false,
    },
    onFollow: {
      type: Function as PropType<(following: boolean) => void>,
    },
    className: String,
    dataMolId: {
      type: String,
      default: 'author-bio-card',
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const author = props.author
      const dataMolId = props.dataMolId

      const socialEntries: Array<[SocialKey, string]> = SOCIAL_KEYS.flatMap((key) => {
        const value = author.socials?.[key]
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
            return t(
              'authorBioCard.social.twitter',
              { name },
              { defaultValue: '{{name}} on Twitter' },
            )
          case 'github':
            return t(
              'authorBioCard.social.github',
              { name },
              { defaultValue: '{{name}} on GitHub' },
            )
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
            return t(
              'authorBioCard.social.website',
              { name },
              { defaultValue: "{{name}}'s website" },
            )
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

      const followLabel = props.following
        ? t('authorBioCard.following', {}, { defaultValue: 'Following' })
        : t('authorBioCard.follow', {}, { defaultValue: 'Follow' })

      const nameClasses = cm.cn(cm.fontWeight('semibold'), cm.textSize('base'))

      const nameElement: VNodeChild = author.href
        ? h(
            'a',
            {
              href: author.href,
              'data-mol-id': `${dataMolId}-name`,
              class: nameClasses,
            },
            author.name,
          )
        : h(
            'span',
            {
              'data-mol-id': `${dataMolId}-name`,
              class: nameClasses,
            },
            author.name,
          )

      const socialRow: VNodeChild =
        socialEntries.length > 0
          ? h(
              'div',
              {
                'data-mol-id': `${dataMolId}-socials`,
                class: cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }),
              },
              socialEntries.map(([key, value]) =>
                h(
                  'a',
                  {
                    href: resolveSocialHref(key, value),
                    'data-mol-id': `${dataMolId}-social-${key}`,
                    'aria-label': socialAriaLabel(key, author.name),
                    rel: 'noopener noreferrer',
                    target: '_blank',
                    class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium')),
                  },
                  socialLabel(key),
                ),
              ),
            )
          : null

      const followButton: VNodeChild = props.onFollow
        ? h(
            Button,
            {
              variant: props.following ? 'outline' : 'solid',
              color: 'primary',
              size: 'sm',
              onClick: () => props.onFollow?.(!props.following),
              'data-mol-id': `${dataMolId}-follow`,
              'aria-pressed': props.following,
            },
            () => [followLabel],
          )
        : null

      if (props.layout === 'full') {
        return h(Card, { 'data-mol-id': dataMolId, className: props.className }, () => [
          h('div', { class: cm.flex({ align: 'start', gap: 'md' }) }, [
            h('div', { class: cm.shrink0 }, [
              h(Avatar, {
                src: author.avatar,
                alt: author.name,
                name: author.name,
                size: 'lg',
              }),
            ]),
            h('div', { class: cm.cn(cm.flex1, cm.stack(2 as const)) }, [
              h('header', { class: cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' }) }, [
                nameElement,
              ]),
              ...(author.bio
                ? [
                    h(
                      'p',
                      { 'data-mol-id': `${dataMolId}-bio`, class: cm.textSize('sm') },
                      author.bio,
                    ),
                  ]
                : []),
              h(
                'div',
                {
                  class: cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
                },
                [
                  ...(socialRow ? [socialRow] : [h('span')]),
                  ...(followButton ? [followButton] : []),
                ],
              ),
            ]),
          ]),
        ])
      }

      return h(Card, { 'data-mol-id': dataMolId, className: props.className }, () => [
        h('div', { class: cm.flex({ align: 'center', gap: 'md' }) }, [
          h('div', { class: cm.shrink0 }, [
            h(Avatar, {
              src: author.avatar,
              alt: author.name,
              name: author.name,
              size: 'md',
            }),
          ]),
          h('div', { class: cm.cn(cm.flex1, cm.stack(1 as const)) }, [
            h('div', { class: cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' }) }, [
              nameElement,
            ]),
            ...(author.bio
              ? [
                  h(
                    'p',
                    { 'data-mol-id': `${dataMolId}-bio`, class: cm.textSize('sm') },
                    author.bio,
                  ),
                ]
              : []),
            ...(socialRow ? [socialRow] : []),
          ]),
          ...(followButton ? [h('div', { class: cm.shrink0 }, [followButton])] : []),
        ]),
      ])
    }
  },
})
