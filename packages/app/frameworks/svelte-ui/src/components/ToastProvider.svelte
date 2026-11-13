<!--
  ToastProvider: manages global toast state. Children can add and remove
  toasts with useToast(); the toasts render in a ToastContainer under the
  component tree.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import { type ManagedToast, TOAST_CONTEXT } from '../toast.js'
  import type { ToastProps, ToastProviderProps } from '../types.js'
  import Toast from './Toast.svelte'
  import ToastContainer from './ToastContainer.svelte'

  let { children, position = 'bottom-right' }: ToastProviderProps = $props()

  let toasts = $state<ManagedToast[]>([])
  let toastCounter = 0

  const addToast = (toast: Omit<ToastProps, 'onDismiss'>): string => {
    toastCounter += 1
    const id = `toast-${toastCounter}`
    toasts = [...toasts, { ...toast, id }]
    return id
  }

  const removeToast = (id: string): void => {
    toasts = toasts.filter((toast) => toast.id !== id)
  }

  setContext(TOAST_CONTEXT, {
    get toasts() {
      return toasts
    },
    addToast,
    removeToast,
  })
</script>

{@render children?.()}
<ToastContainer {position}>
  {#each toasts as toast (toast.id)}
    <Toast {...toast} onDismiss={() => removeToast(toast.id)} />
  {/each}
</ToastContainer>
