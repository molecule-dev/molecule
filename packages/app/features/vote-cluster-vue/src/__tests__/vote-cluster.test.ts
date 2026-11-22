// @vitest-environment jsdom
/**
 * Unit tests for the Vue `<VoteCluster>` — a port of
 * `@molecule/app-vote-cluster-react/src/__tests__/VoteCluster.test.tsx`: the
 * same behavioral assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive, ref } from 'vue'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
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
import { VoteCluster } from '../VoteCluster.js'

/** A mounted cluster: its host element, a props setter, and a teardown. */
interface Mounted {
  /** The element the app rendered into. */
  host: HTMLElement
  /** Merges props over the current ones and flushes the re-render. */
  setProps(next: Partial<VoteClusterProps>): Promise<void>
  /** Unmounts the app and removes its host. */
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
  const props = reactive<VoteClusterProps>({ ...initial })
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(VoteCluster, props) }))
  app.mount(host)
  const handle: Mounted = {
    host,
    setProps: async (next) => {
      Object.assign(props, next)
      await nextTick()
    },
    destroy: () => {
      app.unmount()
      host.remove()
    },
  }
  mounted.push(handle)
  return handle
}

/**
 * Clicks an element and flushes Vue's re-render.
 *
 * @param el - The element to click.
 * @returns A promise that settles after the re-render.
 */
async function click(el: HTMLElement): Promise<void> {
  el.click()
  await nextTick()
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
    it('emits 1 on first up-click and toggles aria-pressed', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up } = getParts(host)
      await click(up)
      expect(onVote).toHaveBeenCalledTimes(1)
      expect(onVote).toHaveBeenLastCalledWith(1)
      expect(up.getAttribute('aria-pressed')).toBe('true')
    })

    it('emits -1 on first down-click', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { down } = getParts(host)
      await click(down)
      expect(onVote).toHaveBeenLastCalledWith(-1)
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles up→cleared (1 → 0) when up is clicked twice', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up } = getParts(host)
      await click(up)
      await click(up)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0])
      expect(up.getAttribute('aria-pressed')).toBe('false')
    })

    it('swaps up→down (1 → -1) when the opposite arrow is clicked', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up, down } = getParts(host)
      await click(up)
      await click(down)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, -1])
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('walks the full toggle cycle 1 → 0 → -1 → 0 → 1', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, onVote })
      const { up, down } = getParts(host)
      await click(up) // 0 → 1
      await click(up) // 1 → 0
      await click(down) // 0 → -1
      await click(down) // -1 → 0
      await click(up) // 0 → 1
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0, -1, 0, 1])
    })

    it('honors defaultVote when starting already-upvoted', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, defaultVote: 1, onVote })
      const { up } = getParts(host)
      expect(up.getAttribute('aria-pressed')).toBe('true')
      await click(up)
      expect(onVote).toHaveBeenLastCalledWith(0)
    })
  })

  describe('controlled mode', () => {
    it('does not flip its internal state when myVote stays the same', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, myVote: 0, onVote })
      const { up } = getParts(host)
      await click(up)
      // Parent never updated `myVote`, so the cluster must keep showing
      // unpressed state (this is the controlled-mode contract).
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(onVote).toHaveBeenLastCalledWith(1)
    })

    it('reflects the parent-supplied myVote prop', async () => {
      const m = mount({ score: 5, myVote: 1, onVote: () => {} })
      expect(getParts(m.host).up.getAttribute('aria-pressed')).toBe('true')

      await m.setProps({ myVote: -1 })
      const { up, down } = getParts(m.host)
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles via the parent state machine — 1 → 0 → -1', async () => {
      const calls: VoteValue[] = []
      const vote = ref<VoteValue>(0)
      const host = document.createElement('div')
      document.body.appendChild(host)
      const app = createApp(
        defineComponent({
          render: () =>
            h(VoteCluster, {
              score: 10,
              myVote: vote.value,
              onVote: (next: VoteValue) => {
                calls.push(next)
                vote.value = next
              },
            }),
        }),
      )
      app.mount(host)
      mounted.push({
        host,
        setProps: async () => {},
        destroy: () => {
          app.unmount()
          host.remove()
        },
      })

      const parts = (): {
        up: HTMLButtonElement
        down: HTMLButtonElement
        score: HTMLSpanElement
      } => getParts(host)
      await click(parts().up) // 0 → 1
      await click(parts().up) // 1 → 0
      await click(parts().down) // 0 → -1
      expect(calls).toEqual([1, 0, -1])
      expect(parts().down.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('accessibility', () => {
    it('localizes the up-button label and swaps it when pressed', async () => {
      const m = mount({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(m.host).up.getAttribute('aria-label')).toBe('Upvote')

      await m.setProps({ myVote: 1 })
      expect(getParts(m.host).up.getAttribute('aria-label')).toBe('Remove upvote')
    })

    it('localizes the down-button label and swaps it when pressed', async () => {
      const m = mount({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(m.host).down.getAttribute('aria-label')).toBe('Downvote')

      await m.setProps({ myVote: -1 })
      expect(getParts(m.host).down.getAttribute('aria-label')).toBe('Remove downvote')
    })

    it('exposes an aria-live="polite" score so screen readers announce score changes', () => {
      const { host } = mount({ score: 5, onVote: () => {} })
      const { score } = getParts(host)
      expect(score.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('disabled', () => {
    it('disables both buttons and suppresses onVote when clicked', async () => {
      const onVote = vi.fn()
      const { host } = mount({ score: 5, disabled: true, onVote })
      const { up, down } = getParts(host)
      expect(up.disabled).toBe(true)
      expect(down.disabled).toBe(true)
      await click(up)
      await click(down)
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
