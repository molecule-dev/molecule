/**
 * Vue multi-effect rack, rendered with `h()` so the component stays a plain
 * `.ts` module.
 *
 * Vue counterpart of `@molecule/app-feature-audio-effects-rack-react`'s
 * `AudioEffectsRack` — the same props (React names), the same ClassMap classes
 * and inline styles, and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type {
  AudioEffectsRackProps,
  Effect,
  EffectChangePatch,
  EffectKind,
  EffectParamSchema,
} from './types.js'

/** The translate function the label helpers call (React's `t`). */
type Translate = (key: string, values?: InterpolationValues, options?: TranslateOptions) => string

/** Ordered list of every effect kind the rack supports. */
export const EFFECT_KINDS: readonly EffectKind[] = [
  'eq',
  'compressor',
  'reverb',
  'delay',
  'distortion',
  'gate',
  'limiter',
  'chorus',
  'flanger',
  'phaser',
] as const

/**
 * Default parameter schemas for the built-in effect kinds. Each entry
 * is a small, opinionated set of knobs that maps onto common DSP
 * controls — values are normalized into ranges that are easy to wire
 * to engines like Tone.js without further mapping.
 */
export const EFFECT_PARAM_SCHEMAS: Record<EffectKind, readonly EffectParamSchema[]> = {
  eq: [
    { id: 'low', min: -24, max: 24, step: 0.5, default: 0 },
    { id: 'mid', min: -24, max: 24, step: 0.5, default: 0 },
    { id: 'high', min: -24, max: 24, step: 0.5, default: 0 },
  ],
  compressor: [
    { id: 'threshold', min: -60, max: 0, step: 0.5, default: -24 },
    { id: 'ratio', min: 1, max: 20, step: 0.1, default: 4 },
    { id: 'attack', min: 0, max: 1, step: 0.001, default: 0.003 },
    { id: 'release', min: 0, max: 1, step: 0.001, default: 0.25 },
  ],
  reverb: [
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 0.3 },
    { id: 'decay', min: 0.1, max: 10, step: 0.1, default: 2 },
    { id: 'predelay', min: 0, max: 0.5, step: 0.001, default: 0.01 },
  ],
  delay: [
    { id: 'time', min: 0, max: 2, step: 0.001, default: 0.25 },
    { id: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.4 },
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 0.3 },
  ],
  distortion: [
    { id: 'drive', min: 0, max: 1, step: 0.01, default: 0.4 },
    { id: 'tone', min: 0, max: 1, step: 0.01, default: 0.5 },
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 1 },
  ],
  gate: [
    { id: 'threshold', min: -80, max: 0, step: 0.5, default: -40 },
    { id: 'attack', min: 0, max: 1, step: 0.001, default: 0.005 },
    { id: 'release', min: 0, max: 1, step: 0.001, default: 0.1 },
  ],
  limiter: [
    { id: 'threshold', min: -24, max: 0, step: 0.5, default: -1 },
    { id: 'release', min: 0, max: 1, step: 0.001, default: 0.05 },
  ],
  chorus: [
    { id: 'rate', min: 0.1, max: 10, step: 0.1, default: 1.5 },
    { id: 'depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    { id: 'mix', min: 0, max: 1, step: 0.01, default: 0.5 },
  ],
  flanger: [
    { id: 'rate', min: 0.1, max: 10, step: 0.1, default: 0.5 },
    { id: 'depth', min: 0, max: 1, step: 0.01, default: 0.6 },
    { id: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.5 },
  ],
  phaser: [
    { id: 'rate', min: 0.1, max: 10, step: 0.1, default: 0.5 },
    { id: 'depth', min: 0, max: 1, step: 0.01, default: 0.5 },
    { id: 'feedback', min: 0, max: 0.95, step: 0.01, default: 0.4 },
  ],
}

/**
 * Resolve the current value of a param on an effect, falling back to
 * the schema default when the effect's `params` map is missing the
 * key. Out-of-range / non-finite values are clamped into `[min, max]`.
 *
 * @param effect - The effect whose param to read.
 * @param schema - The schema entry describing the param.
 * @returns The clamped current value (or the schema default).
 */
export function resolveParamValue(effect: Effect, schema: EffectParamSchema): number {
  const raw = effect.params[schema.id]
  const next = typeof raw === 'number' && Number.isFinite(raw) ? raw : schema.default
  if (next < schema.min) return schema.min
  if (next > schema.max) return schema.max
  return next
}

