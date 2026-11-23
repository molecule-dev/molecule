<!--
  ListingCardToggle: the Svelte counterpart of the private `ListingCardToggle`
  inside `@molecule/app-listing-card-react`'s `ListingCard.tsx` — the counted
  card action: the pressed state and the total in one button, changed on the
  first click and saved through `useOptimisticValue`, so a rejected save puts
  BOTH fields back together. Same button props, same default `data-mol-id`, and
  it stops the click from reaching the card's own handler, exactly as React does.
-->
<script lang="ts">
  import { toStore } from 'svelte/store'

  import { useOptimisticValue } from '@molecule/app-svelte'
  import { Button } from '@molecule/app-ui-svelte'

  import ListingCardActions from './ListingCardActions.svelte'
  import type { ListingCardToggleProps } from './types.js'

  let {
    value,
    commit,
    onError,
    activeLabel,
    inactiveLabel,
    dataMolId = 'listing-card-toggle',
    variant,
    ...buttonProps
  }: ListingCardToggleProps = $props()

  // A store of the latest props, so a changed `commit`, `onError` or server
  // `value` reaches the controller the way React's refs do across renders.
  const options = toStore(() => ({
    value,
    commit: (next: { pressed: boolean; count: number }) => commit(next.pressed),
    onError: (error: unknown) => onError?.(error),
  }))

  const toggle = useOptimisticValue<{ pressed: boolean; count: number }>(options)

  const shown = toggle.value
  const pending = toggle.pending

  const pressed = $derived($shown.pressed)
  const count = $derived($shown.count)

  // React renders `{label} <span>{count}</span>`, one literal space between
  // them. An expression keeps that exact single space here: written as raw
  // template whitespace, formatting would move it.
  const labelSeparator = ' '

  let element = $state<HTMLButtonElement | null>(null)

  // The click is handled by a real listener on the button, not Svelte's
  // delegated `onclick`: the delegated handler runs only once the event has
  // bubbled to the root, so its `stopPropagation()` would come too late and
  // the card's own click listener would still fire. React's handler stops it
  // before the card sees it.
  $effect(() => {
    const node = element
    if (!node) return
    /**
     * Flips the pressed state and moves the count by one, then stops the click
     * from bubbling into the card, exactly as React's handler does.
     *
     * @param event - The button's click event.
     */
    const onClick = (event: MouseEvent): void => {
      event.stopPropagation()
      toggle.update((current) => ({
        pressed: !current.pressed,
        count: Math.max(0, current.count + (current.pressed ? -1 : 1)),
      }))
    }
    node.addEventListener('click', onClick)
    return () => node.removeEventListener('click', onClick)
  })
</script>

<ListingCardActions>
  <Button
    data-mol-id={dataMolId}
    {...buttonProps}
    bind:ref={element}
    type="button"
    variant={variant ?? (pressed ? 'solid' : 'outline')}
    aria-pressed={pressed}
    aria-busy={$pending}
    >{#if pressed}{#if typeof activeLabel === 'function'}{@render activeLabel?.()}{:else}{activeLabel}{/if}{:else}{#if typeof inactiveLabel === 'function'}{@render inactiveLabel?.()}{:else}{inactiveLabel}{/if}{/if}{labelSeparator}<span
      >{count}</span
    ></Button
  >
</ListingCardActions>
