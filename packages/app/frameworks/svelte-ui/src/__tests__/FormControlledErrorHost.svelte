<!--
  Test host: mounts a Form with no `submitError` prop, then — after the test
  calls the exported `clearSubmitError()` — with `submitError={undefined}`
  present, so a controlled error can clear an internally captured rejection.
-->
<script lang="ts">
  import Form from '../components/Form.svelte'

  let { onFormSubmit }: { onFormSubmit?: (data: Record<string, unknown>) => void | Promise<void> } =
    $props()

  let controlled = $state(false)
  let submitError = $state<unknown>(undefined)

  /**
   * Switches the Form to a caller-managed `submitError` whose value is
   * `undefined` — present-but-clear, the React `submitError={undefined}` case.
   */
  export function clearSubmitError(): void {
    controlled = true
    submitError = undefined
  }
</script>

{#if controlled}
  <Form {onFormSubmit} {submitError}></Form>
{:else}
  <Form {onFormSubmit}></Form>
{/if}
