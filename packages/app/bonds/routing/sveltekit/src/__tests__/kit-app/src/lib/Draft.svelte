<script lang="ts">
  import type { DraftProps } from './page-props.js'

  let { initial }: DraftProps = $props()
</script>

<h1>{initial ?? 'empty draft'}</h1>
