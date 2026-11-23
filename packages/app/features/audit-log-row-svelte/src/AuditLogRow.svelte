<!--
  AuditLogRow: the Svelte counterpart of `@molecule/app-audit-log-row-react`'s
  `AuditLogRow` — one audit / activity / event-log row: `[actor] [action]
  [target] · [timestamp]` with an optional `[old → new]` diff line and
  environment / trace metadata. Same props, same DOM for the same input. With
  `onClick` the row is a focusable button in the a11y tree and Enter / Space
  activate it, matching native button keyboard semantics.

  The template's whitespace is deliberate: Svelte keeps a collapsed single
  space for whitespace between inline siblings (React's JSX strips it), so
  every line break lives inside a tag or a block, and the single spaces React
  renders between the spans are glued `&#32;` texts (an entity survives the
  compiler's whitespace collapsing where a literal space would not).

  Text runs are deliberate too: React serializes `· 10:30` and `[prod]` as one
  continuous text run, and a run split by an expression marker renders at a
  slightly different sub-pixel width (lost kerning). So a plain-text timestamp
  or environment is interpolated as one string, and only a node value splits
  into `· ` / `[` … `]` around the rendered node — exactly React's shape.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { AuditLogRowProps } from './types.js'

  let { entry, onClick, className }: AuditLogRowProps = $props()

  const cm = $derived(getClassMap())
  const clickable = $derived(typeof onClick === 'function')
  const showDelta = $derived(entry.oldValue !== undefined || entry.newValue !== undefined)
  const actorClass = $derived(cm.fontWeight('semibold'))
  const targetClass = $derived(cm.fontWeight('medium'))
  const timeClass = $derived(cm.cn(cm.sp('ml', 2), cm.textSize('xs')))
  const envClass = $derived(cm.cn(cm.sp('ml', 2), cm.textSize('xs'), cm.fontWeight('semibold')))
  const deltaClass = $derived(cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs')))

  /**
   * Whether an entry field is plain text: React renders strings and numbers as
   * one inline text run, and only a node value is rendered as an element.
   *
   * @param value - The entry field.
   * @returns True when the field renders as text.
   */
  function isText(value: Snippet | string | number): value is string | number {
    return typeof value === 'string' || typeof value === 'number'
  }

  // When the row is interactive, Enter / Space activate it (React's
  // `handleKeyDown`): preventDefault, then the click handler with no event.

  /**
   * Keydown handler for the interactive row (React's `handleKeyDown`).
   *
   * @param event - The keydown.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
</script>

{#snippet field(value: Snippet | string | number)}
  {#if typeof value === 'function'}{@render value?.()}{:else}{value ?? ''}{/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class={cm.cn(
    cm.flex({ align: 'start', gap: 'sm' }),
    cm.sp('py', 2),
    clickable ? cm.cursorPointer : undefined,
    className,
  )}
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
  data-mol-id="audit-log-row"
  onclick={onClick}
  onkeydown={handleKeyDown}
>
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <div class={cm.cn(cm.textSize('sm'))}>
      <span class={actorClass}>{@render field(entry.actor)}</span>&#32;<span
        >{@render field(entry.action)}</span
      >&#32;{#if entry.target}<span class={targetClass}>{@render field(entry.target)}</span
        >{/if}<span class={timeClass}
        >{#if isText(entry.timestamp)}{`· ${entry.timestamp}`}{:else}· {@render field(
            entry.timestamp,
          )}{/if}</span
      >{#if entry.environment}<span class={envClass}
          >{#if isText(entry.environment)}{`[${entry.environment}]`}{:else}[{@render field(
              entry.environment,
            )}]{/if}</span
        >{/if}
    </div>
    {#if showDelta}
      <div class={deltaClass}>
        {#if entry.oldValue !== undefined}<span
            use:reactStyle={{ textDecoration: 'line-through', opacity: 0.7 }}
            >{@render field(entry.oldValue)}</span
          >{/if}{#if entry.oldValue !== undefined && entry.newValue !== undefined}<span
            aria-hidden="true">→</span
          >{/if}{#if entry.newValue !== undefined}<span>{@render field(entry.newValue)}</span>{/if}
      </div>
    {/if}
    {#if entry.traceId}<span class={cm.textSize('xs')}>{@render field(entry.traceId)}</span>{/if}
  </div>
</div>
