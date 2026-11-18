<!--
  A parent that re-renders without touching the form's props: the form's own
  draft must survive the update, the way React keeps a child component's state
  when its parent re-renders with the same element.
-->
<script lang="ts">
  import ScheduleForm from './ScheduleForm.svelte'

  let count = $state(0)
</script>

<ScheduleForm title="New schedule" />
<p data-count>{count}</p>
<button type="button" data-rerender onclick={() => (count += 1)}>rerender</button>
