/**
 * The `children` step: the cases the kit derives for every family while `CONFORMANCE_CHILDREN_STEP=1`
 * is set, the lists an adapter renders at mount and after each step, the key rules a case's lists
 * follow, and the runner's refusal of an adapter that cannot change a case's children.
 *
 * A plain DOM "component" stands in for a framework here.
 *
 * @module
 */

import '../ui/setup.js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CallRecorder,
  changingLists,
  checkNodeKeys,
  childListStates,
  CHILDREN_STEP_SWITCH,
  type ChildrenStep,
  hasChildSteps,
  initialChildLists,
  type MountedCase,
  nextChildLists,
  nodeIdentity,
  runSteps,
  settle,
  snapshotsWithEmptiedList,
  type UICase,
  type UIComponentCases,
  withChildSteps,
} from '../ui/index.js'

const row = (text: string): { tag: string; children: string[] } => ({ tag: 'li', children: [text] })

const family: UIComponentCases = {
  component: 'List',
  cases: [
    { name: 'gone', children: [row('x'), row('y')], interactions: [{ type: 'unmount' }] },
    { name: 'rows', children: [row('a'), row('b')], props: { dense: true } },
    {
      name: 'with footer',
      slots: { footer: ['Total'] },
      interactions: [{ type: 'focus', selector: 'ul' }],
    },
    { name: 'empty footer', slots: { footer: [] } },
  ],
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('withChildSteps', () => {
  it('derives nothing while the switch is unset', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '')
    expect(withChildSteps(family)).toBe(family)
  })

  it('changes the first list of element children: insert, remove, reverse, empty, refill', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const cases = withChildSteps(family).cases
    const changed = cases.find((c) => c.name === 'rows, then children change')!
    const keyed = [
      { ...row('a'), key: '0' },
      { ...row('b'), key: '1' },
    ]
    const added = { ...row('a'), key: 'new' }
    expect(changed.props).toEqual({ dense: true })
    expect(changed.children).toEqual(keyed)
    expect(changed.interactions).toEqual([
      { type: 'children', children: [keyed[0], added, keyed[1]] },
      { type: 'children', children: [added, keyed[1]] },
      { type: 'children', children: [keyed[1], added] },
      { type: 'children', children: [] },
      { type: 'children', children: keyed },
    ])
  })

  it('skips a case that ends unmounted, keeps the base steps, and empties and refills each slot', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const names = withChildSteps(family).cases.map((c) => c.name)
    expect(names).not.toContain('gone, then children change')
    const footer = withChildSteps(family).cases.find(
      (c) => c.name === 'with footer, then footer emptied and refilled',
    )!
    expect(footer.interactions).toEqual([
      { type: 'focus', selector: 'ul' },
      { type: 'children', slots: { footer: [] } },
      { type: 'children', slots: { footer: ['Total'] } },
    ])
  })

  it('empties and refills children that are not a list of elements', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const text: UIComponentCases = {
      component: 'Label',
      cases: [{ name: 'text', children: ['Name'] }],
    }
    expect(withChildSteps(text).cases[1]).toEqual({
      name: 'text, then children emptied and refilled',
      children: ['Name'],
      interactions: [
        { type: 'children', children: [] },
        { type: 'children', children: ['Name'] },
      ],
    })
  })

  it('refuses a derived name another case already has', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    expect(() =>
      withChildSteps({
        component: 'List',
        cases: [
          { name: 'rows', children: [row('a'), row('b')] },
          { name: 'rows, then children change' },
        ],
      }),
    ).toThrow('has the name of another case')
  })
})

describe('child lists', () => {
  const testCase: UICase = {
    name: 'lists',
    slots: { header: ['Title'] },
    interactions: [
      { type: 'children', slots: { footer: ['End'] } },
      { type: 'children', children: [row('a')] },
    ],
  }

  it('starts every list a step passes as [] from mount, and replaces only what a step names', () => {
    expect(hasChildSteps(testCase)).toBe(true)
    expect(hasChildSteps({ name: 'none' })).toBe(false)
    expect(initialChildLists(testCase)).toEqual({
      children: [],
      slots: { header: ['Title'], footer: [] },
    })
    expect(childListStates(testCase)).toEqual([
      { children: [], slots: { header: ['Title'], footer: [] } },
      { children: [], slots: { header: ['Title'], footer: ['End'] } },
      { children: [row('a')], slots: { header: ['Title'], footer: ['End'] } },
    ])
    expect(nextChildLists({ slots: {} }, { type: 'children', slots: { a: [] } })).toEqual({
      slots: { a: [] },
    })
  })

  it('identifies a node by its key, else its position, with its content', () => {
    expect(nodeIdentity({ ...row('a'), key: 'k' }, 3)).toBe(
      nodeIdentity({ ...row('a'), key: 'k' }, 0),
    )
    expect(nodeIdentity(row('a'), 0)).not.toBe(nodeIdentity(row('a'), 1))
    expect(nodeIdentity(row('a'), 0)).not.toBe(nodeIdentity(row('b'), 0))
  })
})

