<!--
  QueryContent: the Svelte counterpart of `@molecule/app-query-react`'s
  `QueryContent` — renders the children snippet only for a loaded, non-null
  document. The loaded-data branch receives a non-null document; pending,
  failed initial reads and missing records never mount that branch, so its
  actions cannot swallow an early click. Cached data remains mounted during
  refresh, including a failed refresh. Status fallbacks belong outside the
  list or record container rendered by `children`, and so does a refresh
  line; the default fallbacks render nothing. Headless: it owns no
  translations and no styling. A previous key's empty or missing document
  renders pending/error until the current key answers. Pass `recordKey` for an
  edit form: the form mounts with the current record and resets when its
  identity changes, including a switch to a record already in cache. Pass
  `getRecordId` to bind actions to the loaded document's identity: the branch
  stays pending without a nonempty ID and receives the ID as its second
  argument.
-->
<script lang="ts" generics="T">
  import type { Snippet } from 'svelte'
  import { type Readable, readonly, writable } from 'svelte/store'

  import type { QueryState } from '@molecule/app-query'

  import type { QueryContentContext, QueryContentProps } from './types.js'

  /** The part of a query state this component renders from. */
  type QueryView = Pick<QueryState<T>, 'data' | 'status' | 'error' | 'isPreviousData'>
  /**
   * The props this component takes: the read-only shape plus the optional
   * identity binder. `children` declares an optional second argument, so one
   * snippet shape serves both branches — the verified ID is passed only when
   * `getRecordId` is set. (The record-bound contract itself is
   * `QueryRecordContentProps` in `./types.js`.) The type is inline because
   * svelte2tsx exposes the component's parameter type.
   */
  let props: Omit<QueryContentProps<T>, 'children'> & {
    /** Extracts the ID from the loaded document; null, undefined and '' are pending. */
    getRecordId?: (data: QueryContentContext<T>) => string | number | null | undefined
    /** Receives the document, and the verified ID when `getRecordId` is set. */
    children: Snippet<[QueryContentContext<T>, (string | number)?]>
  } = $props()

  /**
   * The state as a readable store, whichever prop form arrived: the store
   * `useQuery` returned is observed as it is, and a plain state object (the
   * React prop's shape) is wrapped — so both
   * `<QueryContent query={query}>` and `query={$query}` follow the query.
   */
  const view: Readable<QueryView> = $derived(
    typeof (props.query as Partial<Readable<QueryView>>).subscribe === 'function'
      ? (props.query as Readable<QueryView>)
      : readonly(writable(props.query as QueryView)),
  )

  /** Whether the props bind the branch to the loaded document's identity. */
  const identified = $derived(typeof props.getRecordId === 'function')

  /** The valid identity of the loaded document: absent, null and '' are pending. */
  const recordId = $derived.by(() => {
    const getRecordId = props.getRecordId
    if (typeof getRecordId !== 'function') return undefined
    const data = $view.data
    if (data === undefined || data === null) return undefined
    const id = getRecordId(data)
    return id == null || id === '' ? undefined : id
  })
</script>

{#if $view.data === undefined || ($view.isPreviousData && (identified || props.recordKey !== undefined || $view.data === null || (props.empty?.when($view.data) ?? false)))}
  {#if $view.status === 'error' && props.error}
    {@render props.error?.($view.error)}
  {:else if props.pending}
    {@render props.pending?.()}
  {/if}
{:else if $view.data === null}
  {#if props.missing}{@render props.missing?.()}{/if}
{:else if identified}
  {#if recordId === undefined}
    {#if props.pending}{@render props.pending?.()}{/if}
  {:else}
    <!-- Keyed by the ID inside the viewer key, so either change starts the
         loaded branch fresh (React's nested keyed Fragments). -->
    {#key props.recordKey}
      {#key recordId}
        {#if props.empty?.when($view.data)}
          {@render props.empty.render?.($view.data)}
        {:else}
          {@render props.children?.($view.data, recordId)}
        {/if}
      {/key}
    {/key}
  {/if}
{:else if props.recordKey !== undefined}
  <!-- Keyed, so a changed record starts the loaded branch fresh (React's keyed Fragment). -->
  {#key props.recordKey}
    {#if props.empty?.when($view.data)}
      {@render props.empty.render?.($view.data)}
    {:else}
      {@render props.children?.($view.data)}
    {/if}
  {/key}
{:else if props.empty?.when($view.data)}
  {@render props.empty.render?.($view.data)}
{:else}
  {@render props.children?.($view.data)}
{/if}
