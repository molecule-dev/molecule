<!--
  Mounts `ThreeViewer` for the unit tests with a props object a test can
  change: spreading a `$state` object in the render tracks each property, so
  writing one re-renders the viewer with the new value.
-->
<script lang="ts">
  import ThreeViewer from '../ThreeViewer.svelte'
  import type { ThreeViewerProps } from '../types.js'

  let { props }: { props: ThreeViewerProps } = $props()
</script>

<ThreeViewer {...props} />
