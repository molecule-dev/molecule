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
  assertEmptiedListAlike,
  CallRecorder,
  changeLifetimes,
  changingLists,
  checkNodeKeys,
  CHILD_STEP_CASE_NAME,
  childListStates,
  CHILDREN_STEP_SWITCH,
  type ChildrenStep,
  hasChildSteps,
  initialChildLists,
  lifetimeCreated,
  lifetimeDisposed,
  lifetimeLines,
  type MountedCase,
  nextChildLists,
  nodeIdentity,
  onLifetimeChange,
  resetLifetimes,
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
      { type: 'children', slots: { footer: null } },
      { type: 'children', slots: { footer: [] } },
      { type: 'children', slots: { footer: ['Total'] } },
    ])
  })

  it('takes away and gives back children that are not a list of elements', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const text: UIComponentCases = {
      component: 'Label',
      cases: [{ name: 'text', children: ['Name'] }],
    }
    expect(withChildSteps(text).cases[1]).toEqual({
      name: 'text, then children emptied and refilled',
      children: ['Name'],
      interactions: [
        { type: 'children', children: null },
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

describe('assertEmptiedListAlike', () => {
  /** The derived footer case: a focus step, then footer not passed, [], and passed again. */
  const footerCase = (): UICase => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    return withChildSteps(family).cases.find(
      (c) => c.name === 'with footer, then footer emptied and refilled',
    )!
  }

  it('refuses React DOM that differs between a list not passed and an empty one, naming the fix', () => {
    const snapshots = [
      '<ul>Total</ul>',
      '<ul>Total</ul>',
      '<ul></ul>',
      '<ul><p></p></ul>',
      '<ul>Total</ul>',
    ]
    expect(() => assertEmptiedListAlike(footerCase(), snapshots, 'List')).toThrow(
      'List / with footer, then footer emptied and refilled: React renders an empty footer list ([]) differently from footer not passed. Both render nothing: read the prop through slot() from @molecule/app-react/render where the props are destructured (const footer = slot(footerProp))',
    )
  })

  it('accepts React DOM that is the same for both', () => {
    const snapshots = [
      '<ul>Total</ul>',
      '<ul>Total</ul>',
      '<ul></ul>',
      '<ul></ul>',
      '<ul>Total</ul>',
    ]
    expect(() => assertEmptiedListAlike(footerCase(), snapshots, 'List')).not.toThrow()
  })

  it('checks the children of a case derived by rule 2', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const text = withChildSteps({
      component: 'Label',
      cases: [{ name: 'text', children: ['Name'] }],
    }).cases[1]!
    expect(() =>
      assertEmptiedListAlike(text, ['<b>Name</b>', '', '<b></b>', '<b>Name</b>'], 'Label'),
    ).toThrow('React renders an empty children list ([]) differently from children not passed')
  })

  it('leaves every other case alone, the changing list of rule 1 included', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const changed = withChildSteps(family).cases.find(
      (c) => c.name === 'rows, then children change',
    )!
    const snapshots = changed.interactions!.map((_, i) => String(i)).concat('x')
    expect(() => assertEmptiedListAlike(changed, snapshots, 'List')).not.toThrow()
    expect(() => assertEmptiedListAlike(family.cases[1]!, ['a'], 'List')).not.toThrow()
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

  it('keeps a list a step stops passing as null, apart from an empty one', () => {
    const passed = { children: [row('a')], slots: { a: ['A'], b: ['B'] } }
    expect(
      nextChildLists(passed, { type: 'children', children: null, slots: { a: null, b: [] } }),
    ).toEqual({ children: null, slots: { a: null, b: [] } })
    expect(
      nextChildLists(
        { children: null, slots: { a: null } },
        { type: 'children', slots: { a: ['A'] } },
      ),
    ).toEqual({ children: null, slots: { a: ['A'] } })
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
    // A list no longer passed is as empty as an empty one.
    expect(
      snapshotsWithEmptiedList({
        ...testCase,
        interactions: [
          { type: 'children', slots: { title: null } },
          { type: 'children', slots: { title: ['Rename'] } },
        ],
      }),
    ).toEqual([false, true, false])
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

describe('withChildSteps: a stateful list', () => {
  const dialog: UIComponentCases = {
    component: 'Dialog',
    cases: [
      {
        name: 'open with footer',
        props: { open: true },
        slots: { footer: [{ tag: 'button', children: ['Save'] }, ' and more'] },
      },
      { name: 'text title', slots: { title: ['Hello'] } },
      { name: 'image footer', slots: { footer: [{ tag: 'img', attrs: { alt: '' } }] } },
      {
        name: 'replaced footer',
        slots: { footer: [{ tag: 'b', children: ['x'] }] },
        interactions: [{ type: 'children', slots: { footer: [] } }],
      },
      {
        name: 'closed',
        slots: { footer: [{ tag: 'b', children: ['y'] }] },
        interactions: [{ type: 'unmount' }],
      },
      { name: 'card body', children: [{ component: 'Card', children: ['Body'] }] },
    ],
  }

  it('puts a lifetime probe inside the first node of a list that can hold one', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const cases = withChildSteps(dialog).cases
    const footer = cases.find((c) => c.name === 'open with footer, with a stateful footer')!
    expect(footer.props).toEqual({ open: true })
    expect(footer.interactions).toEqual([{ type: 'lifetime', name: 'footer' }])
    expect(footer.slots).toEqual({
      footer: [{ tag: 'button', children: ['Save', { lifetime: 'footer' }] }, ' and more'],
    })
    const body = cases.find((c) => c.name === 'card body, with a stateful children')!
    expect(body.children).toEqual([
      { component: 'Card', children: ['Body', { lifetime: 'children' }] },
    ])
    for (const c of [footer, body]) expect(CHILD_STEP_CASE_NAME.test(c.name)).toBe(true)
  })

  it('keeps every list its length: inside a list item, and inside a lone element child', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const nested: UIComponentCases = {
      component: 'Panel',
      cases: [
        {
          name: 'list',
          children: [{ tag: 'ul', children: [{ tag: 'li', children: ['First'] }] }],
        },
        {
          name: 'field',
          children: [
            { component: 'FormField', children: [{ tag: 'input' }] },
            { tag: 'p', children: ['Note'] },
          ],
        },
        {
          name: 'trigger',
          children: [{ component: 'Tooltip', children: [{ tag: 'button', children: ['Hi'] }] }],
        },
      ],
    }
    const cases = withChildSteps(nested).cases
    const named = (name: string): UICase => cases.find((c) => c.name === name)!
    expect(named('list, with a stateful children').children).toEqual([
      { tag: 'ul', children: [{ tag: 'li', children: ['First', { lifetime: 'children' }] }] },
    ])
    expect(named('field, with a stateful children').children).toEqual([
      { component: 'FormField', children: [{ tag: 'input' }] },
      { tag: 'p', children: ['Note', { lifetime: 'children' }] },
    ])
    expect(named('trigger, with a stateful children').children).toEqual([
      {
        component: 'Tooltip',
        children: [{ tag: 'button', children: ['Hi', { lifetime: 'children' }] }],
      },
    ])
  })

  it("ends with a lifetime step after the base case's own steps", () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const stepped: UIComponentCases = {
      component: 'Panel',
      cases: [
        {
          name: 'focused',
          children: [{ tag: 'p', children: ['Body'] }],
          interactions: [{ type: 'focus', selector: 'p' }],
        },
      ],
    }
    const derived = withChildSteps(stepped).cases.find(
      (c) => c.name === 'focused, with a stateful children',
    )!
    expect(derived.interactions).toEqual([
      { type: 'focus', selector: 'p' },
      { type: 'lifetime', name: 'children' },
    ])
  })

  it('adds the item cases of a declared list: the probe first, rendering a fragment or nothing until it changes', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const declared: UIComponentCases = {
      ...dialog,
      itemLists: { footer: 'counts the footer items', title: 'counts the title parts' },
    }
    const named = (name: string): UICase =>
      withChildSteps(declared).cases.find((c) => c.name === name)!
    const fragment = named('open with footer, with a stateful footer item rendering a fragment')
    expect(fragment.slots?.footer).toEqual([
      { lifetime: 'footer', root: 'fragment' },
      { tag: 'button', children: ['Save'] },
      ' and more',
    ])
    expect(fragment.interactions).toEqual([{ type: 'lifetime', name: 'footer' }])
    const conditional = named(
      'open with footer, with a stateful footer item rendering nothing until it changes',
    )
    expect(conditional.slots?.footer?.[0]).toEqual({ lifetime: 'footer', root: 'conditional' })
    // A text-only list has no node to hold the probe, but an item can still be added to it.
    expect(
      named('text title, with a stateful title item rendering a fragment').slots?.title,
    ).toEqual([{ lifetime: 'title', root: 'fragment' }, 'Hello'])
    for (const c of [fragment, conditional]) expect(CHILD_STEP_CASE_NAME.test(c.name)).toBe(true)
    // An undeclared list gets no item cases.
    expect(withChildSteps(dialog).cases.some((c) => c.name.includes(' item rendering '))).toBe(
      false,
    )
  })

  it('derives none for text, a void element, a list a step replaces, or a case that ends unmounted', () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const names = withChildSteps(dialog).cases.map((c) => c.name)
    for (const name of [
      'text title, with a stateful title',
      'image footer, with a stateful footer',
      'replaced footer, with a stateful footer',
      'closed, with a stateful footer',
    ])
      expect(names).not.toContain(name)
  })

  it("leaves a probe out of the key rules, as the kit's own unkeyed node", () => {
    vi.stubEnv(CHILDREN_STEP_SWITCH, '1')
    const keyed: UIComponentCases = {
      component: 'List',
      cases: [
        {
          name: 'keyed',
          children: [
            { ...row('a'), key: 'a' },
            { ...row('b'), key: 'b' },
          ],
        },
      ],
    }
    for (const c of withChildSteps(keyed).cases) expect(() => checkNodeKeys(c)).not.toThrow()
  })
})

describe('lifetime counts', () => {
  it('counts creations and disposals per probe, by name, until the next reset', () => {
    resetLifetimes()
    expect(lifetimeLines()).toBe('')
    expect(lifetimeCreated('footer')).toBe(1)
    expect(lifetimeCreated('children')).toBe(1)
    lifetimeDisposed('footer')
    expect(lifetimeCreated('footer')).toBe(2)
    expect(lifetimeLines()).toBe(
      '@lifetime children created=1 disposed=0\n@lifetime footer created=2 disposed=1',
    )
    resetLifetimes()
    expect(lifetimeLines()).toBe('')
  })

  it('flips each live instance of a probe by name, and none unregistered or after a reset', () => {
    resetLifetimes()
    const flips: string[] = []
    const off = onLifetimeChange('footer', () => flips.push('footer 1'))
    onLifetimeChange('footer', () => flips.push('footer 2'))
    onLifetimeChange('children', () => flips.push('children'))
    changeLifetimes('footer')
    expect(flips).toEqual(['footer 1', 'footer 2'])
    off()
    changeLifetimes('footer')
    expect(flips).toEqual(['footer 1', 'footer 2', 'footer 2'])
    resetLifetimes()
    changeLifetimes('footer')
    changeLifetimes('children')
    expect(flips).toEqual(['footer 1', 'footer 2', 'footer 2'])
  })

  it('runs a lifetime step: the snapshot after it shows the changed probe', async () => {
    const mount = async (container: HTMLElement): Promise<MountedCase> => {
      const probe = document.createElement('i')
      lifetimeCreated('footer')
      onLifetimeChange('footer', () => {
        probe.textContent = probe.textContent ? '' : 'on'
      })
      container.appendChild(probe)
      return {
        flush: settle,
        setProps: async () => undefined,
        location: () => '/',
        navigate: () => undefined,
        setChildren: async () => undefined,
        unmount: async () => {
          container.replaceChildren()
        },
      }
    }
    const result = await runSteps(
      { name: 'probe changes', interactions: [{ type: 'lifetime', name: 'footer' }] },
      mount,
      new CallRecorder(),
    )
    expect(result.readable?.[0]).not.toContain('on\n</i>')
    expect(result.readable?.[1]).toContain('<i>\non\n</i>')
    expect(result.readable?.[1]).toContain('@lifetime footer created=1 disposed=0')
  })

  it("ends each snapshot with the case's own counts so far", async () => {
    lifetimeCreated('from an earlier case')
    const mount = async (container: HTMLElement): Promise<MountedCase> => {
      const probe = document.createElement('i')
      probe.dataset.parityLifetime = 'footer'
      probe.dataset.parityOrdinal = String(lifetimeCreated('footer'))
      container.appendChild(probe)
      return {
        flush: settle,
        setProps: async () => {
          probe.remove()
          lifetimeDisposed('footer')
        },
        location: () => '/',
        navigate: () => undefined,
        setChildren: async () => undefined,
        unmount: async () => {
          container.replaceChildren()
        },
      }
    }
    const result = await runSteps(
      { name: 'probe goes', interactions: [{ type: 'props', props: { open: false } }] },
      mount,
      new CallRecorder(),
    )
    expect(result.readable?.[0]).toContain('@lifetime footer created=1 disposed=0')
    expect(result.readable?.[1]).toContain('@lifetime footer created=1 disposed=1')
    expect(result.readable?.join('\n')).not.toContain('from an earlier case')
  })
})
