<!--
  Renders the matched child route, as @molecule/app-react's RoutedView, through whichever routing
  bond the app wired. A layout or guard renders it where its page goes when it was given no
  children. It throws when the routing bond has no routed view (SvelteKit gives a layout its page
  as `children`): rendering nothing there would show a blank page with no error.
-->
<script lang="ts">
  import { routedViewOrThrow } from '../routed-view-context.js'

  const View = routedViewOrThrow()
</script>

<View />
