import { describe, expect, it } from 'vitest'

import { DEFAULT_HISTORY_LIMIT, HistoryStack } from '../history.js'
import type { CanvasDocument } from '../types.js'

const doc = (n: number): CanvasDocument => ({
  width: 100,
  height: 100,
  layers: [{ id: `r${n}`, kind: 'rect', x: n, y: n, width: 1, height: 1 }],
})

describe('HistoryStack', () => {
  it('starts empty', () => {
    const s = new HistoryStack()
    expect(s.canUndo()).toBe(false)
    expect(s.canRedo()).toBe(false)
  })

  it('push then undo restores the previous snapshot', () => {
    const s = new HistoryStack()
    s.push({ document: doc(1) })
    expect(s.canUndo()).toBe(true)
    const restored = s.undo({ document: doc(2) })
    expect(restored?.document).toEqual(doc(1))
    expect(s.canRedo()).toBe(true)
  })

  it('redo restores the post-undo snapshot', () => {
    const s = new HistoryStack()
    s.push({ document: doc(1) })
    s.undo({ document: doc(2) })
    const next = s.redo({ document: doc(1) })
    expect(next?.document).toEqual(doc(2))
  })

  it('a new push clears the redo stack', () => {
    const s = new HistoryStack()
    s.push({ document: doc(1) })
    s.undo({ document: doc(2) })
    expect(s.canRedo()).toBe(true)
    s.push({ document: doc(3) })
    expect(s.canRedo()).toBe(false)
  })

  it('caps the undo stack at the configured limit', () => {
    const s = new HistoryStack(2)
    s.push({ document: doc(1) })
    s.push({ document: doc(2) })
    s.push({ document: doc(3) })
    // First entry should have been dropped — only the two most recent stay.
    s.undo({ document: doc(4) })
    s.undo({ document: doc(3) })
    expect(s.canUndo()).toBe(false)
  })

  it('exposes a default limit of 100', () => {
    expect(DEFAULT_HISTORY_LIMIT).toBe(100)
  })
})
