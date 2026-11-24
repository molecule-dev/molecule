<!--
  Test host: the slot inside one element while it renders something and a different element in
  its place while it renders nothing — React's `slot(empty) ? <div className={a}>{empty}</div> :
  <div className={b}>…</div>` — with the second element waiting for the first decision.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent } from '../components/index.js'
  import Counter from './ContentOrElseCounter.svelte'

  let { words = [], counts = {} }: { words?: string[]; counts?: Record<string, [number, number]> } =
    $props()
  let hasEmpty = $state<boolean>()

  /** Changes the slot's words from the test. */
  export function set(next: string[]): void {
    words = next
  }
</script>

<PresentWhileContent data-p="a" present={hasEmpty}
  ><ContentOrElse bind:present={hasEmpty}
    >{#each words as word (word)}<em>{word}</em>{/each}</ContentOrElse
  ></PresentWhileContent
>{#if hasEmpty === false}<div data-p="b"><Counter name="b" {counts} /></div>{/if}
