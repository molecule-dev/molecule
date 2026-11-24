<!--
  Test host: a link that is in the page only while the label inside its button renders
  something — React's `slot(label) && <a><Button>{label}</Button></a>` — with the label's
  presence read by `ContentOrElse` and handed to `PresentWhileContent`.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent } from '../components/index.js'
  import Labelled from './ContentOrElseLabelled.svelte'

  let { words = [], labelled = true }: { words?: string[]; labelled?: boolean } = $props()
  let hasLabel = $state(false)

  /** Changes the label's words from the test. */
  export function set(next: string[]): void {
    words = next
  }

  /** Removes or restores the label from the test. */
  export function label(next: boolean): void {
    labelled = next
  }
</script>

<PresentWhileContent tag="a" href="/plans" present={hasLabel}
  ><Labelled
    >{#if labelled}<ContentOrElse bind:present={hasLabel}
        >{#each words as word (word)}<em>{word}</em>{/each}</ContentOrElse
      >{/if}</Labelled
  ></PresentWhileContent
>
<p data-p="after">after</p>
