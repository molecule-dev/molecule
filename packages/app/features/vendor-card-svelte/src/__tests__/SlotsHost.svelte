<!--
  Unit-test host: renders the VendorCard with badges and actions snippets, the
  Svelte idiom for the React test's element props.
-->
<script lang="ts">
  import VendorCard from '../VendorCard.svelte'
</script>

<VendorCard name="V">
  {#snippet badges()}
    <span data-badges></span>
  {/snippet}
  {#snippet actions()}
    <button data-actions></button>
  {/snippet}
</VendorCard>
