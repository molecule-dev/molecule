<!--
  A stand-in for the UI `Spinner` in the unit tests: a `<span>` carrying
  `data-spinner`. The empty script block gives the component a declaration
  svelte-check can type: a script-less `.svelte` file has no generated module
  type, so importing it from the test would be an implicit `any`.
-->
<script lang="ts"></script>

<span data-spinner=""></span>
