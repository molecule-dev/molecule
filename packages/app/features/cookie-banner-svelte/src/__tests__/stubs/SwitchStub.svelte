<!--
  Test stub for the Switch UI component: the same `<input type="checkbox"
  data-switch>` checkbox carrying the `checked` state and the label/description
  ids that the React unit tests install for `@molecule/app-ui-react`.
-->
<script lang="ts">
  let {
    checked,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
  }: {
    checked?: boolean
    'aria-labelledby'?: string
    'aria-describedby'?: string
  } = $props()
</script>

<input
  type="checkbox"
  data-switch=""
  {checked}
  readonly
  aria-labelledby={labelledBy}
  aria-describedby={describedBy}
/>
