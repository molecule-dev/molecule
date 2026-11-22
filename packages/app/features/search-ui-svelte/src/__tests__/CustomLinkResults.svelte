<!--
  Test host: SearchResults with a custom renderLink written in markup, as a
  consumer writes it, rendering the row body the link is handed.
-->
<script lang="ts" generics="T extends ClientSearchDocument">
  import type { ClientSearchDocument } from '@molecule/app-client-search'

  import SearchResults from '../SearchResults.svelte'
  import type { SearchResultLinkProps, SearchResultsProps } from '../types.js'

  let props: Omit<SearchResultsProps<T>, 'renderLink'> = $props()
</script>

{#snippet renderLink(p: SearchResultLinkProps)}
  <span data-custom={p.href}>{@render p.children()}</span>
{/snippet}

<SearchResults {...props} {renderLink} />
