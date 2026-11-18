<!--
  Test harness for the form tests: a real `<TagInput>` inside a real `<form>`
  with a submit button, like the article editor form that surfaced the
  Enter-submits bug. jsdom does not implement a browser's implicit form
  submission from Enter in a text input, so this harness restores it: an Enter
  keydown that reached the document NOT canceled submits the form.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte'

  import TagInput from '../TagInput.svelte'

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
</script>

<form
  bind:this={form}
  onsubmit={(e) => {
    e.preventDefault()
    onSubmit()
  }}
>
  <TagInput value={tags} onChange={(next) => (tags = next)} {maxTags} {normalize} />
  <button type="submit">Publish</button>
  <output data-testid="tags">{tags.join(',')}</output>
</form>
