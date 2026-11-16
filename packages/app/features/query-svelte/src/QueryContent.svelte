<!--
  QueryContent: the Svelte counterpart of `@molecule/app-query-react`'s
  `QueryContent` — renders the children snippet only for a loaded, non-null
  document. The loaded-data branch receives a non-null document; pending,
  failed initial reads and missing records never mount that branch, so its
  actions cannot swallow an early click. Cached data remains mounted during
  refresh, including a failed refresh. Status fallbacks belong outside the
  list or record container rendered by `children`, and so does a refresh
  line; the default fallbacks render nothing. Headless: it owns no
  translations and no styling.
-->
<script lang="ts" generics="T">
  import { type Readable, readonly, writable } from 'svelte/store'

  import type { QueryState } from '@molecule/app-query'

  import type { QueryContentProps } from './types.js'

  /** The part of a query state this component renders from. */
  type QueryView = Pick<QueryState<T>, 'data' | 'status' | 'error'>

  let {
    query,
    children,
    pending = null,
    missing = null,
    error = null,
    empty,
  }: QueryContentProps<T> = $props()

  /**
   * The state as a readable store, whichever prop form arrived: the store
   * `useQuery` returned is observed as it is, and a plain state object (the
   * React prop's shape) is wrapped — so both
   * `<QueryContent query={query}>` and `query={$query}` follow the query.
   */
  const view: Readable<QueryView> = $derived(
    typeof (query as Partial<Readable<QueryView>>).subscribe === 'function'
      ? (query as Readable<QueryView>)
      : readonly(writable(query as QueryView)),
  )
</script>

{#if $view.data === undefined}
  {#if $view.status === 'error' && error}
    {@render error($view.error)}
  {:else if pending}
    {@render pending()}
  {/if}
{:else if $view.data === null}
  {#if missing}{@render missing()}{/if}
{:else if empty?.when($view.data)}
  {@render empty.render($view.data)}
{:else}
  {@render children($view.data)}
{/if}
