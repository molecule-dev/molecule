<script lang="ts">
  // `/probe/nav/[...rest]`: the one route the `ListRouteNav` conformance cases navigate
  // through. Kit reuses a page component while the matched route id stays the same, so
  // every case path is this file, and the choices are patched rather than remounted.
  import NavCaseProbe from '../../../../lib/NavCaseProbe.svelte'
</script>

<NavCaseProbe />
