<!--
  Test host for the Button pending-action suite: the real Button driven by the
  real `usePromise` tracker, the way a product screen wires a save action. The
  next value it sends comes from the server's answer, never from an optimistic
  local toggle.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import { get } from 'svelte/store'

  import { usePromise } from '@molecule/app-svelte'

  import Button from '../components/Button.svelte'

  /** The server's own answer after a bookmark save. */
  interface BookmarkSnapshot {
    bookmarked: boolean
  }

  /** The caller's request function, standing in for an application's adapter. */
  type SaveBookmark = (next: boolean) => Promise<BookmarkSnapshot>

  let { save, disabled }: { save: SaveBookmark; disabled?: boolean } = $props()

  // The tracker is bound to the request function the host was mounted with,
  // like React's hook memoized on its first `asyncFn`.
  const promise = usePromise(untrack(() => save))
  const call = get(promise)[1]

  const submit = (): void => {
    const [state] = get(promise)
    const bookmarked = state.value?.bookmarked ?? false
    // `usePromise` already records a rejection in `state.error`; this guard only
    // keeps a rejected request from surfacing as an unhandled rejection.
    void call(!bookmarked).catch((_error: unknown) => {})
  }
</script>

<Button {disabled} loading={$promise[0].status === 'pending'} onClick={submit}>
  {$promise[0].value?.bookmarked ? 'Remove bookmark' : 'Bookmark'}
</Button>
