// @vitest-environment jsdom
/**
 * Unit tests for the Solid `<VoteCluster>` — a port of
 * `@molecule/app-vote-cluster-react/src/__tests__/VoteCluster.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-solid', async (importOriginal) => ({
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

import type { VoteClusterProps, VoteValue } from '../types.js'

const { VoteCluster } = await import('../VoteCluster.jsx')

/** A mounted cluster: its host element, a props setter, and a teardown. */
interface Mounted {
  /** The element the cluster rendered into. */
  host: HTMLElement
  /** Merges props over the current ones. */
  setProps(next: Partial<VoteClusterProps>): void
  /** Disposes the render and removes its host. */
  destroy(): void
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const m of mounted.splice(0)) m.destroy()
})

/**
 * Mounts {@link VoteCluster} with reactive props.
 *
 * @param initial - The initial props.
 * @returns The mounted cluster.
 */
function mount(initial: VoteClusterProps): Mounted {
  const [props, setProps] = createSignal<VoteClusterProps>({ ...initial })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const dispose = render(() => <VoteCluster {...props()} />, host)
  const handle: Mounted = {
    host,
    setProps: (next) => setProps({ ...props(), ...next }),
    destroy: () => {
      dispose()
      host.remove()
    },
  }
  mounted.push(handle)
  return handle
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

describe('<VoteCluster>', () => {
  describe('rendering', () => {
    it('renders the score, up button, and down button', () => {
      const { host } = mount({ score: 42, onVote: () => {} })
      const { up, down, score } = getParts(host)
      expect(up).not.toBeNull()
      expect(down).not.toBeNull()
      expect(score).not.toBeNull()
      expect(score.textContent).toBe('42')
    })

    it('renders negative scores verbatim', () => {
      const { host } = mount({ score: -7, onVote: () => {} })
      const { score } = getParts(host)
      expect(score.textContent).toBe('-7')
    })

    it('groups the cluster with role="group" + accessible label', () => {
      const { host } = mount({ score: 3, onVote: () => {} })
      const group = host.querySelector('[role="group"]')
      expect(group).toBeDefined()
      expect(group?.getAttribute('aria-label')).toContain('3')
    })

    it('honors an explicit ariaLabel prop', () => {
      const { host } = mount({ score: 1, ariaLabel: 'Vote on post', onVote: () => {} })
      expect(host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Vote on post')
    })

    it('forwards dataMolId for agent automation', () => {
      const { host } = mount({ score: 0, dataMolId: 'post-vote', onVote: () => {} })
      expect(host.querySelector('[role="group"]')?.getAttribute('data-mol-id')).toBe('post-vote')
    })
  })

  describe('uncontrolled mode', () => {
    it('emits 1 on first up-click and toggles aria-pressed', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up } = getParts(host)
      up.click()
      expect(onVote).toHaveBeenCalledTimes(1)
      expect(onVote).toHaveBeenLastCalledWith(1)
      expect(up.getAttribute('aria-pressed')).toBe('true')
    })

    it('emits -1 on first down-click', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { down } = getParts(host)
      down.click()
      expect(onVote).toHaveBeenLastCalledWith(-1)
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles up→cleared (1 → 0) when up is clicked twice', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up } = getParts(host)
      up.click()
      up.click()
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0])
      expect(up.getAttribute('aria-pressed')).toBe('false')
    })

    it('swaps up→down (1 → -1) when the opposite arrow is clicked', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up, down } = getParts(host)
      up.click()
      down.click()
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, -1])
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('walks the full toggle cycle 1 → 0 → -1 → 0 → 1', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up, down } = getParts(host)
      up.click() // 0 → 1
      up.click() // 1 → 0
      down.click() // 0 → -1
      down.click() // -1 → 0
      up.click() // 0 → 1
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0, -1, 0, 1])
    })

    it('honors defaultVote when starting already-upvoted', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, defaultVote: 1, onVote })
      const { up } = getParts(host)
      expect(up.getAttribute('aria-pressed')).toBe('true')
      up.click()
      expect(onVote).toHaveBeenLastCalledWith(0)
    })
  })

  describe('controlled mode', () => {
    it('does not flip its internal state when myVote stays the same', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, myVote: 0, onVote })
      const { up } = getParts(host)
      up.click()
      // Parent never updated `myVote`, so the cluster must keep showing
      // unpressed state (this is the controlled-mode contract).
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(onVote).toHaveBeenLastCalledWith(1)
    })

    it('reflects the parent-supplied myVote prop', () => {
      const m = mount({ score: 5, myVote: 1, onVote: () => {} })
      expect(getParts(m.host).up.getAttribute('aria-pressed')).toBe('true')

      m.setProps({ myVote: -1 })
      const { up, down } = getParts(m.host)
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles via the parent state machine — 1 → 0 → -1', () => {
      const calls: VoteValue[] = []
      const [vote, setVote] = createSignal<VoteValue>(0)
      const host = document.createElement('div')
      document.body.appendChild(host)
      const dispose = render(
        () => (
          <VoteCluster
            score={10}
            myVote={vote()}
            onVote={(next) => {
              calls.push(next)
              setVote(next)
            }}
          />
        ),
        host,
      )
      mounted.push({
        host,
        setProps: () => {},
        destroy: () => {
          dispose()
          host.remove()
        },
      })

      const parts = (): {
        up: HTMLButtonElement
        down: HTMLButtonElement
        score: HTMLSpanElement
      } => getParts(host)
      parts().up.click() // 0 → 1
      parts().up.click() // 1 → 0
      parts().down.click() // 0 → -1
      expect(calls).toEqual([1, 0, -1])
      expect(parts().down.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('accessibility', () => {
    it('localizes the up-button label and swaps it when pressed', () => {
      const m = mount({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(m.host).up.getAttribute('aria-label')).toBe('Upvote')

      m.setProps({ myVote: 1 })
      expect(getParts(m.host).up.getAttribute('aria-label')).toBe('Remove upvote')
    })

    it('localizes the down-button label and swaps it when pressed', () => {
      const m = mount({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(m.host).down.getAttribute('aria-label')).toBe('Downvote')

      m.setProps({ myVote: -1 })
      expect(getParts(m.host).down.getAttribute('aria-label')).toBe('Remove downvote')
    })

    it('exposes an aria-live="polite" score so screen readers announce score changes', () => {
      const { host } = mount({ score: 5, onVote: () => {} })
      const { score } = getParts(host)
      expect(score.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('disabled', () => {
    it('disables both buttons and suppresses onVote when clicked', () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, disabled: true, onVote })
      const { up, down } = getParts(host)
      expect(up.disabled).toBe(true)
      expect(down.disabled).toBe(true)
      up.click()
      down.click()
      expect(onVote).not.toHaveBeenCalled()
    })
  })

  describe('layout', () => {
    it("defaults to vertical direction and accepts 'horizontal'", () => {
      const vertical = mount({ score: 1, onVote: () => {} })
      expect(vertical.host.querySelector('[role="group"]')).not.toBeNull()
      const horizontal = mount({ score: 1, direction: 'horizontal', onVote: () => {} })
      expect(horizontal.host.querySelector('[role="group"]')).not.toBeNull()
    })
  })
})