/**
 * Reorder a list of effects by moving the entry at `fromIndex` to
 * `toIndex`. Returns a new array; the input is never mutated. Indices
 * outside the array bounds are clamped, so reorder-from-drop logic
 * doesn't have to worry about edge cases.
 *
 * @param effects - The original ordering.
 * @param fromIndex - Index of the effect being moved.
 * @param toIndex - Target index after the move.
 * @returns A new array with the effect moved into position.
 */
export function reorderEffects(effects: Effect[], fromIndex: number, toIndex: number): Effect[] {
  if (effects.length === 0) return effects
  const clampedFrom = Math.max(0, Math.min(effects.length - 1, fromIndex))
  const clampedTo = Math.max(0, Math.min(effects.length - 1, toIndex))
  if (clampedFrom === clampedTo) return effects
  const next = effects.slice()
  const [moved] = next.splice(clampedFrom, 1)
  next.splice(clampedTo, 0, moved!)
  return next
}

/**
 * Localized label for an effect kind — one literal key per kind in the
 * closed `EffectKind` union, so the i18n gate can verify every key this
 * call can produce exists in the locale bond.
 *
 * @param t - The binding's translate function.
 * @param kind - The effect kind.
 * @returns The localized kind label.
 */
function kindLabelOf(t: Translate, kind: EffectKind): string {
  switch (kind) {
    case 'eq':
      return t('audioEffectsRack.kind.eq', {}, { defaultValue: 'EQ' })
    case 'compressor':
      return t('audioEffectsRack.kind.compressor', {}, { defaultValue: 'Compressor' })
    case 'reverb':
      return t('audioEffectsRack.kind.reverb', {}, { defaultValue: 'Reverb' })
    case 'delay':
      return t('audioEffectsRack.kind.delay', {}, { defaultValue: 'Delay' })
    case 'distortion':
      return t('audioEffectsRack.kind.distortion', {}, { defaultValue: 'Distortion' })
    case 'gate':
      return t('audioEffectsRack.kind.gate', {}, { defaultValue: 'Gate' })
    case 'limiter':
      return t('audioEffectsRack.kind.limiter', {}, { defaultValue: 'Limiter' })
    case 'chorus':
      return t('audioEffectsRack.kind.chorus', {}, { defaultValue: 'Chorus' })
    case 'flanger':
      return t('audioEffectsRack.kind.flanger', {}, { defaultValue: 'Flanger' })
    case 'phaser':
      return t('audioEffectsRack.kind.phaser', {}, { defaultValue: 'Phaser' })
  }
}

/**
 * Localized label for one param of one effect kind — one literal key per
 * known (kind, param) pair from `EFFECT_PARAM_SCHEMAS`. A param id
 * outside the built-in schemas falls back to one literal catch-all key
 * (never a runtime-built key).
 *
 * @param t - The binding's translate function.
 * @param kind - The effect kind.
 * @param paramId - The param id.
 * @returns The localized param label.
 */
