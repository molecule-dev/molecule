<!--
  A control the app owns: the hook supplies the value and the update action,
  and this markup decides how they render (React's `FavoriteButton` in the
  ported optimistic-value cases). The options arrive as a plain value or a
  store, so a test can re-render the component the way React's parent passes
  new props.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { OptimisticValueOptions } from '@molecule/app-state'

  import type { MaybeReadable } from '../maybe-readable.js'
  import { useOptimisticValue } from '../useOptimisticValue.js'

  interface Favorite {
    favorited: boolean
    count: number
  }

  let { options }: { options: MaybeReadable<OptimisticValueOptions<Favorite>> } = $props()

  // The hook follows its own store source; reading the prop once at init is
  // what a component does, not a reactive dependency.
  const { value, pending, error, update } = untrack(() => useOptimisticValue(options))

  const tap = (): void => {
    update((current) => ({
      favorited: !current.favorited,
      count: current.count + (current.favorited ? -1 : 1),
    }))
  }
</script>

<button
  type="button"
  aria-pressed={$value.favorited}
  data-pending={$pending ? 'true' : 'false'}
  data-error={$error ? String($error) : ''}
  onclick={tap}
>
  {$value.count}
</button>
