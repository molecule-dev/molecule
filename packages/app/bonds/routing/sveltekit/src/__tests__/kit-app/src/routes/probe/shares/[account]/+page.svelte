<script lang="ts">
  // React's `Page` in "useMoleculeRouter shares the bonded router's guards…": records the
  // router `useMoleculeRouter` returns; the button updates the page, React's re-render.
  import { useMoleculeRouter } from '../../../../../../../index.js'
  import { bindingProbe } from '../../../../lib/binding-probe.js'

  const probe = bindingProbe()
  probe.returned.push(useMoleculeRouter())
  let count = $state(0)
</script>

<button id="update-shares" onclick={() => (count += 1)}>page {count}</button>
