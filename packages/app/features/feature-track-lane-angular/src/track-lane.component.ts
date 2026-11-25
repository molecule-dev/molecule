/**
 * TrackLane component (React parity): one row of a multi-track timeline with
 * draggable + resizable clip blocks on a `pixelsPerSecond` time axis.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { type ElementDrag, getClassMap, type UIClassMap } from '@molecule/app-ui'
import { WebDragDirective } from '@molecule/app-ui-angular'

import {
  clampClipMove,
  clipToPixels,
  DRAG_DISTANCE_THRESHOLD_PX,
  MIN_CLIP_DURATION_SECONDS,
  pixelsToTime,
} from './geometry.js'
import type { Clip } from './types.js'

/** What a drag does to the clip: `'move'` drags its body, `'resize'` its right edge. */
type DragMode = 'move' | 'resize'

/** The gesture in progress: the clip being dragged, and where it was when the contact began. */
interface DragState {
  /** The clip being moved or resized. */
  clipId: string
  /** `'move'` for body drags, `'resize'` for handle drags. */
  mode: DragMode
  /** The clip's start time when the contact began. */
  originStartTime: number
  /** The clip's duration when the contact began. */
  originDuration: number
  /** Whether the pointer has travelled past the drag threshold. */
  moved: boolean
}

/**
 * Whether a node-valued field is an Angular template (a node) rather than text.
 *
 * @param value - The field.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * TrackLane component.
 *
 * One row of a multi-track timeline — renders draggable + resizable clip blocks
 * on a `pixelsPerSecond` time axis. Pointer-down on a clip body starts a
 * drag-to-move, pointer-down on the right-edge handle starts a drag-to-resize,
 * and a click without movement fires `onClipClick`. All styling routes through
 * `getClassMap()` and all user-visible text routes through `useTranslation()`
 * (via the companion `@molecule/app-locales-feature-track-lane` locale bond).
 *
 * The host IS React's root `<div>` (`div[mol-track-lane]`): `role`, the
 * translated `aria-label`, `data-mol-id` and `data-lane` live on it.
 */
