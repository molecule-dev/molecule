<script lang="ts">
  import type { PostProps } from './page-props.js'

  let { slug }: PostProps = $props()
</script>

<p>{slug}</p>
