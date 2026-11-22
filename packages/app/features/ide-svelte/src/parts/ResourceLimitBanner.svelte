<!--
  Inline banner shown when the sandbox runs out of memory (or another usage
  limit is hit), prompting the user to upgrade. It renders through the shared
  `NoticeCard` so it has the SAME matched-weight icon + accent button row as
  every other upgrade notice — no bespoke icon, no single-link special case.

  Svelte counterpart of `@molecule/app-ide-react`'s `ResourceLimitBanner` (see
  that file for the design notes): the same props, the same DOM for the same
  input. The component is a part, so it lives in `src/parts/`.
-->
<script module lang="ts">
  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type ResourceLimitBannerProps = types.ResourceLimitBannerProps
</script>

<script lang="ts">
  import NoticeCard from './NoticeCard.svelte'

  let { message, action }: ResourceLimitBannerProps = $props()
</script>

<NoticeCard tone="upgrade" text={message} {action} />
