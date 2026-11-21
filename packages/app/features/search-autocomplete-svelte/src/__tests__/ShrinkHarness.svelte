<!--
  A harness for the shrinking-list case: it renders the React suite's three-row
  fixture, and `shrinkTo()` (exposed to the test through Svelte's instance
  exports) cuts the list down past the keyboard highlight.
-->
<script lang="ts">
  import SearchAutocomplete from '../SearchAutocomplete.svelte'
  import type { SuggestionItem } from '../types.js'

  let { onSelect }: { onSelect: (item: SuggestionItem) => void } = $props()

  /** The React suite's static suggestion fixture, held here so it can shrink. */
  let suggestions = $state<SuggestionItem[]>([
    { id: '1', label: 'One' },
    { id: '2', label: 'Two' },
    { id: '3', label: 'Three' },
  ])

  /**
   * Shrinks the suggestion list to its first `count` rows.
   * @param count - How many rows remain.
   */
  export function shrinkTo(count: number): void {
    suggestions = suggestions.slice(0, count)
  }
</script>

<SearchAutocomplete value="o" {suggestions} onChange={() => {}} {onSelect} />
