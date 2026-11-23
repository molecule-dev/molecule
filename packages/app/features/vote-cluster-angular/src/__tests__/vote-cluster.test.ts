// @vitest-environment jsdom
/**
 * Unit tests of the Angular `VoteCluster` — the port of
 * `@molecule/app-vote-cluster-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer and asserts the
 * same behavior.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
      let s = opts?.defaultValue ?? _key
      if (values) {
        for (const [k, v] of Object.entries(values)) {
          s = s.replaceAll(`{{${k}}}`, String(v))
        }
      }
      return s
    },
  }),
}))

const { VoteCluster } = await import('../vote-cluster.component.js')

import type { VoteValue } from '../types.js'

/** A mounted spec host: its DOM, a props setter, a CD flush, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Flushes change detection. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The host template every test mounts: the component with every input bound. */
const TEMPLATE = `<div mol-vote-cluster [score]="p['score']" [myVote]="p['myVote']" [defaultVote]="p['defaultVote']" [onVote]="p['onVote']" [disabled]="p['disabled']" [direction]="p['direction']" [ariaLabel]="p['ariaLabel']" [dataMolId]="p['dataMolId']" [className]="p['className']"></div>`

/**
 * Mounts the standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-vote-cluster-spec-host',
    standalone: true,
    imports: [VoteCluster],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: TEMPLATE,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const handle: Mounted = {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    tick: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(handle)
  return handle
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/** The component element (the outer `<div>`). */
const root = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('[mol-vote-cluster]')
  if (!el) throw new Error('no VoteCluster host rendered')
  return el as HTMLElement
}

/** Helper that grabs the up/down/score elements via stable `data-vote` hooks. */
function getParts(container: HTMLElement): {
  up: HTMLButtonElement
  down: HTMLButtonElement
  score: HTMLSpanElement
} {
  return {
    up: container.querySelector('[data-vote="up"]') as HTMLButtonElement,
    down: container.querySelector('[data-vote="down"]') as HTMLButtonElement,
    score: container.querySelector('[data-vote="score"]') as HTMLSpanElement,
  }
}

/**
 * Clicks an element and flushes change detection.
 *
 * @param m - The mounted host.
 * @param el - The element to click.
 */
function click(m: Mounted, el: HTMLElement): void {
  el.click()
  m.tick()
}

