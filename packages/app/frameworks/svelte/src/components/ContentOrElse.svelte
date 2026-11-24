<!--
  ContentOrElse: its content in the page, with no element of its own, while that content renders
  something (an element, or text), and `otherwise` in its place while it renders nothing. React's
  `slot(emptyState) ? <>{emptyState}</> : <div>…</div>`: a feed's empty state takes the place of
  the feed's element only while it shows something, which a Svelte component cannot decide from a
  snippet's value (an `{#each}` over no rows, an `{#if false}`).

  The content renders once, between two anchor comments that Svelte owns and moves with this
  component: the blocks of two `svelte:element`s whose elements leave the page as soon as they are
  created. Its components therefore live exactly as long as this component, and nothing else is
  rendered between the two anchors, so the range read is the content's. `otherwise` waits for the
  first decision, made once the content has rendered, so content that shows something at mount
  never creates it; a `MutationObserver` then decides again after every change, in a microtask
  before the browser paints.

  `bind:present` reports the decision, for an element around the content that another component
  renders (`<PresentWhileContent present={…}>` around a Button whose label is the content: the
  Button's own whitespace is not the label). Use `PresentWhileContent` alone when the content sits
  directly in the element that comes and goes.

  It is `undefined` until the first decision, so a sibling that renders only while the content
  is empty (`{#if present === false}`) is never created for content that shows something.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { Attachment } from 'svelte/attachments'

  import { isContentNode } from '../content.js'

  let {
    children,
    otherwise,
    present = $bindable(),
  }: {
    /** The content; in the page, without a wrapper, while it renders something. */
    children?: Snippet
    /** What renders in the content's place while the content renders nothing. */
    otherwise?: Snippet
    /**
     * Whether the content renders something, read with `bind:present`: `undefined` until the
     * content has rendered and been read once.
     */
    present?: boolean
  } = $props()

  /** Whether the content has rendered and been read once. */
  let decided = $state(false)
  /** The anchor comment in front of the content. */
  let start: Node | null = null

  /**
   * Records the anchor that opens the content's range and takes the marker element out.
   *
   * @param element - The marker element.
   */
  const markStart: Attachment<HTMLElement> = (element) => {
    start = element.nextSibling
    element.remove()
  }

  /**
   * Records the anchor that closes the content's range, takes the marker element out, decides,
   * and keeps deciding after every change in the range's parent.
   *
   * @param element - The marker element.
   * @returns The cleanup.
   */
  const markEnd: Attachment<HTMLElement> = (element) => {
    const end = element.nextSibling
    element.remove()
    const from = start
    if (!from || !end) return
    const sync = (): void => {
      let next = from.nextSibling
      while (next && next !== end && !isContentNode(next)) next = next.nextSibling
      present = !!next && next !== end
      decided = true
    }
    sync()
    // The range is created inside a fragment that Svelte then moves into the page, and a block
    // can move it again: observe whatever parent it has now, and follow it when it changes.
    let observed: Node | null = null
    const observer = new MutationObserver(() => {
      if (from.parentNode !== observed) observe()
      sync()
    })
    const observe = (): void => {
      observer.disconnect()
      observed = from.parentNode
      if (observed)
        observer.observe(observed, { childList: true, characterData: true, subtree: true })
    }
    observe()
    return () => {
      observer.disconnect()
      // Removed, the content renders nothing.
      present = false
    }
  }
</script>

<svelte:element this={"i"} {@attach markStart} />{@render children?.()}<svelte:element
  this={"i"}
  {@attach markEnd}
/>{#if decided && !present}{@render otherwise?.()}{/if}
