<!--
  ToastContainer: positions toasts on screen via a document.body portal
  (the container div becomes a direct body child, like React's portal).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { bodyPortal } from '../dom.js'
  import type { ToastContainerProps } from '../types.js'

  let { children, position = 'bottom-right', className }: ToastContainerProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.toastContainer({ position }), className)} use:bodyPortal>
  {@render children?.()}
</div>