@Component({
  selector: 'div[mol-track-lane]',
  standalone: true,
  imports: [NgTemplateOutlet, WebDragDirective],
  inputs: [
    'name',
    'clips',
    'pixelsPerSecond',
    'lane',
    'height',
    'onClipMove',
    'onClipResize',
    'onClipClick',
    'selectedClipId',
    'className',
  ],
  host: {
    role: 'group',
    'data-mol-id': 'track-lane',
    '[attr.aria-label]': 'laneLabel()',
    '[attr.data-lane]': 'lane ?? null',
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `@if (hasHeader()) {
      <div data-mol-id="track-lane-header" [class]="headerClasses()" style="width: 120px; min-width: 120px"><span [class]="nameClasses()" data-mol-id="track-lane-name">@if (nameTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>}@else if (nameText() !== null) { {{ nameText() }} }@else { {{ headerLabel() }} }</span></div>
    }<div data-mol-id="track-lane-body" [style]="laneStyle()">@for (clip of clips ?? []; track clip.id) {<div role="button" tabindex="0" [attr.aria-label]="clipLabel(clip)" [attr.aria-pressed]="isSelected(clip) ? 'true' : null" data-mol-id="track-lane-clip" [attr.data-clip-id]="clip.id" [attr.data-selected]="isSelected(clip) ? 'true' : 'false'" [class]="clipClasses()" [style]="clipStyle(clip)" [molDrag]="clipDrag(clip, 'move')">@if (clip.label !== undefined) {<span data-mol-id="track-lane-clip-label" [class]="labelClasses()" [style]="labelStyle">@if (labelTemplate(clip); as tpl) {<ng-container [ngTemplateOutlet]="tpl"></ng-container>}@else if (labelText(clip) !== null) { {{ labelText(clip) }} }</span>}<div role="separator" [attr.aria-label]="resizeLabel()" data-mol-id="track-lane-clip-handle" [style]="handleStyle" [molDrag]="clipDrag(clip, 'resize')"></div></div>}</div>`,
})
export class TrackLane {
  /** Optional lane name shown in the header: text or a template. */
  name?: string | number | TemplateRef<unknown> | null
  /** Clips on this lane, in display order. */
  clips?: Clip[]
  /** Horizontal time scale, defaults to 20 (read at render time). */
  pixelsPerSecond?: number
  /** Opaque lane identifier, forwarded to handlers and emitted as `data-lane`. */
  lane?: string
  /** Lane row height in pixels, defaults to 44 (read at render time). */
  height?: number
  /** Called when a clip is dragged horizontally. */
  onClipMove?: (clipId: string, startTime: number, lane?: string) => void
  /** Called when a clip's right edge handle is dragged. */
  onClipResize?: (clipId: string, duration: number, lane?: string) => void
  /** Called when a clip body is clicked (no drag). */
  onClipClick?: (clipId: string, lane?: string) => void
  /** Currently-selected clip id (renders the selection ring on that clip). */
  selectedClipId?: string
  /** Extra classes merged onto the root element. */
  className?: string

  /** The i18n state; `t` re-reads the provider on every call and on every locale switch. */
  private readonly i18n = useTranslation()

  /** The gesture in progress, or null. */
  private drag: DragState | null = null

  /** The resize handle's inline geometry (React's `handleStyle`). */
  readonly handleStyle =
    'position: absolute; top: 0px; right: 0px; bottom: 0px; width: 8px; cursor: ew-resize; touch-action: none'

  /** The clip label's inline geometry (React's label style). */
  readonly labelStyle =
    'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; pointer-events: none'

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The root element's class list (React's root `cm.cn`).
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'stretch', gap: 'sm' }), this.className)
  }

  /**
   * The lane header's class list.
   *
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center' }),
      this.cm().sp('p', 2),
      this.cm().shrink0,
    )
  }

  /**
   * The lane name span's class list.
   *
   * @returns The class string.
   */
  nameClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * A clip block's class list.
   *
   * @returns The class string.
   */
  clipClasses(): string {
    return this.cm().cn(this.cm().cursorPointer)
  }

  /**
   * The clip label span's class list.
   *
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Whether the leading header renders — React's
   * `name !== undefined || lane !== undefined`.
   *
   * @returns True when the header is shown.
   */
  hasHeader(): boolean {
    return this.name !== undefined || this.lane !== undefined
  }

  /**
   * The node form of `name`, when the caller passed a template.
   *
   * @returns The template reference, or null.
   */
  nameTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.name) ? this.name : null
  }

  /**
   * The text form of `name` (React renders strings and numbers as text).
   *
   * @returns The text, or null when `name` is a node or absent.
   */
  nameText(): string | null {
    return typeof this.name === 'string' || typeof this.name === 'number' ? String(this.name) : null
  }

  /**
   * The node form of one clip's label, when the caller passed a template.
   *
   * @param clip - The clip.
   * @returns The template reference, or null.
   */
  labelTemplate(clip: Clip): TemplateRef<unknown> | null {
    return isTemplate(clip.label) ? clip.label : null
  }

  /**
   * The text form of one clip's label.
   *
   * @param clip - The clip.
   * @returns The text, or null when the label is a node or absent.
   */
  labelText(clip: Clip): string | null {
    return typeof clip.label === 'string' || typeof clip.label === 'number'
      ? String(clip.label)
      : null
  }

  /**
   * Whether one clip carries the selection ring.
   *
   * @param clip - The clip.
   * @returns True when it is the selected clip.
   */
  isSelected(clip: Clip): boolean {
    return this.selectedClipId === clip.id
  }

  /**
   * The translated lane label (React's `trackLane.aria.lane`).
   *
   * @returns The translated label.
   */
  laneLabel(): string {
    return this.i18n.t(
      'trackLane.aria.lane',
      { name: typeof this.name === 'string' ? this.name : '' },
      { defaultValue: 'Track lane {{name}}' },
    )
  }

  /**
   * The translated fallback header (React's `trackLane.header`).
   *
   * @returns The translated header text.
   */
  headerLabel(): string {
    return this.i18n.t('trackLane.header', {}, { defaultValue: 'Track' })
  }

  /**
   * The translated resize-handle label (React's `trackLane.aria.resize`).
   *
   * @returns The translated label.
   */
  resizeLabel(): string {
    return this.i18n.t('trackLane.aria.resize', {}, { defaultValue: 'Resize clip' })
  }

  /**
   * The translated aria label of one clip (its label, or its id).
   *
   * @param clip - The clip.
   * @returns The translated label.
   */
  clipLabel(clip: Clip): string {
    return this.i18n.t(
      'trackLane.aria.clip',
      {
        label: typeof clip.label === 'string' ? clip.label : clip.id,
        startTime: clip.startTime.toFixed(2),
        duration: clip.duration.toFixed(2),
      },
      { defaultValue: 'Clip {{label}} starting at {{startTime}}s for {{duration}}s' },
    )
  }

  /**
   * The lane body's inline geometry (React's `laneStyle`).
   *
   * @returns The style declarations.
   */
  laneStyle(): string {
    const height = this.height ?? 44
    return [
      'position: relative',
      `height: ${height}px`,
      `min-height: ${height}px`,
      'width: 100%',
      'overflow: hidden',
      'touch-action: pan-y',
    ].join('; ')
  }

  /**
   * The clip block's inline geometry (React's `clipStyle`).
   *
   * @param clip - The clip.
   * @returns The style declarations.
   */
  clipStyle(clip: Clip): string {
    const { left, width } = clipToPixels(clip, this.pixelsPerSecond ?? 20)
    const selected = this.isSelected(clip)
    return [
      'position: absolute',
      `left: ${left}px`,
      `width: ${width}px`,
      'top: 4px',
      'bottom: 4px',
      `background: ${clip.color ?? 'var(--mol-track-lane-clip-bg, rgba(0, 122, 204, 0.45))'}`,
      'border-radius: 4px',
      'box-sizing: border-box',
      `outline: ${selected ? '2px solid currentColor' : 'none'}`,
      'outline-offset: 1px',
      'display: flex',
      'align-items: center',
      'padding-left: 6px',
      'padding-right: 12px',
      'overflow: hidden',
      'user-select: none',
      'touch-action: none',
    ].join('; ')
  }

  /**
   * Binds clip movement or resizing with a fixed origin for the contact.
   *
   * @param clip - The clip being dragged.
   * @param mode - `'move'` for body drags, `'resize'` for handle drags.
   * @returns What the drag host reports about the contact.
   */
  clipDrag(clip: Clip, mode: DragMode): ElementDrag {
    /** The gesture in progress when it is this clip's and of this mode. */
    const current = (): DragState | undefined =>
      this.drag?.clipId === clip.id && this.drag.mode === mode ? this.drag : undefined
    return {
      onStart: (): void => {
        if (this.drag) return
        this.drag = {
          clipId: clip.id,
          mode,
          originStartTime: clip.startTime,
          originDuration: clip.duration,
          moved: false,
        }
      },
      onMove: ({ dx }): void => {
        const state = current()
        if (!state || (!state.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX)) return
        state.moved = true
        const dt = pixelsToTime(Math.abs(dx), this.pixelsPerSecond ?? 20) * (dx < 0 ? -1 : 1)
        if (mode === 'move') {
          this.onClipMove?.(clip.id, clampClipMove(state.originStartTime + dt), this.lane)
        } else {
          this.onClipResize?.(
            clip.id,
            Math.max(MIN_CLIP_DURATION_SECONDS, state.originDuration + dt),
            this.lane,
          )
        }
      },
      onEnd: ({ dx }): void => {
        const state = current()
        if (!state) return
        this.drag = null
        if (mode === 'move' && !state.moved && Math.abs(dx) < DRAG_DISTANCE_THRESHOLD_PX) {
          this.onClipClick?.(clip.id, this.lane)
        }
      },
      onCancel: (): void => {
        if (current()) this.drag = null
      },
    }
  }
}
