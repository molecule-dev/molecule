<!--
  Test harness for the hook's app-owned markup: the text input and the tag
  list are SIBLINGS (not one wrapper), and each tag's remove control is an
  `<i>`, not a button — markup `<TagInput>` cannot produce.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte'

  import { useTagInput } from '../useTagInput.js'

  let {
    initial = [],
    maxTags,
    normalize,
    onSubmit,
  }: {
    initial?: string[]
    maxTags?: number
    normalize?: (raw: string, current: string[]) => string | null
    onSubmit: () => void
  } = $props()

  let tags = $state<string[]>(untrack(() => [...initial]))
  let form: HTMLFormElement | undefined = $state()

  onMount(() => {
    const listener = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' && !event.isComposing && !event.defaultPrevented)
        form?.requestSubmit()
    }
    document.addEventListener('keydown', listener)
    return () => document.removeEventListener('keydown', listener)
  })

  const { draft, inputProps, remove } = useTagInput(() => ({
    value: tags,
    onChange: (next) => (tags = next),
    maxTags,
    normalize,
  }))
</script>

<form
  bind:this={form}
  onsubmit={(e) => {
    e.preventDefault()
    onSubmit()
  }}
>
  <input type="text" name="title" aria-label="title" />
  <input
    type="text"
    aria-label="tags"
    value={$draft}
    oninput={$inputProps.onChange}
    onkeydown={$inputProps.onKeyDown}
    onfocusout={$inputProps.onBlur}
  />
  <ul data-testid="list">
    {#each tags as tag, i (tag)}
      <li>
        <!-- App-owned markup: a bare <i> is the app's remove control. Its
             a11y shape is the app's design decision, not this harness's. -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <i data-testid="remove-{tag}" onclick={() => remove(i)}></i>{tag}
      </li>
    {/each}
  </ul>
  <button type="submit">Publish</button>
</form>
