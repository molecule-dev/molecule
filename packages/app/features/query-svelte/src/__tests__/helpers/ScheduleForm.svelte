<!--
  An edit form's own state: it starts from the record it mounted with and only
  its own Edit click changes the draft, the way the React package's form does.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  let { title }: { title: string } = $props()
  // Initialized once from the record this form mounted with: a later record
  // reaching the same mount must not overwrite the person's draft.
  let draft = $state(untrack(() => title))
</script>

<form>
  <input value={draft} readonly />
  <button type="button" onclick={() => (draft = 'Unsaved')}>Edit</button>
</form>