function paramLabelOf(t: Translate, kind: EffectKind, paramId: string): string {
  switch (kind) {
    case 'eq':
      switch (paramId) {
        case 'low':
          return t('audioEffectsRack.param.eq.low', {}, { defaultValue: 'Low' })
        case 'mid':
          return t('audioEffectsRack.param.eq.mid', {}, { defaultValue: 'Mid' })
        case 'high':
          return t('audioEffectsRack.param.eq.high', {}, { defaultValue: 'High' })
      }
      break
    case 'compressor':
      switch (paramId) {
        case 'threshold':
          return t('audioEffectsRack.param.compressor.threshold', {}, { defaultValue: 'Threshold' })
        case 'ratio':
          return t('audioEffectsRack.param.compressor.ratio', {}, { defaultValue: 'Ratio' })
        case 'attack':
          return t('audioEffectsRack.param.compressor.attack', {}, { defaultValue: 'Attack' })
        case 'release':
          return t('audioEffectsRack.param.compressor.release', {}, { defaultValue: 'Release' })
      }
      break
    case 'reverb':
      switch (paramId) {
        case 'mix':
          return t('audioEffectsRack.param.reverb.mix', {}, { defaultValue: 'Mix' })
        case 'decay':
          return t('audioEffectsRack.param.reverb.decay', {}, { defaultValue: 'Decay' })
        case 'predelay':
          return t('audioEffectsRack.param.reverb.predelay', {}, { defaultValue: 'Pre-delay' })
      }
      break
    case 'delay':
      switch (paramId) {
        case 'time':
          return t('audioEffectsRack.param.delay.time', {}, { defaultValue: 'Time' })
        case 'feedback':
          return t('audioEffectsRack.param.delay.feedback', {}, { defaultValue: 'Feedback' })
        case 'mix':
          return t('audioEffectsRack.param.delay.mix', {}, { defaultValue: 'Mix' })
      }
      break
    case 'distortion':
      switch (paramId) {
        case 'drive':
          return t('audioEffectsRack.param.distortion.drive', {}, { defaultValue: 'Drive' })
        case 'tone':
          return t('audioEffectsRack.param.distortion.tone', {}, { defaultValue: 'Tone' })
        case 'mix':
          return t('audioEffectsRack.param.distortion.mix', {}, { defaultValue: 'Mix' })
      }
      break
    case 'gate':
      switch (paramId) {
        case 'threshold':
          return t('audioEffectsRack.param.gate.threshold', {}, { defaultValue: 'Threshold' })
        case 'attack':
          return t('audioEffectsRack.param.gate.attack', {}, { defaultValue: 'Attack' })
        case 'release':
          return t('audioEffectsRack.param.gate.release', {}, { defaultValue: 'Release' })
      }
      break
    case 'limiter':
      switch (paramId) {
        case 'threshold':
          return t('audioEffectsRack.param.limiter.threshold', {}, { defaultValue: 'Threshold' })
        case 'release':
          return t('audioEffectsRack.param.limiter.release', {}, { defaultValue: 'Release' })
      }
      break
    case 'chorus':
      switch (paramId) {
        case 'rate':
          return t('audioEffectsRack.param.chorus.rate', {}, { defaultValue: 'Rate' })
        case 'depth':
          return t('audioEffectsRack.param.chorus.depth', {}, { defaultValue: 'Depth' })
        case 'mix':
          return t('audioEffectsRack.param.chorus.mix', {}, { defaultValue: 'Mix' })
      }
      break
    case 'flanger':
      switch (paramId) {
        case 'rate':
          return t('audioEffectsRack.param.flanger.rate', {}, { defaultValue: 'Rate' })
        case 'depth':
          return t('audioEffectsRack.param.flanger.depth', {}, { defaultValue: 'Depth' })
        case 'feedback':
          return t('audioEffectsRack.param.flanger.feedback', {}, { defaultValue: 'Feedback' })
      }
      break
    case 'phaser':
      switch (paramId) {
        case 'rate':
          return t('audioEffectsRack.param.phaser.rate', {}, { defaultValue: 'Rate' })
        case 'depth':
          return t('audioEffectsRack.param.phaser.depth', {}, { defaultValue: 'Depth' })
        case 'feedback':
          return t('audioEffectsRack.param.phaser.feedback', {}, { defaultValue: 'Feedback' })
      }
      break
  }
  return t('audioEffectsRack.param.fallback', {}, { defaultValue: 'Parameter' })
}

/** Everything one effect panel needs to render (React's `EffectPanelProps`). */
interface PanelOptions {
  /** The effect this panel shows. */
  effect: Effect
  /** Position of the effect in the chain. */
  index: number
  /** Whether this panel is being dragged. */
  isDragging: boolean
  /** Whether this panel is the current drop target. */
  isOverTarget: boolean
  /** Translated kind label. */
  kindLabel: string
  /** Translated bypass button label. */
  bypassLabel: string
  /** Translated remove button label. */
  removeLabel: string
  /** Translated drag-handle label. */
  dragHandleLabel: string
  /** Localized label for one param id of this effect's kind. */
  paramLabelFor: (paramId: string) => string
  /** Receives every patch this panel emits. */
  onChange?: (patch: EffectChangePatch) => void
  /** Receives a remove request. */
  onRemove?: (id: string) => void
  /** Rack drag-start handler. */
  onDragStart: (index: number, event: Event) => void
  /** Rack pointer-over-panel handler. */
  onDragOver: (index: number) => void
  /** The current class map. */
  cm: UIClassMap
}

/**
 * Single effect panel — drag handle, kind label, bypass toggle, param slider
 * grid, remove button. Internal building block of `AudioEffectsRack`.
 *
 * @param options - The panel's effect, labels, callbacks and class map.
 * @returns The panel vnode.
 */
