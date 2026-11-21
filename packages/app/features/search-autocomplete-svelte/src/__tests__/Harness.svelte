<!--
  A controlled harness for the stale-response race tests: typing changes
  `value`, so the debounced `onSearch` effect fires for each query.
-->
<script lang="ts">
  import SearchAutocomplete from '../SearchAutocomplete.svelte'
  import type { SuggestionItem } from '../types.js'

  let { onSearch }: { onSearch: (query: string) => Promise<SuggestionItem[]> | SuggestionItem[] } =
    $props()

  let value = $state('')
</script>

<SearchAutocomplete
  {value}
  onChange={(next) => (value = next)}
  {onSearch}
  onSelect={() => {}}
  debounceMs={0}
  minChars={1}
/>
