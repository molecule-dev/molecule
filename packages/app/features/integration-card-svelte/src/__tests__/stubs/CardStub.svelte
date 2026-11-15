<!--
  Test stub for the Card UI component: the same `<div data-card>` the React
  unit tests install for `@molecule/app-ui-react`, with `className`, the inline
  style and `data-mol-id` landing on the same element.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Action } from 'svelte/action'

  interface Props {
    children?: Snippet
    className?: string
    style?: Record<string, string | number | undefined>
    [key: string]: unknown
  }

  let { children, className, style, ...rest }: Props = $props()

  /**
   * Applies a React-shaped style object (camelCase keys) the way react-dom
   * does, so the stub leaves the same declarations on the element.
   *
   * @param el - The element.
   * @param value - The style object.
   * @returns The action's update hook.
   */
  const applyStyle: Action<HTMLElement, Props['style']> = (el, value) => {
    const apply = (next: Props['style']): void => {
      el.removeAttribute('style')
      if (!next) return
      for (const [key, entry] of Object.entries(next)) {
        if (entry === undefined) continue
        const property = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
        el.style.setProperty(property, String(entry))
      }
    }
    apply(value)
    return { update: apply }
  }
</script>

<div data-card="" class={className} use:applyStyle={style} {...rest}>
  {@render children?.()}
</div>