describe('<VoteCluster>', () => {
  describe('rendering', () => {
    it('renders the score, up button, and down button', async () => {
      const m = await mount({ score: 42, onVote: () => {} })
      const { up, down, score } = getParts(root(m.host))
      expect(up).not.toBeNull()
      expect(down).not.toBeNull()
      expect(score).not.toBeNull()
      expect(score.textContent).toBe('42')
    })

    it('renders negative scores verbatim', async () => {
      const m = await mount({ score: -7, onVote: () => {} })
      const { score } = getParts(root(m.host))
      expect(score.textContent).toBe('-7')
    })

    it('groups the cluster with role="group" + accessible label', async () => {
      const m = await mount({ score: 3, onVote: () => {} })
      const group = root(m.host)
      expect(group).toBeDefined()
      expect(group.getAttribute('role')).toBe('group')
      expect(group.getAttribute('aria-label')).toContain('3')
    })

    it('honors an explicit ariaLabel prop', async () => {
      const m = await mount({ score: 1, ariaLabel: 'Vote on post', onVote: () => {} })
      expect(root(m.host).getAttribute('aria-label')).toBe('Vote on post')
    })

    it('forwards dataMolId for agent automation', async () => {
      const m = await mount({ score: 0, dataMolId: 'post-vote', onVote: () => {} })
      expect(root(m.host).getAttribute('data-mol-id')).toBe('post-vote')
    })
  })

  describe('uncontrolled mode', () => {
    it('emits 1 on first up-click and toggles aria-pressed', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, onVote })
      const { up } = getParts(root(m.host))
      click(m, up)
      expect(onVote).toHaveBeenCalledTimes(1)
      expect(onVote).toHaveBeenLastCalledWith(1)
      expect(up.getAttribute('aria-pressed')).toBe('true')
    })

    it('emits -1 on first down-click', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, onVote })
      const { down } = getParts(root(m.host))
      click(m, down)
      expect(onVote).toHaveBeenLastCalledWith(-1)
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles up→cleared (1 → 0) when up is clicked twice', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, onVote })
      const { up } = getParts(root(m.host))
      click(m, up)
      click(m, up)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0])
      expect(up.getAttribute('aria-pressed')).toBe('false')
    })

    it('swaps up→down (1 → -1) when the opposite arrow is clicked', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, onVote })
      const { up, down } = getParts(root(m.host))
      click(m, up)
      click(m, down)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, -1])
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('walks the full toggle cycle 1 → 0 → -1 → 0 → 1', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, onVote })
      const { up, down } = getParts(root(m.host))
      click(m, up) // 0 → 1
      click(m, up) // 1 → 0
      click(m, down) // 0 → -1
      click(m, down) // -1 → 0
      click(m, up) // 0 → 1
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0, -1, 0, 1])
    })

    it('honors defaultVote when starting already-upvoted', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, defaultVote: 1, onVote })
      const { up } = getParts(root(m.host))
      expect(up.getAttribute('aria-pressed')).toBe('true')
      click(m, up)
      expect(onVote).toHaveBeenLastCalledWith(0)
    })
  })

  describe('controlled mode', () => {
    it('does not flip its internal state when myVote stays the same', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, myVote: 0, onVote })
      const { up } = getParts(root(m.host))
      click(m, up)
      // Parent never updated `myVote`, so the cluster must keep showing
      // unpressed state (this is the controlled-mode contract).
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(onVote).toHaveBeenLastCalledWith(1)
    })

    it('reflects the parent-supplied myVote prop', async () => {
      const m = await mount({ score: 5, myVote: 1, onVote: () => {} })
      expect(getParts(root(m.host)).up.getAttribute('aria-pressed')).toBe('true')

      await m.setProps({ myVote: -1 })
      const { up, down } = getParts(root(m.host))
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles via the parent state machine — 1 → 0 → -1', async () => {
      const Host = Component({
        selector: 'mol-vote-cluster-controlled-host',
        standalone: true,
        imports: [VoteCluster],
        changeDetection: ChangeDetectionStrategy.Eager,
        template: `<div mol-vote-cluster [score]="10" [myVote]="vote" [onVote]="adopt"></div>`,
      })(
        class ControlledHost {
          /** The parent-owned vote (React's `useState`). */
          vote: VoteValue = 0
          /** Every emitted vote, in order. */
          calls: VoteValue[] = []
          /**
           * Adopts the emitted vote.
           * @param next - The vote the cluster emitted.
           */
          adopt = (next: VoteValue): void => {
            this.calls.push(next)
            this.vote = next
          }
        },
      )
      const appRef: ApplicationRef = await createApplication({
        providers: [provideZonelessChangeDetection()],
      })
      const ref = createComponent(Host, { environmentInjector: appRef.injector })
      const host = ref.location.nativeElement as HTMLElement
      document.body.appendChild(host)
      appRef.attachView(ref.hostView)
      appRef.tick()
      const handle: Mounted = {
        host,
        setProps: async () => {},
        tick: () => appRef.tick(),
        destroy: async () => {
          appRef.destroy()
          host.remove()
        },
      }
      mounted.push(handle)

      click(handle, getParts(root(host)).up) // 0 → 1
      click(handle, getParts(root(host)).up) // 1 → 0
      click(handle, getParts(root(host)).down) // 0 → -1
      expect(ref.instance.calls).toEqual([1, 0, -1])
      expect(getParts(root(host)).down.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('accessibility', () => {
    it('localizes the up-button label and swaps it when pressed', async () => {
      const m = await mount({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(root(m.host)).up.getAttribute('aria-label')).toBe('Upvote')

      await m.setProps({ myVote: 1 })
      expect(getParts(root(m.host)).up.getAttribute('aria-label')).toBe('Remove upvote')
    })

    it('localizes the down-button label and swaps it when pressed', async () => {
      const m = await mount({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(root(m.host)).down.getAttribute('aria-label')).toBe('Downvote')

      await m.setProps({ myVote: -1 })
      expect(getParts(root(m.host)).down.getAttribute('aria-label')).toBe('Remove downvote')
    })

    it('exposes an aria-live="polite" score so screen readers announce score changes', async () => {
      const m = await mount({ score: 5, onVote: () => {} })
      const { score } = getParts(root(m.host))
      expect(score.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('disabled', () => {
    it('disables both buttons and suppresses onVote when clicked', async () => {
      const onVote = vi.fn()
      const m = await mount({ score: 5, disabled: true, onVote })
      const { up, down } = getParts(root(m.host))
      expect(up.disabled).toBe(true)
      expect(down.disabled).toBe(true)
      click(m, up)
      click(m, down)
      expect(onVote).not.toHaveBeenCalled()
    })
  })

  describe('layout', () => {
    it("defaults to vertical direction and accepts 'horizontal'", async () => {
      const vertical = await mount({ score: 1, onVote: () => {} })
      expect(root(vertical.host)).not.toBeNull()
      const horizontal = await mount({ score: 1, direction: 'horizontal', onVote: () => {} })
      expect(root(horizontal.host)).not.toBeNull()
    })
  })
})
