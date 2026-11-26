/**
 * Solid multi-effect rack.
 *
 * Solid counterpart of `@molecule/app-feature-audio-effects-rack-react`'s
 * `AudioEffectsRack` — the same props (React names), the same ClassMap classes
 * and inline styles, and the same DOM for the same input.
 *
 * @module
 */

import { createEffect, createSignal, type JSX } from 'solid-js'

import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type {
  AudioEffectsRackProps,
  Effect,
  EffectChangePatch,
  EffectKind,
  EffectParamSchema,
} from './types.js'

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

/** The translate function the label helpers call (React's `t`). */
type Translate = (key: string, values?: InterpolationValues, options?: TranslateOptions) => string

/**
 * Apply React's controlled `value` to a native range input: the live property
 * AND the `value` attribute (its `defaultValue`), so a fresh element and a
 * re-rendered one read the same.
 *
 * @param element - The range input.
 * @param value - The controlled value.
 */
const applyControlledValue = (element: HTMLInputElement | undefined, value: number): void => {
  if (!element) return
  const text = String(value)
  if (element.value !== text) element.value = text
  if (element.defaultValue !== text) element.defaultValue = text
}

/** One param slider's props (React's per-param node inside `EffectPanel`). */
interface ParamInputProps {
  /** The schema entry of this slider. */
  param: EffectParamSchema
  /** The effect whose value the slider shows. */
  effect: Effect
  /** The translated param label. */
  ariaLabel: string
  /** Receives every patch this slider emits. */
  onChange?: (patch: EffectChangePatch) => void
}

/**
 * One labelled param slider — the `label` > `span` + `input[type=range]` node
 * React renders for every schema entry of an effect kind.
 *
 * @param props - The slider's param, effect, label and callback.
 * @returns The labelled slider element.
 */
function ParamInput(props: ParamInputProps): JSX.Element {
  const cm = getClassMap()
  let element: HTMLInputElement | undefined

  const value = (): number => resolveParamValue(props.effect, props.param)

  // React keeps a controlled range input's live value on the prop, in the DOM
  // property AND the `value` attribute (its `defaultValue`) — at mount and
  // whenever the prop changes.
  createEffect(() => applyControlledValue(element, value()))

  /**
   * Emits an `onChange` patch for a slider movement and restores the
   * controlled value.
   *
   * @param event - The range input's native input event.
   */
  const handleInput = (event: Event): void => {
    const param = props.param
    const target = event.currentTarget as HTMLInputElement
    const next = parseFloat(target.value)
    if (Number.isFinite(next)) {
      const clamped = next < param.min ? param.min : next > param.max ? param.max : next
      props.onChange?.({ id: props.effect.id, paramId: param.id, paramValue: clamped })
    }
    applyControlledValue(element, value())
  }

  return (
    <label
      data-mol-id="audio-effects-rack-param"
      data-param-id={props.param.id}
      style={{ display: 'flex', 'flex-direction': 'column', gap: '2px' }}
    >
      <span class={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7 }}>
        {props.ariaLabel}
      </span>
      <input
        ref={(el) => (element = el)}
        type="range"
        min={props.param.min}
        max={props.param.max}
        step={props.param.step}
        aria-label={props.ariaLabel}
        aria-valuemin={props.param.min}
        aria-valuemax={props.param.max}
        aria-valuenow={value()}
        data-mol-id="audio-effects-rack-param-input"
        data-param-id={props.param.id}
        style={{ width: '100%' }}
        onInput={handleInput}
      />
    </label>
  )
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
  onDragStart: (index: number, event: PointerEvent) => void
  /** Rack pointer-over-panel handler. */
  onDragOver: (index: number) => void
}

/**
 * Single effect panel — drag handle, kind label, bypass toggle, param slider
 * grid, remove button. Internal building block of `AudioEffectsRack`.
 *
 * @param options - The panel's effect, labels and callbacks.
 * @returns The panel element.
 */
