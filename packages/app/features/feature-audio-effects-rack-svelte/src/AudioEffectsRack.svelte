<!--
  AudioEffectsRack: the Svelte counterpart of
  `@molecule/app-feature-audio-effects-rack-react`'s `AudioEffectsRack` — a chain
  of effect panels with a bypass toggle, per-param slider grid, drag-to-reorder
  via pointer events, an add-effect dropdown and a per-panel remove button. Same
  props (React names), same DOM for the same input, same callbacks; every visible
  string comes from `useTranslation()` so a locale switch re-renders it.

  The template's whitespace is deliberate: every element sits adjacent to the
  next with no whitespace-only text between siblings React does not render.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { kindLabel, paramLabel } from './labels.js'
  import { rangeValue } from './range-value.js'
  import type { AudioEffectsRackProps, Effect, EffectParamSchema } from './types.js'
  import {
    EFFECT_KINDS,
    EFFECT_PARAM_SCHEMAS,
    reorderEffects,
    resolveParamValue,
  } from './utilities.js'

  let { effects, onChange, onReorder, onAdd, onRemove, className }: AudioEffectsRackProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** Which panel (if any) is currently being dragged. */
  let dragIndex = $state<number | null>(null)
  /** Which panel is the current drop target. */
  let overIndex = $state<number | null>(null)
  /** The latest pointer-event target index, kept outside the reactive state. */
  let dragRef: { from: number | null; over: number | null } = { from: null, over: null }

  /**
   * Picks up the panel at `index`.
   *
   * @param index - The panel's index.
   * @param event - The pointerdown event.
   */
  function handlePointerDown(index: number, event: PointerEvent): void {
    event.preventDefault()
    dragIndex = index
    overIndex = index
    dragRef = { from: index, over: index }
  }

  /**
   * Marks the panel at `index` as the drop target while a drag is in progress.
   *
   * @param index - The panel's index.
   */
  function handlePointerEnter(index: number): void {
    if (dragRef.from === null) return
    dragRef.over = index
    overIndex = index
  }

  /** Drops the drag (pointer up or cancel) and emits the new order when the panel moved. */
  function handlePointerUp(): void {
    const { from, over } = dragRef
    dragRef = { from: null, over: null }
    dragIndex = null
    overIndex = null
    if (from === null || over === null || from === over) return
    onReorder?.(reorderEffects(effects, from, over))
  }

  /**
   * Reads the chosen effect kind from the add dropdown, resets it to the
   * placeholder and emits `onAdd`.
   *
   * @param event - The select's native change event.
   */
  function handleAdd(event: Event): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLSelectElement)) return
    const value = element.value
    // Reset back to the placeholder so the user can pick the same kind twice in a
    // row without un-selecting first.
    element.value = ''
    const kind = EFFECT_KINDS.find((effectKind) => effectKind === value)
    if (kind) onAdd?.(kind)
  }

  /**
   * Toggles the bypass state for one effect and emits an `onChange` patch.
   *
   * @param effect - The effect whose toggle was clicked.
   * @param event - The button click event.
   */
  function handleBypass(effect: Effect, event: MouseEvent): void {
    event.preventDefault()
    onChange?.({ id: effect.id, enabled: !effect.enabled })
  }

  /**
   * Requests removal of one effect via the `onRemove` callback.
   *
   * @param effect - The effect to remove.
   * @param event - The button click event.
   */
  function handleRemove(effect: Effect, event: MouseEvent): void {
    event.preventDefault()
    onRemove?.(effect.id)
  }

  /**
   * Emits an `onChange` patch for one parameter slider movement, then puts the
   * input back on the controlled value as React does.
   *
   * @param effect - The effect whose param moved.
   * @param param - The schema entry of the param that moved.
   * @param event - The range input's native input event.
   */
  function handleParam(effect: Effect, param: EffectParamSchema, event: Event): void {
    const element = event.currentTarget as HTMLInputElement
    const next = parseFloat(element.value)
    if (Number.isFinite(next)) {
      const clamped = next < param.min ? param.min : next > param.max ? param.max : next
      onChange?.({ id: effect.id, paramId: param.id, paramValue: clamped })
    }
    const current = resolveParamValue(effect, param)
    element.value = String(current)
    element.defaultValue = String(current)
  }

  /**
   * One panel's inline style (React's `panelStyle`), including the drag and
   * drop-target decorations.
   *
   * @param effect - The effect the panel shows.
   * @param index - The panel's index.
   * @returns The style declarations.
   */
  function panelStyle(effect: Effect, index: number): string {
    const isDragging = dragIndex === index
    const isOverTarget = overIndex === index && dragIndex !== null && dragIndex !== index
    const declarations = [
      'display: flex',
      'flex-direction: column',
      'gap: 6px',
      'min-width: 180px',
      'padding: 8px',
      'box-sizing: border-box',
      'border: 1px solid',
      'border-radius: 4px',
      `opacity: ${effect.enabled ? 1 : 0.55}`,
    ]
    if (isOverTarget) declarations.push('box-shadow: 0 0 0 2px currentColor inset')
    if (isDragging) declarations.push('transform: scale(0.98)')
    return declarations.join('; ')
  }

  /**
   * The bypass toggle's classes: outline when live, solid warning when bypassed.
   *
   * @param effect - The effect the panel shows.
   * @returns The class string.
   */
  function bypassClass(effect: Effect): string {
    return cm.cn(
      effect.enabled
        ? cm.button({ variant: 'outline', size: 'xs' })
        : cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
      cm.touchTargetCompact,
    )
  }

  /** The drag-handle and remove buttons' icon-only classes. */
  const iconButtonClass = $derived(
    cm.cn(cm.button({ variant: 'ghost', size: 'icon' }), cm.touchTarget),
  )
