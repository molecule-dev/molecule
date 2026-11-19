<!--
  ToastProvider: manages global toast state. Children can add and remove
  toasts with useToast(); the toasts render in a ToastContainer under the
  component tree.
-->
<script lang="ts" module>
  // One counter for every provider on the page, as React's is: two providers never
  // generate the same toast id (it is the toast element's DOM id).
  let toastCounter = 0

  /**
   * The next generated toast id.
   *
   * @returns An id no other toast on the page has.
   */
  const nextToastId = (): string => `toast-${++toastCounter}`
</script>

<script lang="ts">
  import { setContext } from 'svelte'

  import { type ManagedToast, TOAST_CONTEXT, type ToastContextValue } from '../toast.js'
  import type { ToastProviderProps } from '../types.js'
  import Toast from './Toast.svelte'
  import ToastContainer from './ToastContainer.svelte'

  let { children, position = 'bottom-right' }: ToastProviderProps = $props()

  let toasts = $state<ManagedToast[]>([])

  const addToast: ToastContextValue['addToast'] = (toast) => {
    // A caller's `id` is the toast's handle and its element id; otherwise one is generated.
    const id = toast.id ?? nextToastId()
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
