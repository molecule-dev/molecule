import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TourProvider } from '@molecule/app-tour'

// A mock shepherd.js `Tour` that records constructor options, added steps, and
// registered event handlers, and exposes helpers to simulate shepherd's events.
// Hoisted so `vi.mock('shepherd.js')` (also hoisted) can reference it.
const { MockTour } = vi.hoisted(() => {
  class MockTour {
    static instances: MockTour[] = []

    options: Record<string, unknown>
    steps: Array<{ id?: string; options: Record<string, unknown> }> = []
    private handlers: Record<string, Array<(...args: unknown[]) => void>> = {}
    private current: { id?: string; options: Record<string, unknown> } | null = null

    constructor(options: Record<string, unknown>) {
      this.options = options
      MockTour.instances.push(this)
    }

    addStep = vi.fn((opts: Record<string, unknown>) => {
      const step = { id: opts.id as string | undefined, options: opts }
      this.steps.push(step)
      return step
    })

    on = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      ;(this.handlers[event] ??= []).push(handler)
      return this
    })

    start = vi.fn(() => Promise.resolve())
    next = vi.fn()
    back = vi.fn()
    cancel = vi.fn(() => Promise.resolve())
    complete = vi.fn()
    getCurrentStep = vi.fn(() => this.current)

    /** Test helper: fire a shepherd event with the given payload. */
    emit(event: string, ...args: unknown[]): void {
      ;(this.handlers[event] ?? []).forEach((handler) => handler(...args))
    }

    /** Test helper: simulate shepherd showing the step at `index`. */
    showStep(index: number): void {
      this.current = this.steps[index] ?? null
      this.emit('show')
    }
  }

  return { MockTour }
})

vi.mock('shepherd.js', () => ({ default: { Tour: MockTour } }))

// Imported AFTER the mock is declared so the provider binds to MockTour.
const { createProvider, provider } = await import('../index.js')

/** Grab the most recently constructed mock tour. */
const lastTour = (): InstanceType<typeof MockTour> => {
  const tour = MockTour.instances.at(-1)
  if (!tour) throw new Error('no MockTour was constructed')
  return tour
}

const steps = [
  { target: '#a', title: 'A', content: 'First' },
  { target: '#b', title: 'B', content: 'Second' },
  { target: '#c', title: 'C', content: 'Third' },
]

beforeEach(() => {
  MockTour.instances.length = 0
  vi.clearAllMocks()
})

