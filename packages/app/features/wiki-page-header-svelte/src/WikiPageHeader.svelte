<!--
  WikiPageHeader: the Svelte counterpart of
  `@molecule/app-wiki-page-header-react`'s `WikiPageHeader` — breadcrumb +
  title + meta row (version, updated time/by, tags) + Edit/History action
  buttons. Same props, same DOM for the same input; the node props are
  snippets (or plain strings).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { WikiPageHeaderProps } from './types.js'

  let {
    title,
    breadcrumb,
    version,
    updatedAt,
    updatedBy,
    tags,
    onEdit,
    onHistory,
    extraActions,
    className,
  }: WikiPageHeaderProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
</script>

<header class={cm.cn(cm.stack(2), className)}>
  {#if typeof breadcrumb === 'function'}{@render breadcrumb?.()}{:else if breadcrumb}{breadcrumb}{/if}
  <div class={cm.flex({ justify: 'between', align: 'start', gap: 'md', wrap: 'wrap' })}>
    <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))}>
      {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
    </h1>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if onEdit}
        <Button variant="ghost" size="sm" onClick={onEdit}>
          {t('wiki.edit', {}, { defaultValue: 'Edit' })}
        </Button>
      {/if}
      {#if onHistory}
        <Button variant="ghost" size="sm" onClick={onHistory}>
          {t('wiki.history', {}, { defaultValue: 'History' })}
        </Button>
      {/if}
      {#if typeof extraActions === 'function'}{@render extraActions?.()}{:else if extraActions}{extraActions}{/if}
    </div>
  </div>
  <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
    {#if version}
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
        {#if typeof version === 'function'}{@render version?.()}{:else}{version}{/if}
      </span>
    {/if}
    {#if updatedAt}
      <span class={cm.textSize('xs')}>
        {t('wiki.updatedAt', {}, { defaultValue: 'Updated' })}
        {#if typeof updatedAt === 'function'}{@render updatedAt?.()}{:else}{updatedAt}{/if}
      </span>
    {/if}
    {#if updatedBy}
      <span class={cm.textSize('xs')}
        >· {#if typeof updatedBy === 'function'}{@render updatedBy?.()}{:else}{updatedBy}{/if}</span
      >
    {/if}
    {#if tags}
      <span class={cm.flex({ align: 'center', gap: 'xs' })}>
        {#if typeof tags === 'function'}{@render tags?.()}{:else}{tags}{/if}
      </span>
    {/if}
  </div>
</header>
