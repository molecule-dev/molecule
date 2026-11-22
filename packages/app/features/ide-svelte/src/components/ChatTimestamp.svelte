<!--
  ChatTimestamp: the Svelte counterpart of `@molecule/app-ide-react`'s
  `ChatTimestamp` — the one timestamp treatment for every chat timeline item
  (user and team message headers, Synthase replies, event cards). A small
  muted relative time ("5 minutes ago") that advances with the shared minute
  clock, whose tooltip carries the exact date and time. Same props (React
  names), same DOM for the same input. Presentational only: WHETHER an item
  shows its time is decided once for the whole timeline by
  `planChatTimestamps`. See the React file for the design notes.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express, written the way the DOM takes them here (the pixel
  values spell their `px`, which Svelte does not add for React).
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/props.ts). */
  export type ChatTimestampProps = types.ChatTimestampProps
</script>

<script lang="ts">
  import { formatChatFullTime, formatChatRelativeTime } from '@molecule/app-ide-panel-logic'
  import { useLocale } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Tooltip } from '@molecule/app-ui-svelte'

  import { useMinuteNow } from '../hooks/useChatTimestampsVisible.js'

  let { timestamp, variant = 'inline', align = 'left' }: ChatTimestampProps = $props()

  const cm = getClassMap()
  const minuteNow = useMinuteNow()
  // Re-renders on a locale switch, so the label and its tooltip change language at once.
  const locale = useLocale()
</script>

{#if Number.isFinite(timestamp)}
  {#if variant === 'inline'}
    <Tooltip content={formatChatFullTime(timestamp, $locale)} placement="top">
      <time
        datetime={new Date(timestamp).toISOString()}
        class={cm.textMuted}
        style="cursor: default; font-size: 11px; white-space: nowrap"
        data-mol-id="chat-timestamp"
      >
        {formatChatRelativeTime(timestamp, Math.max($minuteNow, timestamp), $locale)}
      </time>
    </Tooltip>
  {:else}
    <div
      style="display: flex; justify-content: {align === 'center'
        ? 'center'
        : 'flex-start'}; line-height: 1.3; margin-bottom: 2px"
    >
      <Tooltip content={formatChatFullTime(timestamp, $locale)} placement="top">
        <time
          datetime={new Date(timestamp).toISOString()}
          class={cm.textMuted}
          style="cursor: default; font-size: 11px; white-space: nowrap"
          data-mol-id="chat-timestamp"
        >
          {formatChatRelativeTime(timestamp, Math.max($minuteNow, timestamp), $locale)}
        </time>
      </Tooltip>
    </div>
  {/if}
{/if}
