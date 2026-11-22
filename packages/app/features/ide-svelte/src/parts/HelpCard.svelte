<!--
  `/help` card — a concise, high-level guide rendered as an in-timeline card.

  Svelte counterpart of `@molecule/app-ide-react`'s `HelpCard` (see that file
  for the design notes): the same props (React names), the same DOM for the
  same input, the same callbacks. The card covers the intro paragraph, the
  three conversation modes and the efficiency tips, generated from the SAME
  `HELP_INTRO` / `HELP_MODES` / `HELP_SHORTCUTS` / `HELP_TIPS` constants the
  plain-text fallback reads, plus the host-supplied upgrade blurb (the shared
  IDE owns no pricing copy). The component is a part (React renders it inside
  the chat timeline without exporting it), so it lives in `src/parts/`.

  Styling uses `getClassMap()` (`cm.*`) for structure/typography; the only
  inline styles are layout/spacing the ClassMap can't express, written the way
  the DOM takes them here (`chatCardStyle()`'s unitless radius spelled with
  `px`, and padded shorthands in their `px`-normalized form). All
  user-facing text goes through `t()`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type HelpCardProps = types.HelpCardProps
</script>

<script lang="ts">
  import type { ChatEventCardAction } from '@molecule/app-ide-panel-logic'
  import { chatCardStyle } from '@molecule/app-ide-panel-logic'
  import {
    HELP_INTRO,
    HELP_MODES,
    HELP_SHORTCUTS,
    HELP_TIPS,
  } from '@molecule/app-ide-panel-logic/panels'
  import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import Icon from '../components/Icon.svelte'
  import { isAllowedLinkHref } from './MarkdownContent.svelte'

  let {
    isLight,
    agentName = DEFAULT_AGENT_NAME,
    productName = DEFAULT_PRODUCT_NAME,
    upgradeLines,
    upgradeAction,
  }: HelpCardProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  /** The upgrade rule's colour for the active theme. */
  const rowBorder = $derived(isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)')

  /** The section headings' class list. */
  const sectionHeading = $derived(cm.cn(cm.fontWeight('medium'), cm.textSize('sm')))

  /** The upgrade CTA's class list — the same anchor and button treatment. */
  const ctaClass = $derived(
    cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact),
  )

  /** The blurb's actions, one or many, as React normalizes them. */
  const upgradeActions = $derived<ChatEventCardAction[]>(
    upgradeAction ? (Array.isArray(upgradeAction) ? upgradeAction : [upgradeAction]) : [],
  )

  /** The card container's inline style: the shared chat-card chrome + the timeline rhythm. */
  const rootStyle = $derived.by(() => {
    const { padding, borderRadius, border, background } = chatCardStyle()
    // `borderRadius` is React's unitless-number convention; a style text needs its `px`.
    return `padding: ${padding}; border-radius: ${borderRadius}px; border: ${border}; background: ${background}; margin-bottom: 16px`
  })
</script>

<div data-mol-id="help-card" class={cm.textSize('xs')} style={rootStyle}>
  <div class={sectionHeading} style="margin-bottom: 4px">
    {t('ide.chat.help.card.heading', undefined, { defaultValue: 'Help' })}
  </div>
  <div class={cm.textMuted} style="line-height: 1.4; margin-bottom: 4px">
    {t(HELP_INTRO.key, { agentName, productName }, { defaultValue: HELP_INTRO.defaultValue })}
  </div>

  <div class={sectionHeading} style="margin-top: 12px; margin-bottom: 4px">
    {t('ide.chat.help.card.modesTitle', undefined, { defaultValue: 'Modes' })}
  </div>
  <div data-mol-id="help-modes">
    {#each HELP_MODES as helpMode (helpMode.id)}
      <div
        data-mol-id={`help-mode-${helpMode.id}`}
        style="display: flex; align-items: flex-start; gap: 8px; padding: 3px 0px"
      >
        <Icon
          name={helpMode.icon}
          size={14}
          aria-hidden="true"
          data-mol-id={`help-mode-icon-${helpMode.id}`}
          className={cm.textMuted}
          style="flex-shrink: 0; margin-top: 2px; opacity: 0.8"
        />
        <span class={cm.textMuted} style="flex: 1 1 0%; line-height: 1.4">
          {t(helpMode.key, { agentName }, { defaultValue: helpMode.defaultValue })}
        </span>
      </div>
    {/each}
  </div>

  <div class={sectionHeading} style="margin-top: 12px; margin-bottom: 4px">
    {t('ide.chat.help.card.tipsTitle', undefined, { defaultValue: 'Tips' })}
  </div>
  <div data-mol-id="help-tips">
    {#each HELP_TIPS as tip (tip.id)}
      <div
        data-mol-id={`help-tip-${tip.id}`}
        class={cm.textMuted}
        style="padding: 2px 0px; line-height: 1.4"
      >
        {t(tip.key, { agentName }, { defaultValue: tip.defaultValue })}
      </div>
    {/each}
    <div class={cm.textMuted} style="margin-top: 6px; line-height: 1.4">
      {t(HELP_SHORTCUTS.key, undefined, { defaultValue: HELP_SHORTCUTS.defaultValue })}
    </div>
  </div>

  {#if upgradeLines && upgradeLines.length > 0}
    <div
      data-mol-id="help-upgrade"
      class={cm.borderT}
      style="margin-top: 10px; padding-top: 8px; border-color: {rowBorder}"
    >
      {#each upgradeLines as line, i (i)}
        <div class={cm.textMuted} style="line-height: 1.4">
          {line}
        </div>
      {/each}
      {#if upgradeActions.length > 0}
        <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap">
          {#each upgradeActions as act, i (i)}
            {#if act.href}
              {#if isAllowedLinkHref(act.href)}
                <a
                  data-mol-id="help-upgrade-action"
                  href={act.href}
                  target={act.href.startsWith('http') ? '_blank' : undefined}
                  rel={act.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  class={ctaClass}
                >
                  {act.label}
                </a>
              {:else}
                <span data-mol-id="help-upgrade-action">{act.label}</span>
              {/if}
            {:else}
              <button
                type="button"
                data-mol-id="help-upgrade-action"
                onclick={act.onClick}
                class={ctaClass}
              >
                {act.label}
              </button>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
