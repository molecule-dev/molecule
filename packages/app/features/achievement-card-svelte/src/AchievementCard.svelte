<!--
  AchievementCard: the Svelte counterpart of
  `@molecule/app-achievement-card-react`'s `AchievementCard` — same props, same
  ClassMap tokens, same DOM. Node props (`name`, `description`, `icon`,
  `earnedAt`, `tier`) are snippets, or plain strings.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { AchievementCardProps } from './types.js'

  let {
    name,
    description,
    icon,
    earned = false,
    earnedAt,
    earnedLabel,
    lockedLabel,
    progress,
    tier,
    className,
  }: AchievementCardProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const earnedText = $derived(
    earnedLabel ?? t('achievementCard.earned', undefined, { defaultValue: 'Earned' }),
  )
  const lockedText = $derived(
    lockedLabel ?? t('achievementCard.locked', undefined, { defaultValue: 'Locked' }),
  )
  const progressWidth = $derived(
    progress ? `${Math.min(100, (progress.value / progress.max) * 100)}%` : undefined,
  )
  // React's `{ opacity: 0.5, filter: 'grayscale(0.6)' }`.
  const cardStyle = $derived(earned ? undefined : { opacity: 0.5, filter: 'grayscale(0.6)' })
</script>

<Card {className} style={cardStyle}>
  <div class={cm.flex({ align: 'start', gap: 'md' })}>
    <div class={cm.shrink0} style="font-size: 36px">
      {#if typeof icon === 'function'}{@render icon?.()}{:else if icon}{icon}{/if}
    </div>
    <div class={cm.cn(cm.flex1, cm.stack(1))}>
      <header class={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
          {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
        </h3>
        {#if tier}
          <PresentWhileContent
            tag="span"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          >
            {#if typeof tier === 'function'}{@render tier?.()}{:else}{tier}{/if}
          </PresentWhileContent>
        {/if}
      </header>
      {#if description}
        <PresentWhileContent tag="p" class={cm.textSize('sm')}>
          {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
        </PresentWhileContent>
      {/if}
      {#if earned}
        {#if earnedAt}
          <span class={cm.textSize('xs')}>
            {earnedText}
            {#if typeof earnedAt === 'function'}{@render earnedAt?.()}{:else}{earnedAt}{/if}
          </span>
        {/if}
      {:else if progress}
        <div class={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
          <div
            class={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
            style="width: {progressWidth}"
          ></div>
        </div>
      {:else}
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{lockedText}</span>
      {/if}
    </div>
  </div>
</Card>
