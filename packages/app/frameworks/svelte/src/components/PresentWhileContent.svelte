<!--
  PresentWhileContent: an element that is in the page only while its content renders something
  (an element, or text) — React's `slot(children) !== undefined ? <div>{children}</div> : null`,
  which a Svelte component cannot decide from a snippet's value (an `{#each}` over no rows, an
  `{#if false}`). `tag` names the element (`div` by default); every other prop is an attribute of
  it.

  The element is the only node of its own `svelte:element` block. While its content is empty it
  leaves the page and waits just before that block's anchor comment, which Svelte moves with the
  block, so it comes back in its place; a `MutationObserver` on it (which keeps reporting while
  it is out of the page) decides again after every change Svelte makes to the content. The
  observer reports in a microtask, before the browser paints.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import type { HTMLAttributes } from 'svelte/elements'

  import { rendersContent } from '../content.js'

  let {
    tag = 'div',
    children,
    ...attributes
  }: HTMLAttributes<HTMLElement> & {
    /** The element's tag. */
    tag?: string
    /** The content; the element is in the page only while it renders something. */
    children?: Snippet
  } = $props()

  /**
   * Keeps the element in the page exactly while its content renders something.
   *
   * @param element - The element.
   * @returns The cleanup.
   */
  const presentWhileContent: Attachment<HTMLElement> = (element) => {
    // The block's anchor: Svelte inserts the element in front of it and moves the two together.
    const anchor = element.nextSibling
    const sync = (): void => {
      if (rendersContent(element)) {
        if (!element.isConnected && anchor?.parentNode)
          anchor.parentNode.insertBefore(element, anchor)
      } else if (element.parentNode) {
        element.remove()
      }
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }
</script>

<svelte:element this={tag} {...attributes} {@attach presentWhileContent}
  >{@render children?.()}</svelte:element
>
