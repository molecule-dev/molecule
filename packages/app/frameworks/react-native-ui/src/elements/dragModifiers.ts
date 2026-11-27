import { useState } from 'react'
import type { NativePointerEvent, NativeTouchEvent, ViewProps } from 'react-native'

import type { KitModifierKeys } from '@molecule/app-ui'

type Phase = 'start' | 'move' | 'end'
type Contact = Pick<
  NativeTouchEvent,
  'identifier' | 'timestamp' | 'pageX' | 'pageY' | 'locationX' | 'locationY'
>
type Packet = { phase: Phase; pointer: NativePointerEvent }

/** Modifier metadata captured on the same host as the responder or its SVG viewport. */
export interface DragModifiers {
  read(contact: Contact, phase: Phase): KitModifierKeys | undefined
  handlers: Pick<ViewProps, 'onPointerDownCapture' | 'onPointerMoveCapture' | 'onPointerUpCapture'>
}

/**
 * Pairs responder samples with optional React Native 0.79 W3C pointer packets in the same dispatch.
 * Android sends the MotionEvent timestamp and ID on both events. iOS allocates IDs separately,
 * so match the dispatched position in the root or target. Responder motion remains the owner.
 *
 * The object is created once per component, so passing it through context or effect
 * dependencies does not re-render or re-run anything.
 *
 * @returns The pointer capture handlers and a reader for responder contact modifiers.
 */
export function useDragModifiers(): DragModifiers {
  const [modifiers] = useState(createDragModifiers)
  return modifiers
}

/**
 * Creates the packet store and its handlers for one host.
 *
 * @returns The pointer capture handlers and a reader for responder contact modifiers.
 */
function createDragModifiers(): DragModifiers {
  const packets: Packet[] = []

  /** Retains a pointer packet for the matching responder notification. */
  function remember(phase: Phase, pointer: NativePointerEvent): void {
    const packet = { phase, pointer }
    packets.push(packet)
    queueMicrotask(() => {
      const index = packets.indexOf(packet)
      if (index !== -1) packets.splice(index, 1)
    })
  }

  return {
    handlers: {
      onPointerDownCapture: ({ nativeEvent }) => remember('start', nativeEvent),
      onPointerMoveCapture: ({ nativeEvent }) => remember('move', nativeEvent),
      onPointerUpCapture: ({ nativeEvent }) => remember('end', nativeEvent),
    },
    read(contact, phase) {
      const matches = packets.filter(({ phase: kind, pointer }) => {
        if (kind !== phase) return false
        if ('timestamp' in pointer && typeof pointer.timestamp === 'number') {
          return (
            pointer.timestamp === contact.timestamp &&
            String(pointer.pointerId) === String(contact.identifier)
          )
        }
        return (
          samePosition(pointer.pageX, pointer.pageY, contact.pageX, contact.pageY) ||
          samePosition(pointer.offsetX, pointer.offsetY, contact.locationX, contact.locationY)
        )
      })
      const [match] = matches
      if (!match || matches.length !== 1) return undefined
      packets.splice(packets.indexOf(match), 1)
      const { altKey, ctrlKey, metaKey, shiftKey } = match.pointer
      return { altKey, ctrlKey, metaKey, shiftKey }
    },
  }
}

/** Matches coordinates through the native float conversion. */
function samePosition(x: number, y: number, otherX: number, otherY: number): boolean {
  return Math.abs(x - otherX) < 0.001 && Math.abs(y - otherY) < 0.001
}