describe('@molecule/app-tour-shepherd', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('shepherd')
    })

    it('should conform to TourProvider interface', () => {
      const p: TourProvider = provider
      expect(typeof p.createTour).toBe('function')
    })

    it('should create a provider with default and custom config', () => {
      expect(createProvider().name).toBe('shepherd')
      expect(createProvider({ overlay: false, showButtons: false }).name).toBe('shepherd')
    })
  })

  describe('Shepherd.Tour construction', () => {
    it('constructs a real Shepherd.Tour with useModalOverlay from the overlay flag', () => {
      provider.createTour({ steps })
      expect(MockTour.instances).toHaveLength(1)
      expect(lastTour().options.useModalOverlay).toBe(true)
    })

    it('sets useModalOverlay=false when overlay is off', () => {
      provider.createTour({ steps, overlay: false })
      expect(lastTour().options.useModalOverlay).toBe(false)
    })

    it('resolves useModalOverlay from the provider-level default', () => {
      createProvider({ overlay: false }).createTour({ steps })
      expect(lastTour().options.useModalOverlay).toBe(false)
    })
  })

  describe('step mapping', () => {
    it('adds one shepherd step per core step with title/text/attachTo mapped', () => {
      provider.createTour({ steps })
      const tour = lastTour()
      expect(tour.addStep).toHaveBeenCalledTimes(3)

      const first = tour.steps[0].options
      expect(first.title).toBe('A')
      expect(first.text).toBe('First')
      expect(first.attachTo).toEqual({ element: '#a', on: 'bottom' })
    })

    it('maps placement to attachTo.on and defaults it to bottom', () => {
      provider.createTour({
        steps: [
          { target: '#a', title: 'A', content: 'First', placement: 'right' },
          { target: '#b', title: 'B', content: 'Second' },
        ],
      })
      const tour = lastTour()
      expect(tour.steps[0].options.attachTo).toEqual({ element: '#a', on: 'right' })
      expect(tour.steps[1].options.attachTo).toEqual({ element: '#b', on: 'bottom' })
    })

    it('fires the core step action from shepherd when.show', () => {
      const action = vi.fn()
      provider.createTour({ steps: [{ target: '#a', title: 'A', content: 'First', action }] })
      const when = lastTour().steps[0].options.when as { show: () => void }
      expect(typeof when.show).toBe('function')
      when.show()
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('maps beforeShow to beforeShowPromise', async () => {
      const beforeShow = vi.fn(() => Promise.resolve())
      provider.createTour({
        steps: [{ target: '#a', title: 'A', content: 'First', beforeShow }],
      })
      const opts = lastTour().steps[0].options as { beforeShowPromise?: () => Promise<unknown> }
      expect(typeof opts.beforeShowPromise).toBe('function')
      await opts.beforeShowPromise!()
      expect(beforeShow).toHaveBeenCalledTimes(1)
    })

    it('omits when/beforeShowPromise when the step defines neither', () => {
      provider.createTour({ steps: [{ target: '#a', title: 'A', content: 'First' }] })
      const opts = lastTour().steps[0].options
      expect(opts.when).toBeUndefined()
      expect(opts.beforeShowPromise).toBeUndefined()
    })
  })

  describe('nav buttons (gated on showButtons)', () => {
    type Button = { text: string; secondary?: boolean; action: () => void }
    const buttonsOf = (tour: InstanceType<typeof MockTour>, i: number) =>
      tour.steps[i].options.buttons as Button[]

    it('builds Back/Next/Done buttons across the sequence when showButtons is on', () => {
      provider.createTour({ steps })
      const tour = lastTour()

      // First step: no Back, has Next.
      expect(buttonsOf(tour, 0).map((b) => b.text)).toEqual(['Next'])
      // Middle step: Back + Next.
      expect(buttonsOf(tour, 1).map((b) => b.text)).toEqual(['Back', 'Next'])
      // Last step: Back + Done.
      expect(buttonsOf(tour, 2).map((b) => b.text)).toEqual(['Back', 'Done'])
    })

    it('button actions drive the shepherd tour (back/next/complete)', () => {
      provider.createTour({ steps })
      const tour = lastTour()

      buttonsOf(tour, 1)
        .find((b) => b.text === 'Back')!
        .action()
      expect(tour.back).toHaveBeenCalledTimes(1)

      buttonsOf(tour, 1)
        .find((b) => b.text === 'Next')!
        .action()
      expect(tour.next).toHaveBeenCalledTimes(1)

      buttonsOf(tour, 2)
        .find((b) => b.text === 'Done')!
        .action()
      expect(tour.complete).toHaveBeenCalledTimes(1)
    })

    it('renders no buttons when showButtons is false', () => {
      provider.createTour({ steps, showButtons: false })
      const tour = lastTour()
      expect(buttonsOf(tour, 0)).toEqual([])
      expect(buttonsOf(tour, 1)).toEqual([])
    })

    it('uses configured labels, falling back to English defaults', () => {
      createProvider({ labels: { next: 'Continuar', done: 'Finalizado' } }).createTour({ steps })
      const tour = lastTour()
      expect((tour.steps[0].options.buttons as Button[])[0].text).toBe('Continuar')
      expect((tour.steps[1].options.buttons as Button[]).map((b) => b.text)).toEqual([
        'Back', // not overridden → English default
        'Continuar',
      ])
      expect((tour.steps[2].options.buttons as Button[])[1].text).toBe('Finalizado')
    })
  })

  describe('instance methods drive the shepherd tour', () => {
    it('start() starts shepherd and marks the tour active at step 0', () => {
      const instance = provider.createTour({ steps })
      expect(instance.isActive()).toBe(false)
      instance.start()
      expect(lastTour().start).toHaveBeenCalledTimes(1)
      expect(instance.isActive()).toBe(true)
      expect(instance.getCurrentStep()).toBe(0)
    })

    it('next()/previous() call tour.next()/tour.back() when active', () => {
      const instance = provider.createTour({ steps })
      instance.start()
      const tour = lastTour()

      instance.next()
      expect(tour.next).toHaveBeenCalledTimes(1)
      instance.previous()
      expect(tour.back).toHaveBeenCalledTimes(1)
    })

    it('next() no-ops on the last step instead of auto-completing', () => {
      const onComplete = vi.fn()
      const instance = provider.createTour({ steps, onComplete })
      instance.start()
      const tour = lastTour()

      // Walk to the last step via shepherd's show events.
      tour.showStep(2)
      expect(instance.getCurrentStep()).toBe(2)

      instance.next()
      expect(tour.next).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()
      expect(instance.isActive()).toBe(true)
    })

    it('does not drive shepherd navigation before the tour is active', () => {
      const instance = provider.createTour({ steps })
      const tour = lastTour()
      instance.next()
      instance.previous()
      expect(tour.next).not.toHaveBeenCalled()
      expect(tour.back).not.toHaveBeenCalled()
    })

    it('cancel() cancels the shepherd tour', () => {
      const instance = provider.createTour({ steps })
      instance.start()
      instance.cancel()
      expect(lastTour().cancel).toHaveBeenCalledTimes(1)
    })

    it('complete() completes the shepherd tour', () => {
      const instance = provider.createTour({ steps })
      instance.start()
      instance.complete()
      expect(lastTour().complete).toHaveBeenCalledTimes(1)
    })
  })

  describe('shepherd events sync the core state', () => {
    it("show event updates getCurrentStep from the shown step's index", () => {
      const instance = provider.createTour({ steps })
      instance.start()
      const tour = lastTour()

      tour.showStep(2)
      expect(instance.getCurrentStep()).toBe(2)
      tour.showStep(1)
      expect(instance.getCurrentStep()).toBe(1)
    })

    it('complete event deactivates the tour and fires onComplete', () => {
      const onComplete = vi.fn()
      const instance = provider.createTour({ steps, onComplete })
      instance.start()
      expect(instance.isActive()).toBe(true)

      lastTour().emit('complete')
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(instance.isActive()).toBe(false)
    })

    it('cancel event deactivates the tour and fires onCancel', () => {
      const onCancel = vi.fn()
      const instance = provider.createTour({ steps, onCancel })
      instance.start()

      lastTour().emit('cancel')
      expect(onCancel).toHaveBeenCalledTimes(1)
      expect(instance.isActive()).toBe(false)
    })

    it('start event (re)activates the tour and resets to step 0', () => {
      const instance = provider.createTour({ steps })
      const tour = lastTour()
      tour.emit('start')
      expect(instance.isActive()).toBe(true)
      expect(instance.getCurrentStep()).toBe(0)
    })
  })

  describe('overlay / showButtons flags', () => {
    it('defaults hasOverlay/hasButtons to true when unset', () => {
      const tour = provider.createTour({ steps })
      expect(tour.hasOverlay()).toBe(true)
      expect(tour.hasButtons()).toBe(true)
    })

    it('reflects per-tour overlay/showButtons options in the instance', () => {
      const off = provider.createTour({ steps, overlay: false, showButtons: false })
      expect(off.hasOverlay()).toBe(false)
      expect(off.hasButtons()).toBe(false)
    })

    it('applies provider-level config as the default', () => {
      const p = createProvider({ overlay: false, showButtons: false })
      const tour = p.createTour({ steps })
      expect(tour.hasOverlay()).toBe(false)
      expect(tour.hasButtons()).toBe(false)
    })

    it('lets a per-tour option override the provider-level default', () => {
      const p = createProvider({ overlay: false, showButtons: false })
      const tour = p.createTour({ steps, overlay: true, showButtons: true })
      expect(tour.hasOverlay()).toBe(true)
      expect(tour.hasButtons()).toBe(true)
    })
  })
})
