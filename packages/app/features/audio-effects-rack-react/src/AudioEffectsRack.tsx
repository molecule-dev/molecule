import type { ChangeEvent, CSSProperties, JSX, MouseEvent, PointerEvent, ReactNode } from 'react'
import { useCallback, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * Built-in catalog of effect kinds the rack knows how to render. Each
 * entry has its own parameter schema in {@link EFFECT_PARAM_SCHEMAS}.
 */
export type EffectKind =
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'delay'
  | 'distortion'
  | 'gate'
  | 'limiter'
  | 'chorus'
  | 'flanger'
  | 'phaser'

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
 * Parameter schema entry — a single named knob on an effect panel.
 * `min` / `max` define the closed slider interval, `step` is the
 * granularity of the underlying range input, and `default` is the
 * value used when an effect is created without an explicit value for
 * this param.
 */
export interface EffectParamSchema {
  /** Stable parameter id used as the key inside `Effect.params`. */
  id: string
  /** Lowest allowed value. */
  min: number
  /** Highest allowed value. */
  max: number
  /** Slider step granularity. */
  step: number
  /** Default value when the param is missing on an effect. */
  default: number
}

/**
 * Single effect node in the chain. Effects are pure data — the rack
 * renders them as panels but never executes any DSP itself. The
 * caller is expected to wire the emitted patches/reorders back into
 * a real audio engine (Tone.js, Web Audio API, native `AudioContext`).
 */
export interface Effect {
  /** Stable identifier for the effect (used as a React key + handler arg). */
  id: string
  /** Kind of effect — picks the parameter schema + display label. */
  kind: EffectKind
  /** Whether the effect is currently enabled (i.e. NOT bypassed). */
  enabled: boolean
  /** Map of param id → current value. Missing keys fall back to the schema default. */
  params: Record<string, number>
}

/**
 * Patch describing the changed fields for a single effect-change event.
 * Always carries the effect id; the touched field is set and the rest
 * are absent.
 */
export interface EffectChangePatch {
  /** Effect that changed. */
  id: string
  /** New enabled (bypass-off) state — only set when the bypass toggle moved. */
  enabled?: boolean
  /** Param id that moved — paired with `paramValue`. */
  paramId?: string
  /** New param value — paired with `paramId`. */
  paramValue?: number
}

/** Props for `<AudioEffectsRack>`. */
export interface AudioEffectsRackProps {
  /** Effects rendered as panels from left to right (or top to bottom on narrow viewports). */
  effects: Effect[]
  /**
   * Called for every per-effect change with a partial patch describing
   * which field moved. Bypass emits a single patch on click; param
   * sliders emit a stream of patches as the user drags.
   */
  onChange?: (patch: EffectChangePatch) => void
  /**
   * Called when the user reorders effects (drag-to-reorder via pointer
   * events) with the new full ordering. The caller is expected to apply
   * the new order to its source-of-truth state.
   */
  onReorder?: (nextOrder: Effect[]) => void
  /** Called when the user adds a new effect via the add-effect dropdown. */
  onAdd?: (kind: EffectKind) => void
  /** Called when the user removes an effect via the per-panel remove button. */
  onRemove?: (id: string) => void
  /** Extra classes merged onto the root element. */
  className?: string
}

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
  next.splice(clampedTo, 0, moved)
  return next
}

/**
 * Multi-effect rack — renders one panel per effect in chain order.
 * Each panel exposes a bypass toggle, a per-param slider grid, and a
 * remove button. A header dropdown lets the user add a new effect of
 * any built-in kind. Drag-to-reorder is implemented via native
 * pointer events — pick up a panel by its drag handle, drop it
 * before/after another panel, and `onReorder` fires with the new
 * full ordering.
 *
 * Pure UI: callers wire the emitted change patches + reorder events
 * back into whatever audio engine they want (Tone.js, the Web Audio
 * API, native `AudioContext`, etc.). Styling routes through
 * `getClassMap()` from `@molecule/app-ui` and all user-visible text
 * routes through `t()` via the companion locale bond
 * `@molecule/app-locales-feature-audio-effects-rack`.
 *
 * @param props - Component props.
 * @returns The rack element.
 */
