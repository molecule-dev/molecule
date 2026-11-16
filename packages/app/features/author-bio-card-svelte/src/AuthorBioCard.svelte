<!--
  AuthorBioCard: the Svelte counterpart of `@molecule/app-author-bio-card-react`'s
  `AuthorBioCard` — avatar + name + bio + social links + optional follow
  button, with the two layouts (`compact`, `full`). Same props (React names),
  same ClassMap tokens, and the same DOM for the same input. All UI text routes
  through `useTranslation()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar, Button, Card } from '@molecule/app-ui-svelte'

  import type { AuthorBioCardProps } from './props.js'
  import { resolveSocialHref } from './social.js'

  const SOCIAL_KEYS = ['twitter', 'github', 'linkedin', 'mastodon', 'website'] as const

  type SocialKey = (typeof SOCIAL_KEYS)[number]

  let {
    author,
    layout = 'compact',
    following = false,
    onFollow,
    className,
    dataMolId = 'author-bio-card',
  }: AuthorBioCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const socialEntries = $derived(
    SOCIAL_KEYS.flatMap((key) => {
      const value = author.socials?.[key]
      return value ? [[key, value] as [SocialKey, string]] : []
    }),
  )

  const followLabel = $derived(
    following
      ? t('authorBioCard.following', {}, { defaultValue: 'Following' })
      : t('authorBioCard.follow', {}, { defaultValue: 'Follow' }),
  )

  const nameClasses = $derived(cm.cn(cm.fontWeight('semibold'), cm.textSize('base')))
  const bodyCompactClasses = $derived(cm.cn(cm.flex1, cm.stack(1 as const)))
  const bodyFullClasses = $derived(cm.cn(cm.flex1, cm.stack(2 as const)))
  const rowCompactClasses = $derived(cm.flex({ align: 'center', gap: 'md' }))
  const rowFullClasses = $derived(cm.flex({ align: 'start', gap: 'md' }))
  const baselineClasses = $derived(cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' }))
  const betweenClasses = $derived(
    cm.flex({ align: 'center', justify: 'between', gap: 'sm', wrap: 'wrap' }),
  )
  const socialRowClasses = $derived(cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' }))
  const socialLinkClasses = $derived(cm.cn(cm.textSize('sm'), cm.fontWeight('medium')))
  const bioClasses = $derived(cm.textSize('sm'))

  /**
   * The translated accessible label of a social link. Every platform is a
   * literal key (the locale bond owns `authorBioCard.social.<platform>`).
   *
   * @param key - The social-network key.
   * @returns The link's `aria-label`.
   */
  function socialAriaLabel(key: SocialKey): string {
    switch (key) {
      case 'twitter':
        return t(
          'authorBioCard.social.twitter',
          { name: author.name },
          { defaultValue: '{{name}} on Twitter' },
        )
      case 'github':
        return t(
          'authorBioCard.social.github',
          { name: author.name },
          { defaultValue: '{{name}} on GitHub' },
        )
      case 'linkedin':
        return t(
          'authorBioCard.social.linkedin',
          { name: author.name },
          { defaultValue: '{{name}} on LinkedIn' },
        )
      case 'mastodon':
        return t(
          'authorBioCard.social.mastodon',
          { name: author.name },
          { defaultValue: '{{name}} on Mastodon' },
        )
      case 'website':
        return t(
          'authorBioCard.social.website',
          { name: author.name },
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
  function socialText(key: SocialKey): string {
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
</script>

{#if layout === 'full'}
  <Card data-mol-id={dataMolId} {className}>
    <div class={rowFullClasses}>
      <div class={cm.shrink0}>
        <Avatar src={author.avatar} alt={author.name} name={author.name} size="lg" />
      </div>
      <div class={bodyFullClasses}>
        <header class={baselineClasses}>
          {#if author.href}
            <a href={author.href} data-mol-id={`${dataMolId}-name`} class={nameClasses}>
              {author.name}
            </a>
          {:else}
            <span data-mol-id={`${dataMolId}-name`} class={nameClasses}>{author.name}</span>
          {/if}
        </header>
        {#if author.bio}
          <p data-mol-id={`${dataMolId}-bio`} class={bioClasses}>{author.bio}</p>
        {/if}
        <div class={betweenClasses}>
          {#if socialEntries.length > 0}
            <div data-mol-id={`${dataMolId}-socials`} class={socialRowClasses}>
              {#each socialEntries as [key, value] (key)}
                <a
                  href={resolveSocialHref(key, value)}
                  data-mol-id={`${dataMolId}-social-${key}`}
                  aria-label={socialAriaLabel(key)}
                  rel="noopener noreferrer"
                  target="_blank"
                  class={socialLinkClasses}>{socialText(key)}</a
                >
              {/each}
            </div>
          {:else}
            <span></span>
          {/if}
          {#if onFollow}
            <Button
              variant={following ? 'outline' : 'solid'}
              color="primary"
              size="sm"
              onClick={() => onFollow?.(!following)}
              data-mol-id={`${dataMolId}-follow`}
              aria-pressed={following}>{followLabel}</Button
            >
          {/if}
        </div>
      </div>
    </div>
  </Card>
{:else}
  <Card data-mol-id={dataMolId} {className}>
    <div class={rowCompactClasses}>
      <div class={cm.shrink0}>
        <Avatar src={author.avatar} alt={author.name} name={author.name} size="md" />
      </div>
      <div class={bodyCompactClasses}>
        <div class={baselineClasses}>
          {#if author.href}
            <a href={author.href} data-mol-id={`${dataMolId}-name`} class={nameClasses}>
              {author.name}
            </a>
          {:else}
            <span data-mol-id={`${dataMolId}-name`} class={nameClasses}>{author.name}</span>
          {/if}
        </div>
        {#if author.bio}
          <p data-mol-id={`${dataMolId}-bio`} class={bioClasses}>{author.bio}</p>
        {/if}
        {#if socialEntries.length > 0}
          <div data-mol-id={`${dataMolId}-socials`} class={socialRowClasses}>
            {#each socialEntries as [key, value] (key)}
              <a
                href={resolveSocialHref(key, value)}
                data-mol-id={`${dataMolId}-social-${key}`}
                aria-label={socialAriaLabel(key)}
                rel="noopener noreferrer"
                target="_blank"
                class={socialLinkClasses}>{socialText(key)}</a
              >
            {/each}
          </div>
        {/if}
      </div>
      {#if onFollow}
        <div class={cm.shrink0}>
          <Button
            variant={following ? 'outline' : 'solid'}
            color="primary"
            size="sm"
            onClick={() => onFollow?.(!following)}
            data-mol-id={`${dataMolId}-follow`}
            aria-pressed={following}>{followLabel}</Button
          >
        </div>
      {/if}
    </div>
  </Card>
{/if}
