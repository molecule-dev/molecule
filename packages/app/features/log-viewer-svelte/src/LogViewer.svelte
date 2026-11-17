<!--
  LogViewer: the Svelte counterpart of `@molecule/app-log-viewer-react`'s
  `LogViewer` — one expandable `<details>` row per entry (timestamp + colored
  severity badge + optional service label + single-line message, expanding to a
  trace id and a JSON-formatted structured-data panel). Same props, same DOM
  for the same input. The empty state is a snippet; node-valued entry fields
  accept a snippet or plain text.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import { type ColorVariant, getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { LogLevel, LogViewerProps } from './types.js'

  let { entries, onToggle, className, emptyState }: LogViewerProps = $props()

  const cm = $derived(getClassMap())

  /** Severity badge tones: trace neutral → fatal red (themed). */
  const LEVEL_TONE: Record<LogLevel, ColorVariant> = {
    trace: 'secondary',
    debug: 'info',
    info: 'success',
    warn: 'warning',
    error: 'error',
    fatal: 'error',
  }

  /** The expanded entry ids (React's internal `openIds` state). */
  const openIds = new SvelteSet<string>()

  /**
   * Whether the entry with the given id is expanded.
   *
   * @param id - The entry id.
   * @returns True when expanded.
   */
  function isOpen(id: string): boolean {
    return openIds.has(id)
  }

  /**
   * Toggles the expanded state of the entry with the given id, then notifies
   * `onToggle` with the new state (React's `toggle`).
   *
   * @param id - The entry id.
   */
  function toggle(id: string): void {
    if (openIds.has(id)) openIds.delete(id)
    else openIds.add(id)
    onToggle?.(id, openIds.has(id))
  }

  /**
   * React's `<details onToggle>` handler: toggles only when the DOM's `open`
   * state moved away from the one this component tracks.
   *
   * @param id - The entry id.
   * @param event - The native toggle event.
   */
  function detailsToggle(id: string, event: Event): void {
    const nowOpen = (event.target as HTMLDetailsElement).open
    if (nowOpen !== openIds.has(id)) toggle(id)
  }

  /**
   * The text a structured-data panel renders: strings verbatim, anything else
   * pretty-printed with `JSON.stringify(…, null, 2)` (React's shape).
   *
   * @param data - The entry's structured data.
   * @returns The panel text.
   */
  function dataText(data: unknown): string {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  }
</script>

{#snippet field(value: Snippet | string | number)}
  {#if typeof value === 'function'}{@render value()}{:else}{value ?? ''}{/if}
{/snippet}

{#if entries.length === 0 && emptyState}
  {@render emptyState()}
{:else}
  <div class={cm.cn(cm.stack(1), className)} role="log">
    {#each entries as entry (entry.id)}
      <details open={isOpen(entry.id)} ontoggle={(event) => detailsToggle(entry.id, event)}>
        <summary
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 1),
            cm.sp('px', 2),
            cm.textSize('xs'),
            cm.cursorPointer,
          )}
        >
          <span use:reactStyle={{ width: '48px', textAlign: 'right', opacity: 0.7 }}
            >{@render field(entry.timestamp)}</span
          ><span
            class={cm.cn(cm.bgTone(LEVEL_TONE[entry.level]), cm.textOnTone)}
            use:reactStyle={{
              display: 'inline-block',
              minWidth: '48px',
              textAlign: 'center',
              padding: '0 6px',
              borderRadius: '4px',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}>{entry.level}</span
          >{#if entry.service}<span class={cm.fontWeight('semibold')}
              >{@render field(entry.service)}</span
            >{/if}<span class={cm.flex1}>{@render field(entry.message)}</span
          >{#if entry.traceId}<span use:reactStyle={{ opacity: 0.6 }}
              >{@render field(entry.traceId)}</span
            >{/if}
        </summary>
        {#if entry.data !== undefined}
          <pre
            class={cm.cn(cm.sp('p', 3), cm.textSize('xs'))}
            use:reactStyle={{ overflowX: 'auto' }}>{#if dataText(entry.data) !== ''}{dataText(
                entry.data,
              )}{/if}</pre>
        {/if}
      </details>
    {/each}
  </div>
{/if}
