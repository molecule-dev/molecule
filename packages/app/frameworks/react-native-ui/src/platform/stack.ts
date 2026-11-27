/**
 * Native overlay ordering, presentation transitions and Back dispatch.
 * @module
 */

import { BackHandler, Platform, type View } from 'react-native'

import type {
  ElementHandle,
  OverlayDismissReason,
  OverlayLayerOptions,
  OverlayTarget,
} from '@molecule/app-ui'

import {
  announceDialog,
  focusedNativeTarget,
  focusNativeTarget,
  NativeFocusScope,
} from './focus.js'

/** One registration for the declaring component's lifetime. */
export class NativeLayer {
  host = false
  fallback = false
  readonly plane: { current: View | null } = { current: null }
  opener?: OverlayTarget
  previous?: NativeLayer
  restore?: OverlayTarget
  readonly focus = new NativeFocusScope()

  constructor(
    public options: OverlayLayerOptions,
    public parent: NativeLayer | null,
    public owner: OverlayTarget | undefined,
  ) {}
}

/** A native presentation can outlive `open` while iOS dismisses its controller. */
export interface Presentation {
  readonly id: number
  readonly layer: NativeLayer
  phase: 'showing' | 'shown' | 'closing'
  layout: boolean
  focused: boolean
}

/** Only blocking hosted layers create native Modal windows. */
function isModal(layer: NativeLayer): boolean {
  return layer.host && (layer.options.kind === 'modal' || layer.fallback)
}

/** An ancestor that owns a native Modal window. */
export function enclosingModal(layer: NativeLayer | null): NativeLayer | undefined {
  for (; layer; layer = layer.parent) {
    if (isModal(layer)) return layer
  }
  return undefined
}

/** Coordinates app-level ordering with the windows core Modal has actually presented. */
class NativeLayers {
  private readonly layers: NativeLayer[] = []
  private readonly presentations: Presentation[] = []
  private readonly listeners = new Set<() => void>()
  private back?: ReturnType<typeof BackHandler.addEventListener>
  private pendingRestore?: OverlayTarget
  private version = 0
  private sequence = 0
  private focusFrame: number | undefined

  readonly snapshot = (): number => this.version
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Finds the foremost layer participating in an interaction. */
  private top(matches: (layer: NativeLayer) => boolean): NativeLayer | undefined {
    for (let index = this.layers.length - 1; index >= 0; index -= 1) {
      const layer = this.layers[index]
      if (matches(layer)) return layer
    }
    return undefined
  }

  /** The modal that should be in the foreground once presentation settles. */
  get foreground(): NativeLayer | undefined {
    return this.top(isModal)
  }

  /** Looks up the window being shown or dismissed for a logical layer. */
  presentation(layer: NativeLayer): Presentation | undefined {
    return this.presentations.find((entry) => entry.layer === layer)
  }

  /** Records the opener and order once per open interval. */
  sync(layer: NativeLayer): void {
    const index = this.layers.indexOf(layer)
    if (!layer.options.open) {
      this.remove(layer)
      return
    }
    if (index !== -1) return
    layer.opener =
      layer.options.anchor ?? focusedNativeTarget() ?? this.pendingRestore ?? layer.owner
    if (layer.options.kind !== 'toast') this.pendingRestore = undefined
    layer.previous = this.foreground
    layer.restore = undefined
    this.layers.push(layer)
    this.reconcile()
  }

  /** Connects the registration to the portal that presents it. */
  attach(layer: NativeLayer, hosted: boolean, fallback: boolean): void {
    if (hosted === layer.host && fallback === layer.fallback) return
    layer.host = hosted
    layer.fallback = fallback
    this.reconcile()
  }

  /** Closes an interval and preserves the focus chain for surviving layers. */
  remove(layer: NativeLayer): void {
    const index = this.layers.indexOf(layer)
    if (index === -1) return
    const foreground = this.top((entry) => entry.options.kind !== 'toast') === layer
    this.layers.splice(index, 1)
    for (const above of this.layers.slice(index)) {
      if (above.previous !== layer) continue
      above.previous = layer.previous
      above.opener = layer.opener
    }

    const restore = layer.options.focus?.restore
    if (foreground && restore) {
      const target = restore === 'opener' ? layer.opener : restore
      const remaining = this.foreground
      if (remaining) {
        remaining.restore = target
        const entry = this.presentation(remaining)
        if (entry) entry.focused = false
      } else {
        this.pendingRestore = target
      }
    }
    this.reconcile()
  }

  /** Starts a new window generation for a layer ready to present. */
  private push(layer: NativeLayer): void {
    this.presentations.push({
      id: ++this.sequence,
      layer,
      phase: 'showing',
      layout: false,
      focused: false,
    })
  }

  /** Aligns native windows and Back dispatch with the open layers. */
  private reconcile(): void {
    const wanted = this.foreground
    if (Platform.OS === 'ios') {
      this.reconcileIOS(wanted)
    } else {
      for (const entry of [...this.presentations]) {
        if (!this.layers.includes(entry.layer) || !isModal(entry.layer)) this.forget(entry)
      }
      for (const layer of this.layers) {
        if (isModal(layer) && !this.presentation(layer)) this.push(layer)
      }
    }
    // Android's hardware Back event goes to Modal.onRequestClose while a native Modal is up.
    if (
      this.layers.some(({ options }) => options.kind !== 'toast' && options.dismissKey) &&
      this.presentations.length === 0
    ) {
      this.back ??= BackHandler.addEventListener('hardwareBackPress', () => this.dismissKey('back'))
    } else {
      this.back?.remove()
      this.back = undefined
    }
    this.version += 1
    for (const listener of this.listeners) listener()
    this.scheduleFocus()
  }

