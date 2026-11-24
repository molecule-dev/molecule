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

  `present`, when given, decides instead of the element's own content: for content whose
  presence is a node nested in another component (a Button's label, read with
  `<ContentOrElse bind:present>`), where the element always holds that component's markup.
-->
<script lang="ts">
  import { type Snippet, untrack } from 'svelte'
  import type { Attachment } from 'svelte/attachments'
  import type { HTMLAnchorAttributes, HTMLAttributes } from 'svelte/elements'

  import { rendersContent } from '../content.js'

  let {
    tag = 'div',
    children,
    present,
    ...attributes
  }: HTMLAttributes<HTMLElement> &
    // A link's own attributes, for `tag="a"`.
    Pick<
      HTMLAnchorAttributes,
      'href' | 'target' | 'rel' | 'download' | 'hreflang' | 'referrerpolicy'
    > & {
      /** The element's tag; every other prop is an attribute of it. */
      tag?: string
      /** The content; the element is in the page only while it renders something. */
      children?: Snippet
      /** Decides instead of the content when given (see above). */
      present?: boolean
    } = $props()

  /** Decides again; set while the element exists. */
  let decide: (() => void) | null = null

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
      if (untrack(() => present) ?? rendersContent(element)) {
        if (!element.isConnected && anchor?.parentNode)
          anchor.parentNode.insertBefore(element, anchor)
      } else if (element.parentNode) {
        element.remove()
      }
    }
    sync()
    decide = sync
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => {
      observer.disconnect()
      decide = null
    }
  }

  $effect.pre(() => {
    void present
    untrack(() => decide?.())
  })
</script>

<svelte:element this={tag} {...attributes} {@attach presentWhileContent}
  >{@render children?.()}</svelte:element
>