export function AudioEffectsRack(props: AudioEffectsRackProps): JSX.Element {
  const { effects, onChange, onReorder, onAdd, onRemove, className } = props

  const cm = getClassMap()
  const { t } = useTranslation()

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
  const kindLabel = (kind: EffectKind): string =>
    t(`audioEffectsRack.kind.${kind}`, {}, { defaultValue: defaultKindLabel(kind) })
  const paramLabel = (kind: EffectKind, paramId: string): string =>
    t(`audioEffectsRack.param.${kind}.${paramId}`, {}, { defaultValue: defaultParamLabel(paramId) })

  // Track which panel (if any) is currently being dragged. We only
  // store the index — the actual re-order is computed against the
  // latest `effects` prop on drop.
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  // We cache the latest pointer-event target index in a ref so that
  // pointermove handlers attached to the document can read it without
  // triggering re-renders on every move.
  const dragRef = useRef<{ from: number | null; over: number | null }>({ from: null, over: null })

  const handlePointerDown = useCallback((index: number, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragIndex(index)
    setOverIndex(index)
    dragRef.current = { from: index, over: index }
  }, [])

  const handlePointerEnter = useCallback((index: number) => {
    if (dragRef.current.from === null) return
    dragRef.current.over = index
    setOverIndex(index)
  }, [])

  const handlePointerUp = useCallback(() => {
    const { from, over } = dragRef.current
    dragRef.current = { from: null, over: null }
    setDragIndex(null)
    setOverIndex(null)
    if (from === null || over === null || from === over) return
    onReorder?.(reorderEffects(effects, from, over))
  }, [effects, onReorder])

  const handleAdd = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value
      if (!value) return
      // Reset back to the placeholder so the user can pick the same
      // kind twice in a row without un-selecting first.
      event.target.value = ''
      if ((EFFECT_KINDS as readonly string[]).includes(value)) {
        onAdd?.(value as EffectKind)
      }
    },
    [onAdd],
  )

  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    userSelect: 'none',
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  }

  const chainStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 8,
  }

  return (
    <div
      role="group"
      aria-label={rackLabel}
      data-mol-id="audio-effects-rack"
      className={cm.cn(className)}
      style={rootStyle}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div data-mol-id="audio-effects-rack-header" style={headerStyle}>
        <span
          data-mol-id="audio-effects-rack-title"
          className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        >
          {rackLabel}
        </span>
        <label
          data-mol-id="audio-effects-rack-add"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span className={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7 }}>
            {addLabel}
          </span>
          <select
            aria-label={addLabel}
            data-mol-id="audio-effects-rack-add-select"
            defaultValue=""
            onChange={handleAdd}
            style={{
              fontSize: 12,
              padding: '4px 6px',
              borderRadius: 4,
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
            }}
          >
            <option value="" disabled>
              {addPlaceholder}
            </option>
            {EFFECT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabel(kind)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {effects.length === 0 ? (
        <div
          data-mol-id="audio-effects-rack-empty"
          className={cm.cn(cm.textSize('xs'))}
          style={{ opacity: 0.6, padding: 8 }}
        >
          {emptyLabel}
        </div>
      ) : (
        <div data-mol-id="audio-effects-rack-chain" style={chainStyle}>
          {effects.map((effect, index) => (
            <EffectPanel
              key={effect.id}
              effect={effect}
              index={index}
              isDragging={dragIndex === index}
              isOverTarget={overIndex === index && dragIndex !== null && dragIndex !== index}
              kindLabel={kindLabel(effect.kind)}
              bypassLabel={bypassLabel}
              removeLabel={removeLabel}
              dragHandleLabel={dragHandleLabel}
              paramLabelFor={(paramId) => paramLabel(effect.kind, paramId)}
              onChange={onChange}
              onRemove={onRemove}
              onDragStart={handlePointerDown}
              onDragOver={handlePointerEnter}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface EffectPanelProps {
  effect: Effect
  index: number
  isDragging: boolean
  isOverTarget: boolean
  kindLabel: string
  bypassLabel: string
  removeLabel: string
  dragHandleLabel: string
  paramLabelFor: (paramId: string) => string
  onChange?: (patch: EffectChangePatch) => void
  onRemove?: (id: string) => void
  onDragStart: (index: number, event: PointerEvent<HTMLButtonElement>) => void
  onDragOver: (index: number) => void
}

/**
 * Single effect panel — drag handle, kind label, bypass toggle,
 * param slider grid, remove button. Internal building block of
 * `<AudioEffectsRack>`.
 *
 * @param props - Panel props.
 * @returns The panel element.
 */
function EffectPanel(props: EffectPanelProps): JSX.Element {
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
  } = props

  const cm = getClassMap()

  const schema = EFFECT_PARAM_SCHEMAS[effect.kind] ?? []

  const panelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
    padding: 8,
    boxSizing: 'border-box',
    border: '1px solid currentColor',
    borderRadius: 4,
    opacity: effect.enabled ? 1 : 0.55,
    boxShadow: isOverTarget ? '0 0 0 2px currentColor inset' : undefined,
    transform: isDragging ? 'scale(0.98)' : undefined,
  }

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  }

  const buttonBase: CSSProperties = {
    minWidth: 28,
    minHeight: 24,
    padding: '2px 6px',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 4,
    border: '1px solid currentColor',
    background: 'transparent',
    color: 'inherit',
  }
  const buttonActive: CSSProperties = {
    background: 'currentColor',
    color: 'transparent',
  }

  /**
   * Toggles the bypass state for this effect and emits an `onChange` patch.
   */
  function handleBypass(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    onChange?.({ id: effect.id, enabled: !effect.enabled })
  }

  /**
   * Requests removal of this effect via the `onRemove` callback.
   */
  function handleRemove(event: MouseEvent<HTMLButtonElement>): void {
    event.preventDefault()
    onRemove?.(effect.id)
  }

  /**
   * Emits an `onChange` patch for a single parameter slider movement.
   */
  function handleParam(paramId: string, value: number): void {
    onChange?.({ id: effect.id, paramId, paramValue: value })
  }

  /**
   * Forwards a pointer-down on the drag handle up to the rack's drag-start handler.
   */
  function handleDragHandlePointerDown(event: PointerEvent<HTMLButtonElement>): void {
    onDragStart(index, event)
  }

  /**
   * Notifies the rack that the pointer is hovering over this panel during a drag.
   */
  function handlePanelPointerEnter(): void {
    onDragOver(index)
  }

  return (
    <div
      role="group"
      aria-label={kindLabel}
      data-mol-id="audio-effects-rack-panel"
      data-effect-id={effect.id}
      data-effect-kind={effect.kind}
      data-enabled={effect.enabled ? 'true' : 'false'}
      data-dragging={isDragging ? 'true' : 'false'}
      data-drop-target={isOverTarget ? 'true' : 'false'}
      className={cm.cn()}
      style={panelStyle}
      onPointerEnter={handlePanelPointerEnter}
    >
      <div data-mol-id="audio-effects-rack-panel-header" style={headerStyle}>
        <button
          type="button"
          aria-label={dragHandleLabel}
          data-mol-id="audio-effects-rack-drag-handle"
          style={{ ...buttonBase, cursor: 'grab' }}
          onPointerDown={handleDragHandlePointerDown}
        >
          {/* unicode "vertical four dots" — a presentational glyph; not user-locale text */}
          <span aria-hidden="true">{'⋮⋮'}</span>
        </button>
        <span
          data-mol-id="audio-effects-rack-panel-title"
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {kindLabel}
        </span>
        <button
          type="button"
          aria-label={bypassLabel}
          aria-pressed={!effect.enabled ? 'true' : 'false'}
          data-mol-id="audio-effects-rack-bypass"
          style={{ ...buttonBase, ...(!effect.enabled ? buttonActive : null) }}
          onClick={handleBypass}
        >
          {bypassLabel.charAt(0).toUpperCase()}
        </button>
        <button
          type="button"
          aria-label={removeLabel}
          data-mol-id="audio-effects-rack-remove"
          style={buttonBase}
          onClick={handleRemove}
        >
          <span aria-hidden="true">{'×'}</span>
        </button>
      </div>

      <div
        data-mol-id="audio-effects-rack-params"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 4,
        }}
      >
        {schema.map((param) => {
          const value = resolveParamValue(effect, param)
          const ariaLabel = paramLabelFor(param.id)
          const node: ReactNode = (
            <label
              key={param.id}
              data-mol-id="audio-effects-rack-param"
              data-param-id={param.id}
              style={{ display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span className={cm.cn(cm.textSize('xs'))} style={{ opacity: 0.7 }}>
                {ariaLabel}
              </span>
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={value}
                aria-label={ariaLabel}
                aria-valuemin={param.min}
                aria-valuemax={param.max}
                aria-valuenow={value}
                data-mol-id="audio-effects-rack-param-input"
                data-param-id={param.id}
                style={{ width: '100%' }}
                onChange={(event) => {
                  const next = parseFloat(event.target.value)
                  if (!Number.isFinite(next)) return
                  const clamped = next < param.min ? param.min : next > param.max ? param.max : next
                  handleParam(param.id, clamped)
                }}
              />
            </label>
          )
          return node
        })}
      </div>
    </div>
  )
}

/**
 * Fallback (non-localized) human label for an effect kind, used as the
 * `defaultValue` for the locale-bond key. Locale bonds override.
 *
 * @param kind - The effect kind.
 * @returns The English fallback label.
 */
function defaultKindLabel(kind: EffectKind): string {
  switch (kind) {
    case 'eq':
      return 'EQ'
    case 'compressor':
      return 'Compressor'
    case 'reverb':
      return 'Reverb'
    case 'delay':
      return 'Delay'
    case 'distortion':
      return 'Distortion'
    case 'gate':
      return 'Gate'
    case 'limiter':
      return 'Limiter'
    case 'chorus':
      return 'Chorus'
    case 'flanger':
      return 'Flanger'
    case 'phaser':
      return 'Phaser'
  }
}

/**
 * Fallback (non-localized) human label for a param id, derived by
 * title-casing the id. Locale bonds override.
 *
 * @param paramId - The param id.
 * @returns The English fallback label.
 */
function defaultParamLabel(paramId: string): string {
  if (paramId.length === 0) return paramId
  return paramId.charAt(0).toUpperCase() + paramId.slice(1)
}
