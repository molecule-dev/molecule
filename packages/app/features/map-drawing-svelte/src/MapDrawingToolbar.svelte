<!--
  MapDrawingToolbar: the Svelte counterpart of
  `@molecule/app-map-drawing-react`'s `MapDrawingToolbar` — one button per
  drawing tool plus the select, cancel-draft and delete actions. Same props
  (React names), same ClassMap classes, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { DrawingTool, MapDrawingToolbarProps } from './types.js'

  let {
    tools,
    activeTool,
    onActiveToolChange,
    onDeleteSelected,
    hasSelection,
    hasDraft,
    onCancelDraft,
  }: MapDrawingToolbarProps = $props()

  const cm = getClassMap()
  const { t } = useTranslation()

  /**
   * The translated label of one drawing tool (a literal key per tool, so the
   * i18n gate sees every key).
   *
   * @param tool - The tool.
   * @returns The translated label.
   */
  function toolLabel(tool: DrawingTool): string {
    switch (tool) {
      case 'polygon':
        return t('mapDrawing.tool.polygon', {}, { defaultValue: 'Polygon' })
      case 'circle':
        return t('mapDrawing.tool.circle', {}, { defaultValue: 'Circle' })
      case 'pin':
        return t('mapDrawing.tool.pin', {}, { defaultValue: 'Pin' })
      case 'line':
        return t('mapDrawing.tool.line', {}, { defaultValue: 'Line' })
    }
  }
</script>

<div
  role="toolbar"
  aria-label={t('mapDrawing.toolbar.aria', {}, { defaultValue: 'Map drawing tools' })}
  data-mol-id="map-drawing-toolbar"
  class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.sp('p', 1))}
>
  {#each tools as tool (tool)}
    <button
      type="button"
      aria-pressed={activeTool === tool ? 'true' : 'false'}
      data-mol-id={`map-drawing-tool-${tool}`}
      data-active={activeTool === tool ? 'true' : 'false'}
      onclick={() => onActiveToolChange(tool)}
      class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
    >
      {toolLabel(tool)}
    </button>
  {/each}
  <button
    type="button"
    aria-pressed={activeTool === 'select' ? 'true' : 'false'}
    data-mol-id="map-drawing-tool-select"
    data-active={activeTool === 'select' ? 'true' : 'false'}
    onclick={() => onActiveToolChange('select')}
    class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
  >
    {t('mapDrawing.tool.select', {}, { defaultValue: 'Select' })}
  </button>
  <button
    type="button"
    data-mol-id="map-drawing-tool-cancel-draft"
    disabled={!hasDraft}
    aria-disabled={hasDraft ? 'false' : 'true'}
    onclick={onCancelDraft}
    class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
  >
    {t('mapDrawing.tool.cancelDraft', {}, { defaultValue: 'Cancel draft' })}
  </button>
  <button
    type="button"
    data-mol-id="map-drawing-tool-delete"
    disabled={!hasSelection}
    aria-disabled={hasSelection ? 'false' : 'true'}
    onclick={onDeleteSelected}
    class={cm.cn(cm.button({ variant: 'ghost', size: 'sm' }))}
  >
    {t('mapDrawing.tool.delete', {}, { defaultValue: 'Delete' })}
  </button>
</div>
