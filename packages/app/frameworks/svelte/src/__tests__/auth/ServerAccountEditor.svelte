<!--
  React's `ServerAccountEditor`: a form that owns its values by loading the
  server on every visit, so it never reads the shared auth user.
-->
<script lang="ts">
  import { onMount } from 'svelte'

  interface Account {
    memberKey: string
    displayName: string
    timezone: string
  }

  let name = $state('')
  onMount(() => {
    void fetch('/employees/current')
      .then((response) => response.json())
      .then((body: { account: Account }) => {
        name = body.account.displayName
      })
  })
</script>

<input
  aria-label="Account name"
  value={name}
  oninput={(event) => (name = event.currentTarget.value)}
/>
