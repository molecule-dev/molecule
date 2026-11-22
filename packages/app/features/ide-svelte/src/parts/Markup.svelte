<!--
  The one place this package injects markup: a bare `{@html}` fragment with NO
  wrapper element, so `<Markup markup={x} />` inside an element renders exactly
  what `el.innerHTML = x` rendered — the same child nodes, in the same order.
  Its input comes only from `@molecule/app-ui` (the spinner mark) and the bonded
  icon set (`@molecule/app-icons`, `material-file-icons`) — never user input, and
  never a string built from it. Those bonds are the trust boundary, exactly as
  React's counterparts inject the same strings with `dangerouslySetInnerHTML`.
-->
<script module lang="ts">
  /** Props for {@link Markup}. */
  export interface MarkupProps {
    /** Trusted SVG/HTML markup from `@molecule/app-ui` or the bonded icon set. */
    markup: string
  }
</script>

<script lang="ts">
  let { markup }: MarkupProps = $props()
</script>

{@html markup}
