<script lang="ts">
  import type { WebDragOptions } from '@molecule/app-pointer-events-dom'

  import { webDrag } from '../drag.js'

  let { options }: { options: WebDragOptions } = $props()
</script>

<section data-testid="gesture-surface" aria-label="Editing surface" use:webDrag={options}>
  <button>Edit</button>
</section>
