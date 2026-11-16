<!--
  Test host: a controlled parent for `JoinCode`, holding the code in its own
  `$state` the way an app does (React's `useState` parent in the React suite).
-->
<script lang="ts">
  import JoinCode from '../JoinCode.svelte'

  /** The code the parent owns. */
  let value = $state('AB')
</script>

<JoinCode length={4} {value} onChange={(next) => (value = next)} />
