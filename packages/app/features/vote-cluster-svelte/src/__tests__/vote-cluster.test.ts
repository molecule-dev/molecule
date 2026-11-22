// @vitest-environment jsdom
/**
 * Unit tests for `VoteCluster` — a port of
 * `@molecule/app-vote-cluster-react/src/__tests__/VoteCluster.test.tsx`: the
 * same behavioral assertions, rendered with Svelte in jsdom.
 *
 * @module
 */

import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-svelte', async (importOriginal) => ({
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

import type { VoteValue } from '../types.js'
import VoteCluster from '../VoteCluster.svelte'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts {@link VoteCluster} with the given props.
 *
 * @param props - The component props.
 * @returns The element the component rendered into.
 */
function render(props: ComponentProps<typeof VoteCluster>): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(VoteCluster, { target, props }))
  flushSync()
  return target
}

/** Helper that grabs the up/down/score elements via stable `data-vote` hooks. */
function getParts(container: HTMLElement): {
  up: HTMLButtonElement
  down: HTMLButtonElement
  score: HTMLSpanElement
} {
  const up = container.querySelector<HTMLButtonElement>('[data-vote="up"]')
  const down = container.querySelector<HTMLButtonElement>('[data-vote="down"]')
  const score = container.querySelector<HTMLSpanElement>('[data-vote="score"]')
  if (!up || !down || !score) throw new Error('vote cluster is missing a data-vote element')
  return { up, down, score }
}

/**
 * Clicks an element and flushes Svelte's updates.
 *
 * @param el - The element to click.
 */
function click(el: HTMLElement): void {
  el.click()
  flushSync()
}

describe('<VoteCluster>', () => {
  describe('rendering', () => {
    it('renders the score, up button, and down button', () => {
      const host = render({ score: 42, onVote: () => {} })
      const { up, down, score } = getParts(host)
      expect(up).not.toBeNull()
      expect(down).not.toBeNull()
      expect(score).not.toBeNull()
      expect(score.textContent).toBe('42')
    })

    it('renders negative scores verbatim', () => {
      const host = render({ score: -7, onVote: () => {} })
      const { score } = getParts(host)
      expect(score.textContent).toBe('-7')
    })

    it('groups the cluster with role="group" + accessible label', () => {
      const host = render({ score: 3, onVote: () => {} })
      const group = host.querySelector('[role="group"]')
      expect(group).toBeDefined()
      expect(group?.getAttribute('aria-label')).toContain('3')
    })

    it('honors an explicit ariaLabel prop', () => {
      const host = render({ score: 1, ariaLabel: 'Vote on post', onVote: () => {} })
      expect(host.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Vote on post')
    })

    it('forwards dataMolId for agent automation', () => {
      const host = render({ score: 0, dataMolId: 'post-vote', onVote: () => {} })
      expect(host.querySelector('[role="group"]')?.getAttribute('data-mol-id')).toBe('post-vote')
    })
  })

  describe('uncontrolled mode', () => {
    it('emits 1 on first up-click and toggles aria-pressed', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, onVote })
      const { up } = getParts(host)
      click(up)
      expect(onVote).toHaveBeenCalledTimes(1)
      expect(onVote).toHaveBeenLastCalledWith(1)
      expect(up.getAttribute('aria-pressed')).toBe('true')
    })

    it('emits -1 on first down-click', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, onVote })
      const { down } = getParts(host)
      click(down)
      expect(onVote).toHaveBeenLastCalledWith(-1)
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles up→cleared (1 → 0) when up is clicked twice', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, onVote })
      const { up } = getParts(host)
      click(up)
      click(up)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0])
      expect(up.getAttribute('aria-pressed')).toBe('false')
    })

    it('swaps up→down (1 → -1) when the opposite arrow is clicked', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, onVote })
      const { up, down } = getParts(host)
      click(up)
      click(down)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, -1])
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('walks the full toggle cycle 1 → 0 → -1 → 0 → 1', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, onVote })
      const { up, down } = getParts(host)
      click(up) // 0 → 1
      click(up) // 1 → 0
      click(down) // 0 → -1
      click(down) // -1 → 0
      click(up) // 0 → 1
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0, -1, 0, 1])
    })

    it('honors defaultVote when starting already-upvoted', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, defaultVote: 1, onVote })
      const { up } = getParts(host)
      expect(up.getAttribute('aria-pressed')).toBe('true')
      click(up)
      expect(onVote).toHaveBeenLastCalledWith(0)
    })
  })

  describe('controlled mode', () => {
    it('does not flip its internal state when myVote stays the same', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, myVote: 0, onVote })
      const { up } = getParts(host)
      click(up)
      // Parent never updated `myVote`, so the cluster must keep showing
      // unpressed state (this is the controlled-mode contract).
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(onVote).toHaveBeenLastCalledWith(1)
    })

    it('reflects the parent-supplied myVote prop', () => {
      const pressed = render({ score: 5, myVote: 1, onVote: () => {} })
      expect(getParts(pressed).up.getAttribute('aria-pressed')).toBe('true')

      const swapped = render({ score: 5, myVote: -1, onVote: () => {} })
      const { up, down } = getParts(swapped)
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles via the parent state machine — 1 → 0 → -1', () => {
      const calls: VoteValue[] = []
      let vote: VoteValue = 0
      // The parent owns the vote: each click re-mounts with the value the
      // parent adopted, as React's `useState` host re-renders.
      for (const arrow of ['up', 'up', 'down'] as const) {
        const host = render({
          score: 10,
          myVote: vote,
          onVote: (next: VoteValue) => {
            calls.push(next)
            vote = next
          },
        })
        click(getParts(host)[arrow])
      }
      expect(calls).toEqual([1, 0, -1])
      const adopted = render({ score: 10, myVote: vote, onVote: () => {} })
      expect(getParts(adopted).down.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('accessibility', () => {
    it('localizes the up-button label and swaps it when pressed', () => {
      const plain = render({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(plain).up.getAttribute('aria-label')).toBe('Upvote')

      const pressed = render({ score: 5, myVote: 1, onVote: () => {} })
      expect(getParts(pressed).up.getAttribute('aria-label')).toBe('Remove upvote')
    })

    it('localizes the down-button label and swaps it when pressed', () => {
      const plain = render({ score: 5, myVote: 0, onVote: () => {} })
      expect(getParts(plain).down.getAttribute('aria-label')).toBe('Downvote')

      const pressed = render({ score: 5, myVote: -1, onVote: () => {} })
      expect(getParts(pressed).down.getAttribute('aria-label')).toBe('Remove downvote')
    })

    it('exposes an aria-live="polite" score so screen readers announce score changes', () => {
      const host = render({ score: 5, onVote: () => {} })
      const { score } = getParts(host)
      expect(score.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('disabled', () => {
    it('disables both buttons and suppresses onVote when clicked', () => {
      const onVote = vi.fn()
      const host = render({ score: 5, disabled: true, onVote })
      const { up, down } = getParts(host)
      expect(up.disabled).toBe(true)
      expect(down.disabled).toBe(true)
      click(up)
      click(down)
      expect(onVote).not.toHaveBeenCalled()
    })
  })

  describe('layout', () => {
    it("defaults to vertical direction and accepts 'horizontal'", () => {
      const vertical = render({ score: 1, onVote: () => {} })
      expect(vertical.querySelector('[role="group"]')).not.toBeNull()
      const horizontal = render({ score: 1, direction: 'horizontal', onVote: () => {} })
      expect(horizontal.querySelector('[role="group"]')).not.toBeNull()
    })
  })
})
