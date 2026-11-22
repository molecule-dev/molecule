<!--
  Test host for the SkillsCard project-switch test: sets the HTTP provider in
  Svelte context during component initialisation (the only place Svelte context
  is legal) and renders the card from a props object the test can replace, the
  way React's `rerender` hands it a new `projectId`.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { HttpClient } from '@molecule/app-http'
  import { setHttpContext } from '@molecule/app-svelte'

  import SkillsCard, { type SkillsCardProps } from '../parts/SkillsCard.svelte'

  let { http, initial }: { http: HttpClient; initial: SkillsCardProps } = $props()

  // The card's current props (a test replaces them wholesale).
  let cardProps = $state<SkillsCardProps>({ ...untrack(() => initial) })

  untrack(() => setHttpContext(http))

  /**
   * Replaces the card's props (the host re-rendered with new values).
   *
   * @param next - The card's new props.
   */
  export function setProps(next: SkillsCardProps): void {
    cardProps = next
  }
</script>

<SkillsCard {...cardProps} />