  /** Retains shared ancestry and completes one UIKit transition before starting the next. */
  private reconcileIOS(wanted: NativeLayer | undefined): void {
    const active = this.presentations.at(-1)
    if (active && active.phase !== 'shown') return

    const branch: NativeLayer[] = []
    for (let layer = wanted; layer; layer = enclosingModal(layer.parent)) {
      if (!this.layers.includes(layer)) break
      branch.unshift(layer)
    }
    // A sibling cannot present from the outgoing modal's controller. Wait for onDismiss
    // before presenting it. A descendant can present once its parent's onShow has fired.
    if (active && !this.presentations.every(({ layer }, index) => branch[index] === layer)) {
      active.phase = 'closing'
      return
    }
    const next = branch[this.presentations.length]
    if (next) this.push(next)
  }

  /** Handles core Modal's onShow for the current window generation. */
  shown(entry: Presentation): void {
    if (!this.presentations.includes(entry) || entry.phase !== 'showing') return
    entry.phase = 'shown'
    this.reconcile()
  }

  /** Marks the native surface ready for a focus request after layout. */
  layout(entry: Presentation): void {
    entry.layout = true
    this.scheduleFocus()
  }

  /** Removes a window after native dismissal or unmount. */
  private forget(entry: Presentation): void {
    const index = this.presentations.indexOf(entry)
    if (index !== -1) this.presentations.splice(index, 1)
  }

  /** Advances the presentation after core Modal's dismissal callback. */
  dismissed(entry: Presentation): void {
    if (!this.presentations.includes(entry)) return
    this.forget(entry)
    this.reconcile()
  }

  /** Cleans up a mounted presenter when its declaring portal unmounts. */
  detach(layer: NativeLayer): void {
    layer.host = false
    const entry = this.presentation(layer)
    // An actual React unmount removes the native controller and its dismissal callback.
    // The default non-animated Modal has left its window by the next native frame.
    if (entry)
      requestAnimationFrame(() => {
        if (!layer.host) this.dismissed(entry)
      })
  }

  /** Moves focus after show and layout, or restores the opener after the last window. */
  private scheduleFocus(): void {
    if (this.focusFrame !== undefined) return
    const entry = this.presentations.at(-1)
    const canFocus = entry?.phase === 'shown' && entry.layout && !entry.focused
    if (!canFocus && (entry || !this.pendingRestore)) return
    this.focusFrame = requestAnimationFrame(() => {
      this.focusFrame = undefined
      const current = this.presentations.at(-1)
      if (!current) {
        focusNativeTarget(this.pendingRestore)
        this.pendingRestore = undefined
      } else if (
        current.layer === this.foreground &&
        current.phase === 'shown' &&
        current.layout &&
        !current.focused
      ) {
        const layer = current.layer
        current.focused = true
        if (layer.options.focus || layer.fallback) {
          const restored = focusNativeTarget(layer.restore)
          layer.restore = undefined
          if (!restored) {
            const targets = [
              layer.options.focus?.initial,
              ...layer.focus.controls,
              ...layer.focus.headings,
              layer.options.surface,
            ]
            targets.some(focusNativeTarget)
            announceDialog(layer.focus.summary)
          }
        }
      }
    })
  }

  /** Gives one Back or accessibility Escape to the active window or ambient layer. */
  dismissKey(
    reason: Extract<OverlayDismissReason, 'back' | 'escape'>,
    window?: NativeLayer,
  ): boolean {
    const presented = this.presentations.at(-1)
    if (
      window &&
      (presented?.layer !== window || presented.phase !== 'shown' || this.foreground !== window)
    )
      return true
    const layer = this.top((candidate) => {
      if (window && window !== candidate && enclosingModal(candidate.parent) !== window)
        return false
      const { kind, dismissKey } = candidate.options
      return kind === 'modal' || (kind !== 'toast' && !!dismissKey)
    })
    if (layer?.options.dismissKey) layer.options.onDismiss?.(reason)
    return !!layer
  }

  /** Gives one backdrop press to the foremost eligible layer. */
  backdrop(layer: NativeLayer): void {
    const top = this.top(
      ({ options }) =>
        options.kind === 'modal' || (options.kind !== 'toast' && !!options.dismissBackdrop),
    )
    if (layer.fallback && this.foreground === layer) layer.options.onDismiss?.('outside')
    else if (top === layer && layer.options.dismissBackdrop) layer.options.onDismiss?.('backdrop')
  }

  /** Observes one physical press in its presentation without claiming the responder. */
  outside(inside: ReadonlySet<ElementHandle>, window?: NativeLayer): (() => void) | undefined {
    const foremost = (): NativeLayer | undefined =>
      this.top((layer) => {
        if (layer !== window && enclosingModal(layer.parent) !== window) return false
        const { kind, outside } = layer.options
        return isModal(layer) || (kind !== 'toast' && !!outside)
      })
    const layer = foremost()
    const options = layer?.options.outside
    if (!layer || !options || layer.fallback) return
    if (options.inside.some(({ current }) => !current || inside.has(current))) return
    for (const candidate of this.layers) {
      const surface = candidate.options.surface.current
      if (!surface || !inside.has(surface)) continue
      for (let parent = candidate.parent; parent; parent = parent.parent) {
        if (parent === layer) return
      }
    }
    if (options.phase === 'start') {
      layer.options.onDismiss?.('outside')
      return
    }
    return () => {
      if (foremost() === layer) layer.options.onDismiss?.('outside')
    }
  }
}

/** One stack for the native application, including nested modal presentations. */
export const nativeLayers = new NativeLayers()
