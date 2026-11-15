<!--
  DrawingToolbar: the Svelte counterpart of
  `@molecule/app-drawing-toolbar-react`'s `DrawingToolbar` — the same props
  (React names), the same DOM for the same input. Renders a `role="toolbar"`
  row/column of tool buttons and, after them, the caller's `extras` snippet.
  React keys each tool button by the tool's `id`; the keyed `{#each}` keeps the
  rendered buttons per key the same way.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { DrawingTool, DrawingToolbarProps } from './types.js'

  /** The standard tool set React renders when the `tools` prop is omitted. */
  const DEFAULT_TOOLS: DrawingTool[] = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'ellipse', label: 'Ellipse', icon: '◯' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'sticky', label: 'Sticky', icon: '🗒' },
    { id: 'pen', label: 'Pen', icon: '✎' },
    { id: 'eraser', label: 'Eraser', icon: '⌫' },
  ]

  let {
    tools = DEFAULT_TOOLS,
    selectedId,
    onSelect,
    extras,
    orientation = 'horizontal',
    className,
  }: DrawingToolbarProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(
    orientation === 'vertical' ? cm.stack(1) : cm.flex({ align: 'center', gap: 'xs' }),
    className,
  )}
  role="toolbar"
  aria-label={t('drawingToolbar.label', {}, { defaultValue: 'Drawing tools' })}
>
  {#each tools as tl (tl.id)}
    <Button
      variant={tl.id === selectedId ? 'solid' : 'ghost'}
      color={tl.id === selectedId ? 'primary' : undefined}
      size="sm"
      onClick={() => onSelect?.(tl.id)}
      aria-pressed={tl.id === selectedId}
      aria-label={tl.label}
      title={tl.label}
    >
      {#if typeof tl.icon === 'function'}{@render tl.icon()}{:else if tl.icon != null}{tl.icon}{:else}{tl
          .label[0] ?? ''}{/if}
    </Button>
  {/each}
  {#if typeof extras === 'function'}{@render extras()}{:else if extras != null}{extras}{/if}
</div>
