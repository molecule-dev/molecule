<!--
  Test host for the Progress clamping test: a re-render walks one Progress
  instance through an over-max value, a negative value and the indeterminate
  case, so `aria-valuenow` must follow each render.
-->
<script lang="ts">
  import Progress from '../components/Progress.svelte'

  /** The values the React test rerenders through, in order. */
  const steps: ReadonlyArray<readonly [number, boolean]> = [
    [150, false],
    [-5, false],
    [40, true],
  ]

  let step = $state(0)
</script>

<button type="button" data-toggle onclick={() => (step = Math.min(step + 1, steps.length - 1))}>
  toggle
</button>
<Progress value={steps[step]![0]} max={100} label="Upload" indeterminate={steps[step]![1]} />
