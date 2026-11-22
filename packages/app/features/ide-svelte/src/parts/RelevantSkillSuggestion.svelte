<!--
  Proactive "Relevant skill" suggestion.

  Svelte counterpart of `@molecule/app-ide-react`'s `RelevantSkillSuggestion`
  (see that file for the design notes): the same props (React names), the same
  DOM for the same input, the same callbacks. It shows the SINGLE best matching
  project skill just above the chat composer, with a one-click **Load**, a
  clickable monospace skill name (when `onOpen` is wired) and a dismiss control.
  The skill's description surfaces through the framework's REAL styled
  `Tooltip` (instant, theme-aware, focus/hover-aware) — never the delayed,
  touch-blind native `title` — and the label carries a second Tooltip explaining
  the keyword match. The leading glyph is a real SVG from the bonded icon set,
  and the tint comes from ClassMap/theme tokens, never a hardcoded color.

  The component is a part (React renders it inside ChatPanel without exporting
  it), so it lives in `src/parts/`.

  All styling is inline, written the way the DOM takes it here (the pixel
  values spell their `px`, which Svelte does not add for React).
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type RelevantSkillSuggestionProps = types.RelevantSkillSuggestionProps

  /**
   * The skill name's inline style: monospace, one line, ellipsis when it
   * overflows.
   */
  const NAME_STYLE =
    'flex: 1 1 0%; min-width: 0px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--mol-font-mono, monospace); font-size: 0.95em'

  /**
   * The skill name's style when it is a button: the same text treatment plus a
   * button reset and the theme primary color (React spreads `nameStyle` and
   * then adds these). `background: none` is applied through a `style:`
   * directive instead of this text: jsdom's CSS shorthand parser drops that
   * declaration from a style ATTRIBUTE, while a property write keeps it the way
   * React's style object does.
   */
  const NAME_BUTTON_STYLE =
    'flex: 1 1 0%; min-width: 0px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--mol-font-mono, monospace); font-size: 0.95em; border: none; padding: 0px; cursor: pointer; color: var(--mol-color-primary, #6366f1)'

  /** The leading glyph's inline style: the theme primary, slightly softened. */
  const ICON_STYLE = 'color: var(--mol-color-primary, #6366f1); opacity: 0.9'

  /** The label's inline style: the help cursor + dotted underline hint. */
  const LABEL_STYLE =
    'flex-shrink: 0; cursor: help; text-decoration: underline dotted; text-underline-offset: 2px; text-decoration-color: color-mix(in srgb, currentcolor 40%, transparent)'

  /**
   * The dismiss mark's inline style: the IDE's shared icon-only ✕ dismiss (18px
   * box, 4px radius, 0.6 resting opacity) — mol-bespoke-button, identical to
   * the TipCard dismiss it stacks with.
   */
  const DISMISS_STYLE =
    'display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; border: none; color: inherit; cursor: pointer; opacity: 0.6; transition: opacity 100ms, background 100ms; background: transparent'

  /**
   * Brightens the dismiss mark while the pointer is over it (React's
   * `onMouseEnter`).
   *
   * @param event - The native mouse event.
   */
  function onmouseenter(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '1'
    ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.2)'
  }

  /**
   * Restores the dismiss mark's resting opacity when the pointer leaves
   * (React's `onMouseLeave`).
   *
   * @param event - The native mouse event.
   */
  function onmouseleave(event: MouseEvent): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.6'
    ;(event.currentTarget as HTMLElement).style.background = 'transparent'
  }
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import Icon from '../components/Icon.svelte'
  let { skill, onLoad, onOpen, onDismiss }: RelevantSkillSuggestionProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  // React computes these once per render from the props; Svelte derives them so
  // the same values stay current across prop changes.
  const openHint = $derived(
    t('ide.chat.skills.loadTitle', undefined, { defaultValue: 'Open in the editor' }),
  )
  const tooltip = $derived(skill.description || openHint)
  const matchHint = $derived(
    t('ide.chat.skills.matchHint', undefined, {
      defaultValue: 'Suggested from keywords in your recent messages',
    }),
  )
</script>

<div
  data-mol-id="relevant-skill-suggestion"
  class={cm.cn(cm.textSize('xs'))}
  style="display: flex; align-items: center; gap: 8px; margin: 6px 10px 0px; padding: 5px 8px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--mol-color-primary, #6366f1) 26%, transparent); background: color-mix(in srgb, var(--mol-color-primary, #6366f1) 7%, transparent)"
>
  <Tooltip content={tooltip} placement="top">
    <Icon
      name="lightbulb"
      size={18}
      data-mol-id="relevant-skill-icon"
      aria-hidden="true"
      style={ICON_STYLE}
    />
  </Tooltip>

  <Tooltip content={matchHint} placement="top">
    <span class={cm.textMuted} data-mol-id="relevant-skill-label" style={LABEL_STYLE}>
      {t('ide.chat.skills.relevant.label', undefined, { defaultValue: 'Relevant skill' })}
    </span>
  </Tooltip>

  {#if onOpen}
    <button
      type="button"
      data-mol-id="relevant-skill-name"
      onclick={() => onOpen?.(skill)}
      class={cm.touchTargetCompact}
      style={NAME_BUTTON_STYLE}
      style:background="none"
    >
      {skill.name}
    </button>
  {:else}
    <span data-mol-id="relevant-skill-name" style={NAME_STYLE}>
      {skill.name}
    </span>
  {/if}

  <button
    type="button"
    data-mol-id="relevant-skill-load"
    onclick={() => onLoad(skill)}
    class={cm.cn(
      cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      cm.touchTargetCompact,
      cm.shrink0,
    )}
  >
    {t('ide.chat.skills.load', undefined, { defaultValue: 'Load' })}
  </button>

  <button
    type="button"
    data-mol-id="relevant-skill-dismiss"
    onclick={() => onDismiss(skill)}
    aria-label={t('ide.chat.skills.relevant.dismiss', undefined, {
      defaultValue: 'Dismiss suggestion',
    })}
    class={cm.cn(cm.touchTargetCompact, cm.shrink0)}
    style={DISMISS_STYLE}
    {onmouseenter}
    {onmouseleave}
  >
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
      ></path>
    </svg>
  </button>
</div>
