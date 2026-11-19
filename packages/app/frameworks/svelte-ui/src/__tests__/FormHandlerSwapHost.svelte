<!--
  Test host: renders a Form with the `first` submit handlers, then — after the
  test calls the exported `swapHandlers()` — with the `second` ones, the way a
  parent re-renders with new handlers.
-->
<script lang="ts">
  import Form from '../components/Form.svelte'
  import type { FormProps } from '../types.js'

  type Handlers = Pick<FormProps, 'onSubmit' | 'onFormSubmit'>

  let { first, second }: { first: Handlers; second: Handlers } = $props()

  let swapped = $state(false)
  const handlers = $derived(swapped ? second : first)

  /** Re-renders the Form with the `second` handlers. */
  export function swapHandlers(): void {
    swapped = true
  }
</script>

<Form onSubmit={handlers.onSubmit} onFormSubmit={handlers.onFormSubmit}>
  <input name="name" value="Luke" />
</Form>
