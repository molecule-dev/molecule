<script lang="ts">
  // React's `Page` in "a page reads its route params through useMoleculeRouter": records what
  // the bond's router and `@molecule/app-svelte`'s `useParams` read at each update of the page.
  import { useParams } from '@molecule/app-svelte'

  import { useMoleculeRouter } from '../../../../../../../index.js'
  import { bindingProbe } from '../../../../lib/binding-probe.js'

  const probe = bindingProbe()
  const router = useMoleculeRouter()
  const binding = useParams()

  /**
   * Records both readings, as React's render does, and shows the binding's.
   *
   * @returns The account the binding read.
   */
  const read = (): string => {
    probe.params.push({ router: router.getParams(), binding: { ...$binding } })
    return $binding.account ?? ''
  }
</script>

<p>{read()}</p>
