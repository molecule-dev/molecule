<script lang="ts">
  // `/settings/[account]`: the parameterised settings page the hooks cases open.
  import { page } from '$app/state'
</script>

<output>{page.params.account}</output>
