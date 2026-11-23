<!--
  BodyPortal: renders its children as direct children of `document.body` (or of
  `target`), with no wrapper element — React's `createPortal(children, target)`.

  Svelte itself places the nodes there: a second `mount()` whose content is this
  component's `children` snippet. No node is ever moved after Svelte placed it, so
  every block range, anchor and keyed item inside the portal stays where Svelte
  put it, and the portal's content is unmounted with this component.

  Context flows through (`getAllContexts`), the snippet stays reactive, delegated
  events reach the content (the mount registers them on the target) and nothing
  renders on the server, as with React's portals.
-->
<script lang="ts">
  import { flushSync, getAllContexts, mount, type Snippet, unmount } from 'svelte'

  import PortalContent from './PortalContent.svelte'

  let {
    target,
    children,
  }: {
    /** Where the children render. Defaults to `document.body`; `null` renders nothing yet. */
    target?: Element | null
    /** The portaled content. */
    children?: Snippet
  } = $props()

  const context = getAllContexts()

  $effect(() => {
    const parent = target === undefined ? document.body : target
    const content = children
    if (!parent || !content) return
    const instance = mount(PortalContent, { target: parent, props: { children: content }, context })
    // The content's own bindings, actions and effects run now, before the effects of the
    // component that declared the portal: the order inline markup would give them.
    flushSync()
    return () => {
      void unmount(instance)
    }
  })
</script>
