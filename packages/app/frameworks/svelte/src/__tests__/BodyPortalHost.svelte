<!--
  Test host: a `BodyPortal` followed by an inline sibling inside one `{#if}`, so
  the portaled element is the FIRST node of the branch and an inline element is
  its last — the shape where moving the first node makes Svelte's teardown walk
  past the branch and remove unrelated body children.
-->
<script lang="ts">
  import { BodyPortal } from '../components/index.js'

  let { show = true, target }: { show?: boolean; target?: HTMLElement | null } = $props()

  /** Opens or closes the branch from the test. */
  export function setShow(v: boolean): void {
    show = v
  }
</script>

{#if show}
  <BodyPortal {target}><div data-p="portaled"><span data-p="inner"></span></div></BodyPortal>
  <p data-p="inline">inline</p>
{/if}
