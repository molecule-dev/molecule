<!--
  Test host for SkillsCard: sets the http provider in Svelte context during
  component initialisation (the only place Svelte context is legal) and
  renders the card with the props it was given. The React reference wraps its
  card in an HttpProvider the same way; the i18n provider is process-global.
-->
<script lang="ts">
  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext, type ThemeProvider } from '@molecule/app-svelte'

  import SkillsCard, { type SkillsCardProps } from '../parts/SkillsCard.svelte'

  let { http, ...rest }: SkillsCardProps & { theme?: ThemeProvider; http: HttpClient } = $props()
  // svelte-ignore state_referenced_locally
  setHttpContext(http)
</script>

<SkillsCard {...rest} />
