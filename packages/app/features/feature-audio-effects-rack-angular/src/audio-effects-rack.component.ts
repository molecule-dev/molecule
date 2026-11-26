/**
 * AudioEffectsRack component (React parity).
 *
 * @module
 */

import { type AfterViewChecked, Component, ElementRef, inject, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { InterpolationValues, TranslateOptions } from '@molecule/app-i18n'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { Effect, EffectChangePatch, EffectKind, EffectParamSchema } from './types.js'

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
 * closed `EffectKind` union, so the i18n gate can verify every key this call
 * can produce exists in the locale bond.
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
 * The host IS the rack's root `<div>` (`div[mol-audio-effects-rack]`), matching
 * React's root exactly, so the root's ClassMap classes, inline style and
 * pointer-up/cancel listeners are the host's.
 */
@Component({
  selector: 'div[mol-audio-effects-rack]',
  standalone: true,
  inputs: ['effects', 'onChange', 'onReorder', 'onAdd', 'onRemove', 'className'],
  host: {
    role: 'group',
    'data-mol-id': 'audio-effects-rack',
    '[attr.aria-label]': 'rackLabel()',
    '[class]': 'classes()',
    '[style]': 'rootStyle',
    '(pointerup)': 'handlePointerUp()',
    '(pointercancel)': 'handlePointerUp()',
  },
  // prettier-ignore
  template: `<div data-mol-id="audio-effects-rack-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px"><span data-mol-id="audio-effects-rack-title" [class]="titleClasses()">{{ rackLabel() }}</span><label data-mol-id="audio-effects-rack-add" style="display: flex; align-items: center; gap: 4px"><span [class]="textXsClasses()" style="opacity: 0.7">{{ addLabel() }}</span><select [attr.aria-label]="addLabel()" data-mol-id="audio-effects-rack-add-select" style="font-size: 12px; padding: 4px 6px; border-radius: 4px; border: 1px solid; background: transparent; color: inherit" (change)="handleAdd($event)"><option value="" disabled selected>{{ addPlaceholder() }}</option>@for (kind of kinds; track kind) {<option [attr.value]="kind">{{ kindLabel(kind) }}</option>}</select></label></div>@if (effects.length === 0) {<div data-mol-id="audio-effects-rack-empty" [class]="textXsClasses()" style="opacity: 0.6; padding: 8px">{{ emptyLabel() }}</div>} @else {<div data-mol-id="audio-effects-rack-chain" style="display: flex; flex-direction: row; flex-wrap: wrap; align-items: stretch; gap: 8px">@for (effect of effects; track effect.id; let index = $index) {<div role="group" [attr.aria-label]="kindLabel(effect.kind)" data-mol-id="audio-effects-rack-panel" [attr.data-effect-id]="effect.id" [attr.data-effect-kind]="effect.kind" [attr.data-enabled]="effect.enabled ? 'true' : 'false'" [attr.data-dragging]="isDragging(index) ? 'true' : 'false'" [attr.data-drop-target]="isDropTarget(index) ? 'true' : 'false'" [class]="panelClasses()" [style]="panelStyle(effect, index)" (pointerover)="handlePointerEnter(index)"><div data-mol-id="audio-effects-rack-panel-header" style="display: flex; align-items: center; gap: 4px"><button type="button" [attr.aria-label]="dragHandleLabel()" data-mol-id="audio-effects-rack-drag-handle" [class]="iconButtonClasses()" style="cursor: grab" (pointerdown)="handlePointerDown(index, $event)"><span aria-hidden="true">⋮⋮</span></button><span data-mol-id="audio-effects-rack-panel-title" [class]="panelTitleClasses()" style="flex: 1 1 0%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ kindLabel(effect.kind) }}</span><button type="button" [attr.aria-label]="bypassLabel()" [attr.aria-pressed]="effect.enabled ? 'false' : 'true'" data-mol-id="audio-effects-rack-bypass" [class]="bypassClasses(effect)" (click)="handleBypass(effect, $event)">{{ bypassInitial() }}</button><button type="button" [attr.aria-label]="removeLabel()" data-mol-id="audio-effects-rack-remove" [class]="iconButtonClasses()" (click)="handleRemove(effect, $event)"><span aria-hidden="true">×</span></button></div><div data-mol-id="audio-effects-rack-params" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px">@for (param of paramsOf(effect); track param.id) {<label data-mol-id="audio-effects-rack-param" [attr.data-param-id]="param.id" style="display: flex; flex-direction: column; gap: 2px"><span [class]="textXsClasses()" style="opacity: 0.7">{{ paramLabel(effect.kind, param.id) }}</span><input type="range" [attr.min]="param.min" [attr.max]="param.max" [attr.step]="param.step" [value]="paramValue(effect, param)" [attr.value]="paramValue(effect, param)" [attr.aria-label]="paramLabel(effect.kind, param.id)" [attr.aria-valuemin]="param.min" [attr.aria-valuemax]="param.max" [attr.aria-valuenow]="paramValue(effect, param)" data-mol-id="audio-effects-rack-param-input" [attr.data-param-id]="param.id" style="width: 100%" (input)="handleParam(effect, param, $event)" /></label>}</div></div>}</div>}`,
})
export class AudioEffectsRack implements AfterViewChecked {
  /** Effects rendered as panels from left to right (or top to bottom on narrow viewports). */
  effects: Effect[] = []
  /** Receives every per-effect change patch. */
  onChange?: (patch: EffectChangePatch) => void
  /** Receives the new full ordering after a drag. */
  onReorder?: (nextOrder: Effect[]) => void
  /** Receives the chosen kind from the add-effect dropdown. */
  onAdd?: (kind: EffectKind) => void
  /** Receives a remove request. */
  onRemove?: (id: string) => void
  /** Extra classes merged onto the root element. */
  className?: string

  /** Every supported effect kind, in the export order. */
  readonly kinds = EFFECT_KINDS

  /** React's root inline style. */
  readonly rootStyle = 'display: flex; flex-direction: column; gap: 8px; user-select: none'
  /** Which panel (if any) is currently being dragged. */
  private readonly dragIndex = signal<number | null>(null)
  /** Which panel is the current drop target. */
  private readonly overIndex = signal<number | null>(null)
  /** The latest pointer-event target index, kept outside the rendered state. */
  private dragRef: { from: number | null; over: number | null } = { from: null, over: null }

  /** The host element, whose range inputs are kept on their controlled values. */
  private readonly hostElement = inject(ElementRef)

  /** The i18n state; `t` re-reads the provider on every call and on every locale switch. */
  private readonly i18n = useTranslation()

  /**
   * Keeps every range input's live value on the controlled prop, as React does.
   * This runs AFTER the view's bindings are applied (so `min` / `max` exist and
   * the range input can hold the value), and on every later pass covers the case
   * where the user has dragged — after which the `value` attribute alone no
   * longer reaches the property.
   */
  ngAfterViewChecked(): void {
    const host = this.hostElement.nativeElement as HTMLElement
    const inputs = host.querySelectorAll<HTMLInputElement>('input[type="range"]')
    const expected: string[] = []
    for (const effect of this.effects) {
      for (const param of this.paramsOf(effect)) {
        expected.push(String(this.paramValue(effect, param)))
      }
    }
    inputs.forEach((input, index) => {
      const text = expected[index]
      if (text !== undefined && input.value !== text) input.value = text
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The rack title's classes (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The small-text classes (React's `cm.cn(cm.textSize('xs'))`).
   * @returns The class string.
   */
  textXsClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * The panel title's classes (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  panelTitleClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * The icon-only button classes (React's `cm.cn(cm.button({ variant: 'ghost', size: 'icon' }), cm.touchTarget)`).
   * @returns The class string.
   */
  iconButtonClasses(): string {
    return this.cm().cn(this.cm().button({ variant: 'ghost', size: 'icon' }), this.cm().touchTarget)
  }

  /**
   * The panel's own class list (React's `cm.cn()`).
   * @returns The class string.
   */
  panelClasses(): string {
    return this.cm().cn()
  }

  /**
   * The bypass toggle's classes: outline when live, solid warning when bypassed.
   * @param effect - The effect the panel shows.
   * @returns The class string.
   */
  bypassClasses(effect: Effect): string {
    return this.cm().cn(
      effect.enabled
        ? this.cm().button({ variant: 'outline', size: 'xs' })
        : this.cm().button({ variant: 'solid', color: 'warning', size: 'xs' }),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * One panel's inline style (React's `panelStyle`), including the drag and
   * drop-target decorations.
   * @param effect - The effect the panel shows.
   * @param index - The panel's position in the chain.
   * @returns The style declarations.
   */
  panelStyle(effect: Effect, index: number): string {
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
    if (this.isDropTarget(index)) declarations.push('box-shadow: 0 0 0 2px currentColor inset')
    if (this.isDragging(index)) declarations.push('transform: scale(0.98)')
    return declarations.join('; ')
  }

  /**
   * The schema entries for one effect kind (`[]` for an unknown kind, React's `?? []`).
   * @param effect - The effect.
   * @returns The schema entries.
   */
  paramsOf(effect: Effect): readonly EffectParamSchema[] {
    return EFFECT_PARAM_SCHEMAS[effect.kind] ?? []
  }

  /**
   * The current value of one param (React's `resolveParamValue`).
   * @param effect - The effect.
   * @param param - The schema entry.
   * @returns The clamped value.
   */
  paramValue(effect: Effect, param: EffectParamSchema): number {
    return resolveParamValue(effect, param)
  }

  /**
   * Whether the panel at `index` is being dragged.
   * @param index - The panel's position.
   * @returns Whether it is the dragged panel.
   */
  isDragging(index: number): boolean {
    return this.dragIndex() === index
  }

  /**
   * Whether the panel at `index` is the current drop target.
   * @param index - The panel's position.
   * @returns Whether it is the drop target.
   */
  isDropTarget(index: number): boolean {
    const dragged = this.dragIndex()
    return this.overIndex() === index && dragged !== null && dragged !== index
  }

  /**
   * The rack's translated `aria-label`.
   * @returns The translated label.
   */
  rackLabel(): string {
    return this.i18n.t('audioEffectsRack.aria.rack', {}, { defaultValue: 'Audio effects rack' })
  }

  /**
   * The add-effect label.
   * @returns The translated label.
   */
  addLabel(): string {
    return this.i18n.t('audioEffectsRack.button.add', {}, { defaultValue: 'Add effect' })
  }

  /**
   * The add-effect placeholder option text.
   * @returns The translated placeholder.
   */
  addPlaceholder(): string {
    return this.i18n.t(
      'audioEffectsRack.button.addPlaceholder',
      {},
      { defaultValue: 'Add effect…' },
    )
  }

  /**
   * The remove button label.
   * @returns The translated label.
   */
  removeLabel(): string {
    return this.i18n.t('audioEffectsRack.button.remove', {}, { defaultValue: 'Remove effect' })
  }

  /**
   * The bypass button label.
   * @returns The translated label.
   */
  bypassLabel(): string {
    return this.i18n.t('audioEffectsRack.button.bypass', {}, { defaultValue: 'Bypass' })
  }

  /**
   * The bypass button's visible initial (React's `bypassLabel.charAt(0).toUpperCase()`).
   * @returns The initial.
   */
  bypassInitial(): string {
    return this.bypassLabel().charAt(0).toUpperCase()
  }

  /**
   * The drag-handle label.
   * @returns The translated label.
   */
  dragHandleLabel(): string {
    return this.i18n.t('audioEffectsRack.aria.dragHandle', {}, { defaultValue: 'Drag to reorder' })
  }

  /**
   * The empty-state text.
   * @returns The translated text.
   */
  emptyLabel(): string {
    return this.i18n.t(
      'audioEffectsRack.empty',
      {},
      { defaultValue: 'No effects in chain — add one to get started.' },
    )
  }

  /**
   * The localized label for an effect kind (one literal key per kind).
   * @param kind - The effect kind.
   * @returns The translated label.
   */
  kindLabel(kind: EffectKind): string {
    return kindLabelOf(this.i18n.t, kind)
  }

  /**
   * The localized label for one param (one literal key per known pair).
   * @param kind - The effect kind.
   * @param paramId - The param id.
   * @returns The translated label.
   */
  paramLabel(kind: EffectKind, paramId: string): string {
    return paramLabelOf(this.i18n.t, kind, paramId)
  }

  /**
   * Picks up the panel at `index`.
   * @param index - The panel's position.
   * @param event - The pointerdown event.
   */
  handlePointerDown(index: number, event: PointerEvent): void {
    event.preventDefault()
    this.dragIndex.set(index)
    this.overIndex.set(index)
    this.dragRef = { from: index, over: index }
  }

  /**
   * Marks the panel at `index` as the drop target while a drag is in progress.
   * @param index - The panel's position.
   */
  handlePointerEnter(index: number): void {
    if (this.dragRef.from === null) return
    this.dragRef.over = index
    this.overIndex.set(index)
  }

  /** Drops the drag (pointer up or cancel) and emits the new order when the panel moved. */
  handlePointerUp(): void {
    const { from, over } = this.dragRef
    this.dragRef = { from: null, over: null }
    this.dragIndex.set(null)
    this.overIndex.set(null)
    if (from === null || over === null || from === over) return
    this.onReorder?.(reorderEffects(this.effects, from, over))
  }

  /**
   * Reads the chosen effect kind from the add dropdown, resets it to the
   * placeholder and emits `onAdd`.
   * @param event - The select's native change event.
   */
  handleAdd(event: Event): void {
    const element = event.currentTarget
    if (!(element instanceof HTMLSelectElement)) return
    const value = element.value
    // Reset back to the placeholder so the user can pick the same kind twice in a
    // row without un-selecting first.
    element.value = ''
    const kind = EFFECT_KINDS.find((effectKind) => effectKind === value)
    if (kind) this.onAdd?.(kind)
  }

  /**
   * Toggles the bypass state for one effect and emits an `onChange` patch.
   * @param effect - The effect whose toggle was clicked.
   * @param event - The button click event.
   */
  handleBypass(effect: Effect, event: MouseEvent): void {
    event.preventDefault()
    this.onChange?.({ id: effect.id, enabled: !effect.enabled })
  }

  /**
   * Requests removal of one effect via the `onRemove` callback.
   * @param effect - The effect to remove.
   * @param event - The button click event.
   */
  handleRemove(effect: Effect, event: MouseEvent): void {
    event.preventDefault()
    this.onRemove?.(effect.id)
  }

  /**
   * Emits an `onChange` patch for one parameter slider movement, then puts the
   * input and its `value` attribute back on the controlled value as React does.
   * @param effect - The effect whose param moved.
   * @param param - The schema entry of the param that moved.
   * @param event - The range input's native input event.
   */
  handleParam(effect: Effect, param: EffectParamSchema, event: Event): void {
    const element = event.target as HTMLInputElement
    const next = parseFloat(element.value)
    if (Number.isFinite(next)) {
      const clamped = next < param.min ? param.min : next > param.max ? param.max : next
      this.onChange?.({ id: effect.id, paramId: param.id, paramValue: clamped })
    }
    const current = resolveParamValue(effect, param)
    element.value = String(current)
    element.defaultValue = String(current)
  }
}