function renderPanel(options: PanelOptions): VNode {
  const {
    effect,
    index,
    isDragging,
    isOverTarget,
    kindLabel,
    bypassLabel,
    removeLabel,
    dragHandleLabel,
    paramLabelFor,
    onChange,
    onRemove,
    onDragStart,
    onDragOver,
    cm,
  } = options

  const schema = EFFECT_PARAM_SCHEMAS[effect.kind] ?? []

  const panelStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    minWidth: '180px',
    padding: '8px',
    boxSizing: 'border-box',
    border: '1px solid currentColor',
    borderRadius: '4px',
    opacity: effect.enabled ? 1 : 0.55,
    boxShadow: isOverTarget ? '0 0 0 2px currentColor inset' : undefined,
    transform: isDragging ? 'scale(0.98)' : undefined,
  }

  const headerStyle = { display: 'flex', alignItems: 'center', gap: '4px' }

  const bypassClass = cm.cn(
    effect.enabled
      ? cm.button({ variant: 'outline', size: 'xs' })
      : cm.button({ variant: 'solid', color: 'warning', size: 'xs' }),
    cm.touchTargetCompact,
  )
  const iconButtonClass = cm.cn(cm.button({ variant: 'ghost', size: 'icon' }), cm.touchTarget)

  /**
   * Toggles the bypass state for this effect and emits an `onChange` patch.
   *
   * @param event - The button click event.
   */
  const handleBypass = (event: Event): void => {
    event.preventDefault()
    onChange?.({ id: effect.id, enabled: !effect.enabled })
  }

  /**
   * Requests removal of this effect via the `onRemove` callback.
   *
   * @param event - The button click event.
   */
  const handleRemove = (event: Event): void => {
    event.preventDefault()
    onRemove?.(effect.id)
  }

  /**
   * Emits an `onChange` patch for one parameter slider movement, then puts the
   * input back on the controlled value as React does.
   *
   * @param param - The schema entry of the param that moved.
   * @param event - The range input's native input event.
   */
  const handleParam = (param: EffectParamSchema, event: Event): void => {
    const element = event.target as HTMLInputElement
    const next = parseFloat(element.value)
    if (Number.isFinite(next)) {
      const clamped = next < param.min ? param.min : next > param.max ? param.max : next
      onChange?.({ id: effect.id, paramId: param.id, paramValue: clamped })
    }
    element.value = String(resolveParamValue(effect, param))
  }

  /**
   * Forwards a pointer-down on the drag handle up to the rack's drag-start handler.
   *
   * @param event - The pointerdown event.
   */
  const handleDragHandlePointerDown = (event: Event): void => {
    onDragStart(index, event)
  }

  /**
   * Notifies the rack that the pointer is over this panel during a drag.
   */
  const handlePanelPointerOver = (): void => {
    onDragOver(index)
  }

  const paramNodes: VNode[] = schema.map((param) => {
    const value = resolveParamValue(effect, param)
    const ariaLabel = paramLabelFor(param.id)
    return h(
      'label',
      {
        key: param.id,
        'data-mol-id': 'audio-effects-rack-param',
        'data-param-id': param.id,
        style: { display: 'flex', flexDirection: 'column', gap: '2px' },
      },
      [
        h('span', { class: cm.cn(cm.textSize('xs')), style: { opacity: 0.7 } }, ariaLabel),
        h('input', {
          type: 'range',
          min: param.min,
          max: param.max,
          step: param.step,
          value,
          defaultValue: String(value),
          'aria-label': ariaLabel,
          'aria-valuemin': param.min,
          'aria-valuemax': param.max,
          'aria-valuenow': value,
          'data-mol-id': 'audio-effects-rack-param-input',
          'data-param-id': param.id,
          style: { width: '100%' },
          onInput: (event: Event) => handleParam(param, event),
        }),
      ],
    )
  })

  return h(
    'div',
    {
      role: 'group',
      'aria-label': kindLabel,
      'data-mol-id': 'audio-effects-rack-panel',
      'data-effect-id': effect.id,
      'data-effect-kind': effect.kind,
      'data-enabled': effect.enabled ? 'true' : 'false',
      'data-dragging': isDragging ? 'true' : 'false',
      'data-drop-target': isOverTarget ? 'true' : 'false',
      class: cm.cn(),
      style: panelStyle,
      onPointerover: handlePanelPointerOver,
    },
    [
      h('div', { 'data-mol-id': 'audio-effects-rack-panel-header', style: headerStyle }, [
        h(
          'button',
          {
            type: 'button',
            'aria-label': dragHandleLabel,
            'data-mol-id': 'audio-effects-rack-drag-handle',
            class: iconButtonClass,
            style: { cursor: 'grab' },
            onPointerdown: handleDragHandlePointerDown,
          },
          [h('span', { 'aria-hidden': 'true' }, '⋮⋮')],
        ),
        h(
          'span',
          {
            'data-mol-id': 'audio-effects-rack-panel-title',
            class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')),
            style: {
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          kindLabel,
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-label': bypassLabel,
            'aria-pressed': !effect.enabled ? 'true' : 'false',
            'data-mol-id': 'audio-effects-rack-bypass',
            class: bypassClass,
            onClick: handleBypass,
          },
          bypassLabel.charAt(0).toUpperCase(),
        ),
        h(
          'button',
          {
            type: 'button',
            'aria-label': removeLabel,
            'data-mol-id': 'audio-effects-rack-remove',
            class: iconButtonClass,
            onClick: handleRemove,
          },
          [h('span', { 'aria-hidden': 'true' }, '×')],
        ),
      ]),
      h(
        'div',
        {
          'data-mol-id': 'audio-effects-rack-params',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '4px',
          },
        },
        paramNodes,
      ),
    ],
  )
}

