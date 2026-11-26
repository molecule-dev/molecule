<!--
  A browser file picker and drop target. Delivers portable file selections.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { createBrowserFileInput, fromBrowserFile } from '@molecule/app-filesystem'
  import type { FileFieldProps } from '@molecule/app-ui'

  let {
    accept,
    children,
    className,
    disabled,
    maxSize,
    multiple,
    onPickError,
    onRejected,
    onValueChange,
    role,
    ...attrs
  }: FileFieldProps<Snippet> = $props()
  let input = $state<HTMLInputElement>()
  const roleOverride = $derived(role === undefined ? {} : { role })
  const handlers = createBrowserFileInput(
    () => input,
    () => ({
      accept,
      disabled,
      maxSize,
      multiple,
      onPickError,
      onRejected,
      onFiles: onValueChange,
    }),
    fromBrowserFile,
  )
</script>

<div
  data-mol-id="file-field"
  role="button"
  {...attrs}
  {...roleOverride}
  class={className}
  tabindex={disabled ? -1 : 0}
  aria-disabled={disabled}
  onclick={handlers.onClick}
  onkeydown={handlers.onKeyDown}
  ondragover={handlers.onDragOver}
  ondrop={handlers.onDrop}
>
  <input
    bind:this={input}
    type="file"
    hidden
    {accept}
    {multiple}
    {disabled}
    onchange={handlers.onChange}
  />{@render children?.()}
</div>
