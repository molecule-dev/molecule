/**
 * Unit tests for `<VoteCluster>` — Reddit/HN-style upvote/downvote cluster.
 * Mocks the ClassMap + i18n bonds so tests don't require a fully-bonded app.
 *
 * @module
 */

// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...args: unknown[]) => args.flat().filter(Boolean).join(' '),
    flex: () => 'flex',
    textSize: () => 'text',
    fontWeight: () => 'fw',
  }),
}))

vi.mock('@molecule/app-react', () => ({
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
import { VoteCluster } from '../VoteCluster.js'

afterEach(() => {
  cleanup()
})

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
      const { container } = render(<VoteCluster score={42} onVote={() => {}} />)
      const { up, down, score } = getParts(container)
      expect(up).not.toBeNull()
      expect(down).not.toBeNull()
      expect(score).not.toBeNull()
      expect(score.textContent).toBe('42')
    })

    it('renders negative scores verbatim', () => {
      const { container } = render(<VoteCluster score={-7} onVote={() => {}} />)
      const { score } = getParts(container)
      expect(score.textContent).toBe('-7')
    })

    it('groups the cluster with role="group" + accessible label', () => {
      render(<VoteCluster score={3} onVote={() => {}} />)
      const group = screen.getByRole('group')
      expect(group).toBeDefined()
      expect(group.getAttribute('aria-label')).toContain('3')
    })

    it('honors an explicit ariaLabel prop', () => {
      render(<VoteCluster score={1} ariaLabel="Vote on post" onVote={() => {}} />)
      expect(screen.getByRole('group').getAttribute('aria-label')).toBe('Vote on post')
    })

    it('forwards dataMolId for agent automation', () => {
      const { container } = render(
        <VoteCluster score={0} dataMolId="post-vote" onVote={() => {}} />,
      )
      const group = container.querySelector('[role="group"]')
      expect(group?.getAttribute('data-mol-id')).toBe('post-vote')
    })
  })

  describe('uncontrolled mode', () => {
    it('emits 1 on first up-click and toggles aria-pressed', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} onVote={onVote} />)
      const { up } = getParts(container)
      fireEvent.click(up)
      expect(onVote).toHaveBeenCalledTimes(1)
      expect(onVote).toHaveBeenLastCalledWith(1)
      expect(up.getAttribute('aria-pressed')).toBe('true')
    })

    it('emits -1 on first down-click', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} onVote={onVote} />)
      const { down } = getParts(container)
      fireEvent.click(down)
      expect(onVote).toHaveBeenLastCalledWith(-1)
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles up→cleared (1 → 0) when up is clicked twice', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} onVote={onVote} />)
      const { up } = getParts(container)
      fireEvent.click(up)
      fireEvent.click(up)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0])
      expect(up.getAttribute('aria-pressed')).toBe('false')
    })

    it('swaps up→down (1 → -1) when the opposite arrow is clicked', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} onVote={onVote} />)
      const { up, down } = getParts(container)
      fireEvent.click(up)
      fireEvent.click(down)
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, -1])
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(down.getAttribute('aria-pressed')).toBe('true')
    })

    it('walks the full toggle cycle 1 → 0 → -1 → 0 → 1', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} onVote={onVote} />)
      const { up, down } = getParts(container)
      fireEvent.click(up) // 0 → 1
      fireEvent.click(up) // 1 → 0
      fireEvent.click(down) // 0 → -1
      fireEvent.click(down) // -1 → 0
      fireEvent.click(up) // 0 → 1
      expect(onVote.mock.calls.map((c) => c[0])).toEqual([1, 0, -1, 0, 1])
    })

    it('honors defaultVote when starting already-upvoted', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} defaultVote={1} onVote={onVote} />)
      const { up } = getParts(container)
      expect(up.getAttribute('aria-pressed')).toBe('true')
      fireEvent.click(up)
      expect(onVote).toHaveBeenLastCalledWith(0)
    })
  })

  describe('controlled mode', () => {
    it('does not flip its internal state when myVote stays the same', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} myVote={0} onVote={onVote} />)
      const { up } = getParts(container)
      fireEvent.click(up)
      // Parent never updated `myVote`, so the cluster must keep showing
      // unpressed state (this is the controlled-mode contract).
      expect(up.getAttribute('aria-pressed')).toBe('false')
      expect(onVote).toHaveBeenLastCalledWith(1)
    })

    it('reflects the parent-supplied myVote prop', () => {
      const { container, rerender } = render(<VoteCluster score={5} myVote={1} onVote={() => {}} />)
      const { up: upA } = getParts(container)
      expect(upA.getAttribute('aria-pressed')).toBe('true')

      rerender(<VoteCluster score={5} myVote={-1} onVote={() => {}} />)
      const { up: upB, down: downB } = getParts(container)
      expect(upB.getAttribute('aria-pressed')).toBe('false')
      expect(downB.getAttribute('aria-pressed')).toBe('true')
    })

    it('toggles via the parent state machine — 1 → 0 → -1', () => {
      const calls: VoteValue[] = []

      /** Controlled host component that threads its own state through `myVote`. */
      function Host(): React.JSX.Element {
        const [vote, setVote] = useState<VoteValue>(0)
        return (
          <VoteCluster
            score={10}
            myVote={vote}
            onVote={(next) => {
              calls.push(next)
              setVote(next)
            }}
          />
        )
      }

      const { container } = render(<Host />)
      const parts = (): {
        up: HTMLButtonElement
        down: HTMLButtonElement
        score: HTMLSpanElement
      } => getParts(container)
      fireEvent.click(parts().up) // 0 → 1
      fireEvent.click(parts().up) // 1 → 0
      fireEvent.click(parts().down) // 0 → -1
      expect(calls).toEqual([1, 0, -1])
      expect(parts().down.getAttribute('aria-pressed')).toBe('true')
    })
  })

  describe('accessibility', () => {
    it('localizes the up-button label and swaps it when pressed', () => {
      const { container, rerender } = render(<VoteCluster score={5} myVote={0} onVote={() => {}} />)
      const { up: upA } = getParts(container)
      expect(upA.getAttribute('aria-label')).toBe('Upvote')

      rerender(<VoteCluster score={5} myVote={1} onVote={() => {}} />)
      const { up: upB } = getParts(container)
      expect(upB.getAttribute('aria-label')).toBe('Remove upvote')
    })

    it('localizes the down-button label and swaps it when pressed', () => {
      const { container, rerender } = render(<VoteCluster score={5} myVote={0} onVote={() => {}} />)
      const { down: downA } = getParts(container)
      expect(downA.getAttribute('aria-label')).toBe('Downvote')

      rerender(<VoteCluster score={5} myVote={-1} onVote={() => {}} />)
      const { down: downB } = getParts(container)
      expect(downB.getAttribute('aria-label')).toBe('Remove downvote')
    })

    it('exposes an aria-live="polite" score so screen readers announce score changes', () => {
      const { container } = render(<VoteCluster score={5} onVote={() => {}} />)
      const { score } = getParts(container)
      expect(score.getAttribute('aria-live')).toBe('polite')
    })
  })

  describe('disabled', () => {
    it('disables both buttons and suppresses onVote when clicked', () => {
      const onVote = vi.fn()
      const { container } = render(<VoteCluster score={5} disabled onVote={onVote} />)
      const { up, down } = getParts(container)
      expect(up.disabled).toBe(true)
      expect(down.disabled).toBe(true)
      fireEvent.click(up)
      fireEvent.click(down)
      expect(onVote).not.toHaveBeenCalled()
    })
  })

  describe('layout', () => {
    it("defaults to vertical direction and accepts 'horizontal'", () => {
      const { container, rerender } = render(<VoteCluster score={1} onVote={() => {}} />)
      // Just verifies the prop wires through render without throwing — the
      // exact class string is bond-specific so we don't pin it here.
      expect(container.querySelector('[role="group"]')).not.toBeNull()
      rerender(<VoteCluster score={1} direction="horizontal" onVote={() => {}} />)
      expect(container.querySelector('[role="group"]')).not.toBeNull()
    })
  })
})
