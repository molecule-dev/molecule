<!--
  The collapsible AI thinking/reasoning block.

  Svelte counterpart of `@molecule/app-ide-react`'s `ThinkingBlock` (see that
  file for the design notes): the same props (React names), the same DOM for
  the same input, the same behaviour. It auto-expands while the reply streams
  so the reader sees thinking in real time; once streaming ends the reader's
  manual toggle takes over. Both the label and the scroll follow React: while
  streaming it says "Thinking", otherwise it names the duration (or "Thought
  briefly" when none is known), and the open content scrolls to its bottom as
  new thinking arrives.

  Static inline styles are written exactly as React's CSSOM serializes them
  (`border: medium` is React's `border: none`, `padding: 2px 0px` its `2px 0`);
  the one dynamic style (the chevron's rotation) is a `px` string, as
  `TestsCard.svelte` writes them. All user-facing text goes through `t()`.

  The component is a part (React renders it inside ChatPanel without exporting
  it), so it lives in `src/parts/`.
-->
<script module lang="ts">
  /** Props for `ThinkingBlock` — the React prop names. */
  export interface ThinkingBlockProps {
    /** The reasoning text, streamed in as it arrives. */
    content: string
    /** How long the thinking took, when the turn finished and reported it. */
    durationMs?: number
    /** Whether this block's reply is still streaming (auto-expands while true). */
    isStreaming?: boolean
  }
</script>

<script lang="ts">
  import { formatThinkingDuration } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  let { content, durationMs, isStreaming }: ThinkingBlockProps = $props()

  const { t } = useTranslation()
  const cm = getClassMap()

  // Auto-expanded while streaming; `null` until the reader toggles it, after
  // which their choice takes over (React's `manualToggle`).
  let manualToggle = $state<boolean | null>(null)
  const open = $derived(manualToggle ?? isStreaming === true)

  let contentEl = $state<HTMLDivElement | null>(null)

  const label = $derived(
    isStreaming
      ? t('ide.chat.thinking', undefined, { defaultValue: 'Thinking' })
      : durationMs != null
        ? formatThinkingDuration(t, durationMs)
        : t('ide.chat.thoughtBriefly', undefined, { defaultValue: 'Thought briefly' }),
  )

  // React's `useEffect([open, content])`: scroll the open block to its bottom
  // as new thinking streams in. Both dependencies are read so it re-runs on
  // each, and on a mount (the ref is bound before effects run).
  $effect(() => {
    void content
    void contentEl
    if (open && contentEl) contentEl.scrollTop = contentEl.scrollHeight
  })

  /**
   * Flips the reader's manual disclosure, seeded from the streaming default
   * the first time — React's `setManualToggle((v) => !(v ?? isStreaming))`.
   */
  function toggle(): void {
    manualToggle = !(manualToggle ?? isStreaming === true)
  }
</script>

<div style="margin-bottom: 6px">
  <button
    type="button"
    onclick={toggle}
    style="display: inline-flex; align-items: center; gap: 4px; background: none; border: medium; cursor: pointer; color: inherit; padding: 2px 0px"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      width="12"
      height="12"
      style="display: block; flex-shrink: 0; opacity: 0.5; transform: {open
        ? 'rotate(90deg)'
        : 'rotate(0deg)'}; transition: transform 150ms"
    >
      <polyline
        points="6,4 10,8 6,12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      ></polyline>
    </svg>
    <span class={cm.cn(cm.textMuted, cm.textSize('xs'))}>{label}</span>
  </button>
  {#if open}
    <div
      bind:this={contentEl}
      class={cm.cn(cm.textMuted, cm.textSize('xs'))}
      style="padding-left: 16px; margin-top: 4px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; font-style: italic; opacity: 0.7"
    >
      {content}
    </div>
  {/if}
</div>
