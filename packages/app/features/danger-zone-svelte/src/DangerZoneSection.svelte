<!--
  DangerZoneSection: the Svelte counterpart of
  `@molecule/app-danger-zone-react`'s `DangerZoneSection` — a Card-wrapped
  section for destructive actions (delete account, reset data, revoke
  access): the title, the description, optional extra content and the action
  button on the right (error/danger accent). Same props, same DOM for the
  same input; while `loading` is true the button disables and shows a
  loading glyph.

  The template's whitespace is deliberate: every element sits on its own
  line with no whitespace-only text between siblings React does not render,
  and the labels render through the `node` snippet, which passes a plain
  string through verbatim and renders a snippet's nodes.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Card } from '@molecule/app-ui-svelte'

  import type { ReactNodeProp } from './node-prop.js'
  import type { DangerZoneSectionProps } from './types.js'

  let {
    title,
    description,
    actionLabel,
    onAction,
    loading = false,
    disabled = false,
    children,
    className,
    dataMolId,
  }: DangerZoneSectionProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value()}{:else}{value ?? ''}{/if}
{/snippet}

<Card {className} data-mol-id={dataMolId}>
  <div class={cm.stack(3)}>
    <header class={cm.stack(1)}>
      <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{@render node(title)}</h3>
      <p class={cm.textSize('sm')}>{@render node(description)}</p>
    </header>
    {@render children?.()}
    <div class={cm.flex({ justify: 'end' })}>
      <Button variant="solid" color="error" disabled={disabled || loading} onClick={onAction}>
        {#if loading}…{:else}{@render node(actionLabel)}{/if}
      </Button>
    </div>
  </div>
</Card>
