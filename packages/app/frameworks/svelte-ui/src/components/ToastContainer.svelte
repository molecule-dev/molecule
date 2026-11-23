<!--
  ToastContainer: positions toasts on screen via a document.body portal
  (the container div becomes a direct body child, like React's portal).
-->
<script lang="ts">
  import { BodyPortal } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ToastContainerProps } from '../types.js'

  let {
    ref = $bindable(null),
    children,
    position = 'bottom-right',
    className,
  }: ToastContainerProps = $props()

  const cm = $derived(getClassMap())
</script>

<BodyPortal
  ><div bind:this={ref} class={cm.cn(cm.toastContainer({ position }), className)}>
    {@render children?.()}
  </div></BodyPortal
>