describe('changingLists and snapshotsWithEmptiedList', () => {
  const testCase: UICase = {
    name: 'title emptied',
    children: ['Body'],
    slots: { title: ['Rename'], footer: ['End'] },
    interactions: [
      { type: 'focus', selector: 'input' },
      { type: 'children', slots: { title: [] } },
      { type: 'click', selector: 'button' },
      { type: 'children', slots: { title: ['Rename'] } },
    ],
  }

  it('names only the lists a step replaces', () => {
    const changing = changingLists(testCase)
    expect(changing.children).toBe(false)
    expect([...changing.slots]).toEqual(['title'])
  })

  it('marks the snapshots taken while a list the case mounted with nodes in is empty', () => {
    expect(snapshotsWithEmptiedList(testCase)).toEqual([false, false, true, true, false])
    expect(
      snapshotsWithEmptiedList({ name: 'plain', interactions: [{ type: 'click', selector: 'a' }] }),
    ).toEqual([false, false])
  })
})

describe('checkNodeKeys', () => {
  it('accepts lists keyed in full or not at all', () => {
    expect(() =>
      checkNodeKeys({
        name: 'ok',
        children: ['text', { ...row('a'), key: '0' }, { ...row('b'), key: '1' }],
      }),
    ).not.toThrow()
    expect(() => checkNodeKeys({ name: 'ok', children: [row('a'), row('b')] })).not.toThrow()
  })

  it('refuses a list that keys some nodes, naming where', () => {
    expect(() =>
      checkNodeKeys({
        name: 'mixed',
        interactions: [{ type: 'children', children: [{ ...row('a'), key: '0' }, row('b')] }],
      }),
    ).toThrow('"mixed" keys some nodes of the children of its children step 1 but not all')
  })

  it('refuses two nodes with one key, in a nested list too', () => {
    expect(() =>
      checkNodeKeys({
        name: 'twice',
        slots: {
          footer: [
            {
              tag: 'ul',
              children: [
                { ...row('a'), key: 'k' },
                { ...row('b'), key: 'k' },
              ],
            },
          ],
        },
      }),
    ).toThrow('gives two nodes of the children of a node in its footer slot the key "k"')
  })
})

describe('the step runner', () => {
  /**
   * Mounts a list whose items are the step's text children.
   *
   * @param withSetChildren - Whether the mounted case can change its children.
   * @returns The mount function {@link runSteps} takes.
   */
  const listComponent =
    (withSetChildren: boolean) =>
    async (container: HTMLElement): Promise<MountedCase> => {
      const list = document.createElement('ul')
      container.appendChild(list)
      const mounted: MountedCase = {
        flush: settle,
        setProps: async () => undefined,
        setChildren: async (step: ChildrenStep) => {
          list.replaceChildren(
            ...(step.children ?? []).map((node) => {
              const item = document.createElement('li')
              item.textContent = typeof node === 'string' ? node : ''
              return item
            }),
          )
        },
        location: () => '/',
        navigate: () => undefined,
        unmount: async () => {
          container.replaceChildren()
        },
      }
      if (!withSetChildren) delete (mounted as Partial<MountedCase>).setChildren
      return mounted
    }

  const steps: UICase = {
    name: 'list changes',
    interactions: [
      { type: 'children', children: ['one', 'two'] },
      { type: 'children', children: [] },
    ],
  }

  it('changes the children and snapshots the DOM after each step', async () => {
    const result = await runSteps(steps, listComponent(true), new CallRecorder())
    expect(result.readable?.[1]).toContain('one')
    expect(result.readable?.[1]).toContain('two')
    expect(result.readable?.[2]).not.toContain('one')
  })

  it('fails a case with a children step on an adapter that cannot change children', async () => {
    await expect(runSteps(steps, listComponent(false), new CallRecorder())).rejects.toThrow(
      '"list changes" changes its children, and this adapter has no setChildren',
    )
  })
})
