<!--
  Test host for the Switch first-click scenarios: the caller's `onChange` and
  `onClick` live in readable stores the test swaps (Svelte's idiom for the
  React test's `setOnChange` re-render through a new element).
-->
<script lang="ts">
  import type { Readable } from 'svelte/store'

  import Switch from '../components/Switch.svelte'

  let {
    checked,
    onChange,
    onClick,
  }: {
    checked: Readable<boolean>
    onChange: Readable<(event: Event) => void>
    onClick?: Readable<(event: MouseEvent) => void>
  } = $props()
</script>

<Switch checked={$checked} onChange={$onChange} onClick={onClick ? $onClick : undefined} />
