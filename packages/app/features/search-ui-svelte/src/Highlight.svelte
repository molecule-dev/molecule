<!--
  Highlight: the Svelte counterpart of `@molecule/app-search-ui-react`'s
  `Highlight` — text with the matched terms marked, each term marked where it
  starts a word, case-insensitively, through the ClassMap's `resultMark`.
-->
<script lang="ts">
  import { highlightMatches } from '@molecule/app-client-search'
  import { getClassMap } from '@molecule/app-ui'

  import type { HighlightProps } from './types.js'

  let { text, terms }: HighlightProps = $props()

  const cm = $derived(getClassMap())
  const segments = $derived(highlightMatches(text, terms))
</script>

{#each segments as seg, i (i)}{#if seg.hit}<mark class={cm.resultMark}>{seg.text}</mark
    >{:else}{seg.text}{/if}{/each}