/**
 * Multi-effect rack — renders one panel per effect in chain order. Each panel
 * exposes a bypass toggle, a per-param slider grid, and a remove button. A
 * header dropdown lets the user add a new effect of any built-in kind.
 * Drag-to-reorder is implemented via native pointer events — pick up a panel by
 * its drag handle, drop it before/after another panel, and `onReorder` fires
 * with the new full ordering.
 *
 * Pure UI: callers wire the emitted change patches + reorder events back into
 * whatever audio engine they want (Tone.js, the Web Audio API, native
 * `AudioContext`, etc.). Styling routes through `getClassMap()` from
 * `@molecule/app-ui` and all user-visible text routes through `t()` via the
 * companion locale bond `@molecule/app-locales-feature-audio-effects-rack`.
 *
 * @param props - Component props (see {@link AudioEffectsRackProps}).
 * @returns The rack component.
 */
export const AudioEffectsRack = defineComponent({
  name: 'AudioEffectsRack',
  props: {
    effects: {
      type: Array as PropType<Effect[]>,
      required: true,
    },
    onChange: {
      type: Function as PropType<AudioEffectsRackProps['onChange']>,
      default: undefined,
    },
    onReorder: {
      type: Function as PropType<AudioEffectsRackProps['onReorder']>,
      default: undefined,
    },
    onAdd: {
      type: Function as PropType<AudioEffectsRackProps['onAdd']>,
      default: undefined,
    },
    onRemove: {
      type: Function as PropType<AudioEffectsRackProps['onRemove']>,
      default: undefined,
    },
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // Which panel (if any) is currently being dragged; only the index is
    // stored — the re-order is computed against the latest `effects` prop on
    // drop, exactly as React does.
    const dragIndex = ref<number | null>(null)
    const overIndex = ref<number | null>(null)
    // The latest pointer-event target index, kept outside the reactive state
    // so a move doesn't re-render before the drop.
    let dragRef: { from: number | null; over: number | null } = { from: null, over: null }

    /**
     * Picks up the panel at `index`.
     *
     * @param index - The panel's index.
     * @param event - The pointerdown event.
     */
    const handlePointerDown = (index: number, event: Event): void => {
      event.preventDefault()
      dragIndex.value = index
      overIndex.value = index
      dragRef = { from: index, over: index }
    }

    /**
     * Marks the panel at `index` as the drop target while a drag is in progress.
     *
     * @param index - The panel's index.
     */
    const handlePointerEnter = (index: number): void => {
      if (dragRef.from === null) return
      dragRef.over = index
      overIndex.value = index
    }

    /**
     * Drops the drag (pointer up or cancel) and emits the new order when the
     * panel moved.
     */
    const handlePointerUp = (): void => {
      const { from, over } = dragRef
      dragRef = { from: null, over: null }
      dragIndex.value = null
      overIndex.value = null
      if (from === null || over === null || from === over) return
      props.onReorder?.(reorderEffects(props.effects, from, over))
    }

    /**
     * Reads the chosen effect kind from the add dropdown, resets it to the
     * placeholder and emits `onAdd`.
     *
     * @param event - The select's native change event.
     */
    const handleAdd = (event: Event): void => {
      const element = event.target as HTMLSelectElement
      const value = element.value
      if (!value) return
      // Reset back to the placeholder so the user can pick the same kind twice
      // in a row without un-selecting first.
      element.value = ''
      if ((EFFECT_KINDS as readonly string[]).includes(value)) {
        props.onAdd?.(value as EffectKind)
      }
    }

    return (): VNode => {
      const rackLabel = t('audioEffectsRack.aria.rack', {}, { defaultValue: 'Audio effects rack' })
      const addLabel = t('audioEffectsRack.button.add', {}, { defaultValue: 'Add effect' })
      const addPlaceholder = t(
        'audioEffectsRack.button.addPlaceholder',
        {},
        { defaultValue: 'Add effect…' },
      )
      const removeLabel = t('audioEffectsRack.button.remove', {}, { defaultValue: 'Remove effect' })
      const bypassLabel = t('audioEffectsRack.button.bypass', {}, { defaultValue: 'Bypass' })
      const dragHandleLabel = t(
        'audioEffectsRack.aria.dragHandle',
        {},
        { defaultValue: 'Drag to reorder' },
      )
      const emptyLabel = t(
        'audioEffectsRack.empty',
        {},
        { defaultValue: 'No effects in chain — add one to get started.' },
      )

      const kindLabel = (kind: EffectKind): string => kindLabelOf(t, kind)
      const paramLabelFor =
        (kind: EffectKind) =>
        (paramId: string): string =>
          paramLabelOf(t, kind, paramId)

      const options: VNodeChild[] = EFFECT_KINDS.map((kind) =>
        h('option', { key: kind, value: kind }, kindLabel(kind)),
      )

      const selectNode = h(
        'select',
        {
          'aria-label': addLabel,
          'data-mol-id': 'audio-effects-rack-add-select',
          onChange: handleAdd,
          style: {
            fontSize: '12px',
            padding: '4px 6px',
            borderRadius: '4px',
            border: '1px solid currentColor',
            background: 'transparent',
            color: 'inherit',
          },
        },
        [
          h('option', { value: '', disabled: true, defaultSelected: true }, addPlaceholder),
          ...options,
        ],
      )

      const header = h(
        'div',
        {
          'data-mol-id': 'audio-effects-rack-header',
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          },
        },
        [
          h(
            'span',
            {
              'data-mol-id': 'audio-effects-rack-title',
              class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
            },
            rackLabel,
          ),
          h(
            'label',
            {
              'data-mol-id': 'audio-effects-rack-add',
              style: { display: 'flex', alignItems: 'center', gap: '4px' },
            },
            [
              h('span', { class: cm.cn(cm.textSize('xs')), style: { opacity: 0.7 } }, addLabel),
              selectNode,
            ],
          ),
        ],
      )

      const body: VNode =
        props.effects.length === 0
          ? h(
              'div',
              {
                'data-mol-id': 'audio-effects-rack-empty',
                class: cm.cn(cm.textSize('xs')),
                style: { opacity: 0.6, padding: '8px' },
              },
              emptyLabel,
            )
          : h(
              'div',
              {
                'data-mol-id': 'audio-effects-rack-chain',
                style: {
                  display: 'flex',
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'stretch',
                  gap: '8px',
                },
              },
              props.effects.map((effect, index) =>
                renderPanel({
                  effect,
                  index,
                  isDragging: dragIndex.value === index,
                  isOverTarget:
                    overIndex.value === index &&
                    dragIndex.value !== null &&
                    dragIndex.value !== index,
                  kindLabel: kindLabel(effect.kind),
                  bypassLabel,
                  removeLabel,
                  dragHandleLabel,
                  paramLabelFor: paramLabelFor(effect.kind),
                  onChange: props.onChange,
                  onRemove: props.onRemove,
                  onDragStart: handlePointerDown,
                  onDragOver: handlePointerEnter,
                  cm,
                }),
              ),
            )

      return h(
        'div',
        {
          role: 'group',
          'aria-label': rackLabel,
          'data-mol-id': 'audio-effects-rack',
          class: cm.cn(props.className),
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            userSelect: 'none',
          },
          onPointerup: handlePointerUp,
          onPointercancel: handlePointerUp,
        },
        [header, body],
      )
    }
  },
})
