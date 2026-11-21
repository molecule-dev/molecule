<!--
  A controlled harness for the per-query reset tests: typing changes `value`,
  so the debounced `onSearch` effect fires for each query, and `minChars` is
  passed through as the React suite's harness does.
-->
<script lang="ts">
  import SearchAutocomplete from '../SearchAutocomplete.svelte'
  import type { SuggestionItem } from '../types.js'

  let {
    onSearch,
    minChars = 1,
  }: {
    onSearch: (query: string) => Promise<SuggestionItem[]> | SuggestionItem[]
    minChars?: number
  } = $props()

  let value = $state('')
</script>

<SearchAutocomplete
  {value}
  onChange={(next) => (value = next)}
  {onSearch}
  onSelect={() => {}}
  debounceMs={0}
  {minChars}
/>
