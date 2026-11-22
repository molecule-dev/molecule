<!--
  A user message's body, clipped at the shared collapse height behind a gradient
  and a full-width chevron disclosure strip when the text is taller than the clip.

  Svelte counterpart of `@molecule/app-ide-react`'s `CollapsibleUserMessage`: the
  same props (React names: `content`, `isLight`), the same DOM for the same input,
  the same interactions. The strip names itself with `aria-label` (its chevron is
  its only content) and reports its state with `aria-expanded`; hovering it tints
  it, and clicking it expands the body to its full height and back.

  The component is a part (React renders it inside `MessageItem` without exporting
  it), so it lives in `src/parts/` and is exported from `src/parts.ts`.

  Inline styles are the ones React writes, with every length written as a `px`
  string (Svelte does not add the unit React adds for a number).
-->
<script lang="ts">
  import { USER_MSG_COLLAPSE_HEIGHT } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'

  let { content, isLight }: { content: string; isLight: boolean } = $props()

  const { t } = useTranslation()

  let bodyEl = $state<HTMLDivElement | null>(null)
  let overflows = $state(false)
  let expanded = $state(false)

  const collapsibleStyle = $derived(
    `max-height: ${expanded ? 'none' : `${USER_MSG_COLLAPSE_HEIGHT}px`}; overflow: hidden; white-space: pre-wrap`,
  )
  const stripLabel = $derived(
    expanded
      ? t('ide.chat.collapseMessage', undefined, { defaultValue: 'Show less' })
      : t('ide.chat.expandMessage', undefined, { defaultValue: 'Show more' }),
  )

  // React's `useEffect([content])`: measure after render and whenever the text
  // changes.
  $effect(() => {
    void content
    const el = bodyEl
    if (el) overflows = el.scrollHeight > USER_MSG_COLLAPSE_HEIGHT
  })
</script>

<div style="position: relative">
  <div bind:this={bodyEl} style={collapsibleStyle}>{content}</div>
  {#if overflows && !expanded}
    <div
      style="position: absolute; bottom: 0px; left: 0px; right: 0px; height: 40px; background: {isLight
        ? 'linear-gradient(transparent, var(--mol-color-surface-secondary, #f5f5f5))'
        : 'linear-gradient(transparent, var(--mol-color-surface-secondary, #1e1e1e))'}; pointer-events: none"
    ></div>
  {/if}
  {#if overflows}
    <button
      type="button"
      aria-label={stripLabel}
      aria-expanded={expanded}
      onclick={() => {
        expanded = !expanded
      }}
      onmouseenter={(event) => {
        event.currentTarget.style.background = isLight
          ? 'rgba(99,102,241,0.12)'
          : 'rgba(99,102,241,0.18)'
      }}
      onmouseleave={(event) => {
        event.currentTarget.style.background = 'transparent'
      }}
      style="display: flex; align-items: center; justify-content: center; width: 100%; padding: 2px 0; margin: 2px 0 0; background: transparent; border: none; border-radius: 0 0 4px 4px; cursor: pointer; color: inherit; transition: background 100ms"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        style="display: block; opacity: 0.5; transform: {expanded
          ? 'rotate(180deg)'
          : 'rotate(0deg)'}; transition: transform 150ms"
      >
        <polyline
          points="4,6 8,10 12,6"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
  {/if}
</div>