</script>

<div
  role="group"
  aria-label={t('audioEffectsRack.aria.rack', {}, { defaultValue: 'Audio effects rack' })}
  data-mol-id="audio-effects-rack"
  class={cm.cn(className)}
  style="display: flex; flex-direction: column; gap: 8px; user-select: none"
  onpointerup={handlePointerUp}
  onpointercancel={handlePointerUp}
>
  <div
    data-mol-id="audio-effects-rack-header"
    style="display: flex; align-items: center; justify-content: space-between; gap: 8px"
  >
    <span
      data-mol-id="audio-effects-rack-title"
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
      >{t('audioEffectsRack.aria.rack', {}, { defaultValue: 'Audio effects rack' })}</span
    ><label
      data-mol-id="audio-effects-rack-add"
      style="display: flex; align-items: center; gap: 4px"
    >
      <span class={cm.cn(cm.textSize('xs'))} style="opacity: 0.7"
        >{t('audioEffectsRack.button.add', {}, { defaultValue: 'Add effect' })}</span
      ><select
        aria-label={t('audioEffectsRack.button.add', {}, { defaultValue: 'Add effect' })}
        data-mol-id="audio-effects-rack-add-select"
        onchange={handleAdd}
        style="font-size: 12px; padding: 4px 6px; border-radius: 4px; border: 1px solid; background: transparent; color: inherit"
      >
        <option value="" disabled selected
          >{t(
            'audioEffectsRack.button.addPlaceholder',
            {},
            { defaultValue: 'Add effect…' },
          )}</option
        >{#each EFFECT_KINDS as kind (kind)}<option value={kind}>{kindLabel(t, kind)}</option
          >{/each}
      </select>
    </label>
  </div>
  {#if effects.length === 0}<div
      data-mol-id="audio-effects-rack-empty"
      class={cm.cn(cm.textSize('xs'))}
      style="opacity: 0.6; padding: 8px"
    >
      {t(
        'audioEffectsRack.empty',
        {},
        {
          defaultValue: 'No effects in chain — add one to get started.',
        },
      )}
    </div>{:else}<div
      data-mol-id="audio-effects-rack-chain"
      style="display: flex; flex-direction: row; flex-wrap: wrap; align-items: stretch; gap: 8px"
    >
      {#each effects as effect, index (effect.id)}<div
          role="group"
          aria-label={kindLabel(t, effect.kind)}
          data-mol-id="audio-effects-rack-panel"
          data-effect-id={effect.id}
          data-effect-kind={effect.kind}
          data-enabled={effect.enabled ? 'true' : 'false'}
          data-dragging={dragIndex === index ? 'true' : 'false'}
          data-drop-target={overIndex === index && dragIndex !== null && dragIndex !== index
            ? 'true'
            : 'false'}
          class={cm.cn()}
          style={panelStyle(effect, index)}
          onpointerover={() => handlePointerEnter(index)}
        >
          <div
            data-mol-id="audio-effects-rack-panel-header"
            style="display: flex; align-items: center; gap: 4px"
          >
            <button
              type="button"
              aria-label={t(
                'audioEffectsRack.aria.dragHandle',
                {},
                {
                  defaultValue: 'Drag to reorder',
                },
              )}
              data-mol-id="audio-effects-rack-drag-handle"
              class={iconButtonClass}
              style="cursor: grab"
              onpointerdown={(event) => handlePointerDown(index, event)}
              ><span aria-hidden="true">⋮⋮</span></button
            ><span
              data-mol-id="audio-effects-rack-panel-title"
              class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
              style="flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap"
              >{kindLabel(t, effect.kind)}</span
            ><button
              type="button"
              aria-label={t('audioEffectsRack.button.bypass', {}, { defaultValue: 'Bypass' })}
              aria-pressed={!effect.enabled ? 'true' : 'false'}
              data-mol-id="audio-effects-rack-bypass"
              class={bypassClass(effect)}
              onclick={(event) => handleBypass(effect, event)}
              >{t('audioEffectsRack.button.bypass', {}, { defaultValue: 'Bypass' })
                .charAt(0)
                .toUpperCase()}</button
            ><button
              type="button"
              aria-label={t(
                'audioEffectsRack.button.remove',
                {},
                {
                  defaultValue: 'Remove effect',
                },
              )}
              data-mol-id="audio-effects-rack-remove"
              class={iconButtonClass}
              onclick={(event) => handleRemove(effect, event)}
              ><span aria-hidden="true">×</span></button
            >
          </div>
          <div
            data-mol-id="audio-effects-rack-params"
            style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px"
          >
            {#each EFFECT_PARAM_SCHEMAS[effect.kind] ?? [] as param (param.id)}<label
                data-mol-id="audio-effects-rack-param"
                data-param-id={param.id}
                style="display: flex; flex-direction: column; gap: 2px"
              >
                <span class={cm.cn(cm.textSize('xs'))} style="opacity: 0.7"
                  >{paramLabel(t, effect.kind, param.id)}</span
                ><input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  use:rangeValue={resolveParamValue(effect, param)}
                  aria-label={paramLabel(t, effect.kind, param.id)}
                  aria-valuemin={param.min}
                  aria-valuemax={param.max}
                  aria-valuenow={resolveParamValue(effect, param)}
                  data-mol-id="audio-effects-rack-param-input"
                  data-param-id={param.id}
                  style="width: 100%"
                  oninput={(event) => handleParam(effect, param, event)}
                />
              </label>{/each}
          </div>
        </div>{/each}
    </div>{/if}
</div>