function EffectPanel(options: PanelOptions): JSX.Element {
  const cm = getClassMap()
  const schema = EFFECT_PARAM_SCHEMAS[options.effect.kind] ?? []

  /**
   * The panel's inline style (React's `panelStyle`), read inside the JSX so a
   * drag-state change updates it.
   *
   * @returns The style object.
   */
  const panelStyle = (): Record<string, string | number | undefined> => ({
    display: 'flex',
    'flex-direction': 'column',
    gap: '6px',
    'min-width': '180px',
    padding: '8px',
    'box-sizing': 'border-box',
    border: '1px solid',
    'border-radius': '4px',
    opacity: options.effect.enabled ? 1 : 0.55,
    'box-shadow': options.isOverTarget ? '0 0 0 2px currentColor inset' : undefined,
    transform: options.isDragging ? 'scale(0.98)' : undefined,
  })

  const headerStyle = { display: 'flex', 'align-items': 'center', gap: '4px' } as const

  /**
   * The bypass toggle's classes: outline when live, solid warning when bypassed.
   *
   * @param enabled - Whether the effect is enabled.
   * @returns The class string.
   */
  const bypassClass = (enabled: boolean): string =>
    cm.cn(
      enabled
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
  const handleBypass = (event: MouseEvent): void => {
    event.preventDefault()
    options.onChange?.({ id: options.effect.id, enabled: !options.effect.enabled })
  }

  /**
   * Requests removal of this effect via the `onRemove` callback.
   *
   * @param event - The button click event.
   */
  const handleRemove = (event: MouseEvent): void => {
    event.preventDefault()
    options.onRemove?.(options.effect.id)
  }

  /**
   * Notifies the rack that the pointer is over this panel during a drag.
   */
  const handlePanelPointerOver = (): void => {
    options.onDragOver(options.index)
  }

  return (
    <div
      role="group"
      aria-label={options.kindLabel}
      data-mol-id="audio-effects-rack-panel"
      data-effect-id={options.effect.id}
      data-effect-kind={options.effect.kind}
      data-enabled={options.effect.enabled ? 'true' : 'false'}
      data-dragging={options.isDragging ? 'true' : 'false'}
      data-drop-target={options.isOverTarget ? 'true' : 'false'}
      class={cm.cn()}
      style={panelStyle()}
      onPointerOver={handlePanelPointerOver}
    >
      <div data-mol-id="audio-effects-rack-panel-header" style={headerStyle}>
        <button
          type="button"
          aria-label={options.dragHandleLabel}
          data-mol-id="audio-effects-rack-drag-handle"
          class={iconButtonClass}
          style={{ cursor: 'grab' }}
          onPointerDown={(event) => options.onDragStart(options.index, event)}
        >
          <span aria-hidden="true">{'⋮⋮'}</span>
        </button>
        <span
          data-mol-id="audio-effects-rack-panel-title"
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          style={{
            flex: '1 1 0%',
            overflow: 'hidden',
            'text-overflow': 'ellipsis',
            'white-space': 'nowrap',
          }}
        >
          {options.kindLabel}
        </span>
        <button
          type="button"
          aria-label={options.bypassLabel}
          aria-pressed={!options.effect.enabled ? 'true' : 'false'}
          data-mol-id="audio-effects-rack-bypass"
          class={bypassClass(options.effect.enabled)}
          onClick={handleBypass}
        >
          {options.bypassLabel.charAt(0).toUpperCase()}
        </button>
        <button
          type="button"
          aria-label={options.removeLabel}
          data-mol-id="audio-effects-rack-remove"
          class={iconButtonClass}
          onClick={handleRemove}
        >
          <span aria-hidden="true">{'×'}</span>
        </button>
      </div>
      <div
        data-mol-id="audio-effects-rack-params"
        style={{
          display: 'grid',
          'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
          gap: '4px',
        }}
      >
        {schema.map((param) => (
          <ParamInput
            param={param}
            effect={options.effect}
            ariaLabel={options.paramLabelFor(param.id)}
            onChange={options.onChange}
          />
        ))}
      </div>
    </div>
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
 * @returns The rendered rack.
 */
export const AudioEffectsRack = (props: AudioEffectsRackProps): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Which panel (if any) is currently being dragged; only the index is
  // stored — the re-order is computed against the latest `effects` prop on
  // drop, exactly as React does.
  const [dragIndex, setDragIndex] = createSignal<number | null>(null)
  const [overIndex, setOverIndex] = createSignal<number | null>(null)
  // The latest pointer-event target index, kept outside the reactive state so
  // a move doesn't re-render before the drop.
  let dragRef: { from: number | null; over: number | null } = { from: null, over: null }

  /**
   * Picks up the panel at `index`.
   *
   * @param index - The panel's index.
   * @param event - The pointerdown event.
   */
  const handlePointerDown = (index: number, event: PointerEvent): void => {
    event.preventDefault()
    setDragIndex(index)
    setOverIndex(index)
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
    setOverIndex(index)
  }

  /**
   * Drops the drag (pointer up or cancel) and emits the new order when the
   * panel moved.
   */
  const handlePointerUp = (): void => {
    const { from, over } = dragRef
    dragRef = { from: null, over: null }
    setDragIndex(null)
    setOverIndex(null)
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
    const element = event.currentTarget
    if (!(element instanceof HTMLSelectElement)) return
    const value = element.value
    // Reset back to the placeholder so the user can pick the same kind twice in
    // a row without un-selecting first.
    element.value = ''
    const kind = EFFECT_KINDS.find((effectKind) => effectKind === value)
    if (kind) props.onAdd?.(kind)
  }

  const rackLabel = (): string =>
    t('audioEffectsRack.aria.rack', {}, { defaultValue: 'Audio effects rack' })
  const addLabel = (): string =>
    t('audioEffectsRack.button.add', {}, { defaultValue: 'Add effect' })
  const addPlaceholder = (): string =>
    t('audioEffectsRack.button.addPlaceholder', {}, { defaultValue: 'Add effect…' })
  const removeLabel = (): string =>
    t('audioEffectsRack.button.remove', {}, { defaultValue: 'Remove effect' })
  const bypassLabel = (): string =>
    t('audioEffectsRack.button.bypass', {}, { defaultValue: 'Bypass' })
  const dragHandleLabel = (): string =>
    t('audioEffectsRack.aria.dragHandle', {}, { defaultValue: 'Drag to reorder' })
  const emptyLabel = (): string =>
    t(
      'audioEffectsRack.empty',
      {},
      { defaultValue: 'No effects in chain — add one to get started.' },
    )

  return (
    <div
      role="group"
      aria-label={rackLabel()}
      data-mol-id="audio-effects-rack"
      class={cm.cn(props.className)}
      style={{
        display: 'flex',
        'flex-direction': 'column',
        gap: '8px',
        'user-select': 'none',
      }}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        data-mol-id="audio-effects-rack-header"
        style={{
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
          gap: '8px',
        }}
      >
        <span
          data-mol-id="audio-effects-rack-title"
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        >
          {rackLabel()}
        </span>
        <label
          data-mol-id="audio-effects-rack-add"
          style={{ display: 'flex', 'align-items': 'center', gap: '4px' }}
        >
          <span class={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7 }}>
            {addLabel()}
          </span>
          <select
            aria-label={addLabel()}
            data-mol-id="audio-effects-rack-add-select"
            onChange={handleAdd}
            style={{
              'font-size': '12px',
              padding: '4px 6px',
              'border-radius': '4px',
              border: '1px solid',
              background: 'transparent',
              color: 'inherit',
            }}
          >
            <option value="" disabled selected>
              {addPlaceholder()}
            </option>
            {EFFECT_KINDS.map((kind) => (
              <option value={kind}>{kindLabelOf(t, kind)}</option>
            ))}
          </select>
        </label>
      </div>
      {props.effects.length === 0 ? (
        <div
          data-mol-id="audio-effects-rack-empty"
          class={cm.cn(cm.textSize('xs'))}
          style={{ opacity: 0.6, padding: '8px' }}
        >
          {emptyLabel()}
        </div>
      ) : (
        <div
          data-mol-id="audio-effects-rack-chain"
          style={{
            display: 'flex',
            'flex-direction': 'row',
            'flex-wrap': 'wrap',
            'align-items': 'stretch',
            gap: '8px',
          }}
        >
          {props.effects.map((effect, index) => (
            <EffectPanel
              effect={effect}
              index={index}
              isDragging={dragIndex() === index}
              isOverTarget={overIndex() === index && dragIndex() !== null && dragIndex() !== index}
              kindLabel={kindLabelOf(t, effect.kind)}
              bypassLabel={bypassLabel()}
              removeLabel={removeLabel()}
              dragHandleLabel={dragHandleLabel()}
              paramLabelFor={(paramId) => paramLabelOf(t, effect.kind, paramId)}
              onChange={props.onChange}
              onRemove={props.onRemove}
              onDragStart={handlePointerDown}
              onDragOver={handlePointerEnter}
            />
          ))}
        </div>
      )}
    </div>
  )
}
