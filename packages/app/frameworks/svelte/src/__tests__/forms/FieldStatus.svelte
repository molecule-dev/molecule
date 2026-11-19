<!--
  React's `Field` probe: one selected field's value, rendered from the hook's
  store. The controller the test passes may change its value after the hook's
  first read but before its subscription settles.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { FormController } from '@molecule/app-forms'

  import { useFieldState } from '../../hooks/useForm.js'

  let { controller }: { controller: FormController<{ email: string }> } = $props()

  const selection = untrack(() => useFieldState(controller, 'email'))
</script>

<p role="status">{$selection.value}</p>
