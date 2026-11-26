/**
 * Unit tests for the kit's DOM normalizer: two renders compare equal exactly
 * when they draw the same pixels and expose the same accessibility tree.
 *
 * Elements are connected to the document with the reference stylesheet
 * loaded, as in a case run, because which whitespace draws depends on
 * computed `display`. Classes come from the ClassMap, never written here.
 *
 * @module
 */

import '../ui/setup.js'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { getClassMap } from '@molecule/app-ui'

import {
  assertNoLostStyleValues,
  currentReadable,
  hashSnapshotClasses,
  lostStyleValues,
  normalizeDom,
  type NormalizeOptions,
} from '../ui/normalize.js'
import type { UICase } from '../ui/spec.js'
import { caseStrings } from '../ui/steps.js'
import { loadReferenceStylesheet, referenceStyles } from '../ui/stylesheet.js'

beforeAll(async () => {
  await loadReferenceStylesheet()
})

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Builds a container in the document (computed style needs a connected element).
 *
 * @param build - Appends the nodes under test to the container.
 * @returns The container.
 */
const container = (build: (root: HTMLElement) => void): HTMLElement => {
  const root = document.createElement('div')
  build(root)
  document.body.append(root)
  return root
}

/**
 * Normalizes under the reference stylesheet, as the case runner does.
 *
 * @param root - Subtree to normalize.
 * @param options - Extra normalizer options.
 * @returns The normalized serialization.
 */
const norm = (root: Node, options: NormalizeOptions = {}): string => {
  const styles = referenceStyles(document)
  try {
    return normalizeDom(root, { ...options, computedStyle: styles.computedStyle })
  } finally {
    styles.detach()
  }
}

/**
 * Creates an element with the given children.
 *
 * @param tag - Tag name.
 * @param children - Child nodes or text.
 * @param className - Classes from the ClassMap, if any.
 * @returns The element.
 */
const h = (tag: string, children: (Node | string)[] = [], className = ''): HTMLElement => {
  const el = document.createElement(tag)
  if (className) el.className = className
  el.append(...children)
  return el
}

const text = (value: string): Text => document.createTextNode(value)

describe('normalizeDom text', () => {
  it('merges adjacent text nodes, as they render', () => {
    const split = container((root) => root.append(h('span', [text('One'), text('Two')])))
    const merged = container((root) => root.append(h('span', ['OneTwo'])))
    expect(norm(split)).toBe(norm(merged))
    expect(norm(merged)).toBe('<span>\nOneTwo\n</span>')
  })

  it('keeps a space between merged text nodes', () => {
    const split = container((root) => root.append(text('Hello '), text('Ada')))
    expect(norm(split)).toBe('Hello Ada')
    expect(norm(split)).not.toBe(norm(container((root) => root.append(text('HelloAda')))))
  })

  it('treats comments and scaffolding between text as transparent', () => {
    const anchored = container((root) => {
      const unwrap = h('div', ['Two'])
      unwrap.setAttribute('data-parity-unwrap', '')
      root.append(text('One'), document.createComment(''), unwrap)
    })
    expect(norm(anchored)).toBe('OneTwo')
  })

  it('keeps text on either side of an element apart', () => {
    const root = container((r) => r.append(text('A'), h('br'), text('B')))
    expect(norm(root)).toBe('A\n<br>\n</br>\nB')
  })

  it('drops whitespace at the edges of an element and collapses inner whitespace', () => {
    const root = container((r) => r.append(text('  \n '), text(' a \n  b ')))
    expect(norm(root)).toBe('a b')
    const button = container((r) =>
      r.append(h('button', [text(' '), text('Account'), document.createComment('')])),
    )
    expect(norm(button)).toBe('<button>\nAccount\n</button>')
  })

  it('keeps a space between text and an inline element, drops it next to blocks', () => {
    const root = container((r) =>
      r.append(h('p', ['Hello ', h('b'), ' and ', h('i')]), '  ', h('hr')),
    )
    expect(norm(root)).toBe('<p>\nHello \n<b>\n</b>\n and \n<i>\n</i>\n</p>\n<hr>\n</hr>')
  })

  it('tells "12 unread" from "12unread" in a block', () => {
    const spaced = container((r) => r.append(h('div', [h('strong', ['12']), ' unread'])))
    const tight = container((r) => r.append(h('div', [h('strong', ['12']), 'unread'])))
    expect(norm(spaced)).toContain('\n unread\n')
    expect(norm(spaced)).not.toBe(norm(tight))
  })

  it('keeps whitespace between two inline elements as one space', () => {
    const spaced = container((r) =>
      r.append(h('div', [h('span', ['a']), '  \n ', h('span', ['b'])])),
    )
    const tight = container((r) => r.append(h('div', [h('span', ['a']), h('span', ['b'])])))
    expect(norm(spaced)).toBe('<div>\n<span>\na\n</span>\n \n<span>\nb\n</span>\n</div>')
    expect(norm(spaced)).not.toBe(norm(tight))
  })

  it('drops whitespace next to a block-level element (the preflight makes svg block)', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const root = container((r) => r.append(h('div', ['Details ', svg])))
    expect(norm(root)).toBe('<div>\nDetails\n<svg>\n</svg>\n</div>')
  })

  it('trims every text run inside a flex container (each run is its own item)', () => {
    const flex = getClassMap().flex()
    const spaced = container((r) =>
      r.append(h('div', [h('strong', ['12']), ' unread', h('span'), ' ', h('span')], flex)),
    )
    const tight = container((r) =>
      r.append(h('div', [h('strong', ['12']), 'unread', h('span'), h('span')], flex)),
    )
    expect(norm(spaced)).toBe(norm(tight))
    expect(norm(spaced)).toContain('\nunread\n')
  })

  it('keeps the space after an absolutely positioned or floated element, which ends no line', () => {
    // CSS computes display: block for both, but neither is in the flow; a browser draws the space.
    const label = (build: () => HTMLElement): string =>
      norm(container((r) => r.append(h('div', [h('span', ['▲']), build(), ' 3.21%']))))
    const srOnly = label(() => h('span', ['Up'], getClassMap().srOnly))
    expect(srOnly).toContain('\n 3.21%\n')
    const floated = label(() => {
      const el = h('span', ['Up'])
      el.style.float = 'left'
      return el
    })
    expect(floated).toContain('\n 3.21%\n')
    expect(label(() => h('div', ['Up']))).toContain('\n3.21%\n')
  })

  it('draws nothing for whitespace between out-of-flow siblings at a line edge', () => {
    // A Svelte or Angular template leaves whitespace text between its rows; JSX writes none.
    const row = (): HTMLElement => {
      const el = h('div', ['row'])
      el.style.position = 'absolute'
      return el
    }
    const floated = (): HTMLElement => {
      const el = h('span', ['tag'])
      el.style.float = 'left'
      return el
    }
    const templated = container((r) =>
      r.append(h('div', [' ', row(), '\n  ', row(), ' ', floated(), ' '])),
    )
    const tight = container((r) => r.append(h('div', [row(), row(), floated()])))
    expect(norm(templated)).toBe(norm(tight))
    // Counterexample: text in the flow on the far side keeps the space.
    expect(norm(container((r) => r.append(h('div', ['a', row(), ' b']))))).toContain('\n b\n')
  })

  it('keeps raw text verbatim', () => {
    const root = container((r) => r.append(h('pre', [text('a  '), text(' b')])))
    expect(norm(root)).toBe('<pre>\na   b\n</pre>')
  })

  it('keeps text under white-space: pre-wrap verbatim', () => {
    const root = container((r) => {
      const el = h('div', ['a  ', ' b\n c'])
      el.style.whiteSpace = 'pre-wrap'
      r.append(el)
    })
    // jsdom 31 reads white-space as a shorthand, so the kit lists the longhands it sets.
    expect(norm(root)).toBe(
      '<div style="text-wrap-mode: wrap; white-space-collapse: preserve; white-space-trim: none">\na   b\n c\n</div>',
    )
  })
})

describe('normalizeDom form state', () => {
  it('distinguishes a cleared dropdown from its selected empty-value placeholder', () => {
    const root = container((host) => {
      host.innerHTML =
        '<select><option value="" disabled selected>Choose</option><option>A</option></select>'
    })
    const select = root.querySelector('select')
    if (!select) throw new Error('missing dropdown fixture')
    const withPlaceholder = norm(root)
    expect(select.value).toBe('')
    select.selectedIndex = -1
    expect(select.value).toBe('')
    expect(norm(root)).not.toBe(withPlaceholder)
  })

  it('does not record extra state for an unselected list with no implicit selection', () => {
    const root = container((host) => {
      host.innerHTML =
        '<select multiple><option>A</option></select><select size="2"><option>A</option></select>'
    })
    expect(norm(root)).not.toContain('selectedIndex=')
  })
})

describe('normalizeDom framework bookkeeping attributes', () => {
  it("drops React Router's data-discover link marker and keeps every other attribute", () => {
    const link = (discover: boolean): HTMLElement =>
      container((root) => {
        const a = h('a', ['Home'])
        a.setAttribute('href', '/')
        if (discover) a.setAttribute('data-discover', 'true')
        root.append(a)
      })
    expect(norm(link(true))).toBe(norm(link(false)))
    expect(norm(link(true))).toContain('href="/"')
    const other = container((root) => {
      const a = h('a', ['Home'])
      a.setAttribute('data-discovered', 'true')
      root.append(a)
    })
    expect(norm(other)).toContain('data-discovered="true"')
  })
})

describe('normalizeDom style longhands', () => {
  const styled = (style: string): HTMLElement =>
    container((root) => {
      const el = document.createElement('div')
      el.setAttribute('style', style)
      root.appendChild(el)
    })
  const same = (a: string, b: string): boolean => norm(styled(a)) === norm(styled(b))

  it('reads a shorthand and the longhands it expands to as the same style', () => {
    expect(
      same(
        'align-items: center; background: rgb(234, 238, 242); border-color: currentcolor; border-image: none; border-style: none; border-width: medium; color: inherit',
        'align-items: center; background: rgb(234, 238, 242); border: medium; color: inherit',
      ),
    ).toBe(true)
    expect(
      same(
        'background: transparent; border: none; border-top: none',
        'background: transparent; border: medium',
      ),
    ).toBe(true)
  })

  it('reads an element styled through the CSSOM like the same declarations written as text', () => {
    const viaCssom = container((root) => {
      const el = document.createElement('button')
      el.style.border = 'none'
      el.style.borderTop = 'none'
      el.style.background = 'transparent'
      root.appendChild(el)
      el.style.background = 'rgb(234, 238, 242)'
    })
    const written = container((root) => {
      const el = document.createElement('button')
      el.setAttribute('style', 'border: medium; background: rgb(234, 238, 242)')
      root.appendChild(el)
    })
    expect(norm(viaCssom)).toBe(norm(written))
  })

  it('still tells apart styles that draw differently', () => {
    expect(same('border: none', 'border: 1px solid rgb(255, 0, 0)')).toBe(false)
    expect(
      same('border: none; border-top: none', 'border: none; border-top: 1px solid rgb(1, 2, 3)'),
    ).toBe(false)
    expect(same('border: none; background: red', 'border: none; background: blue')).toBe(false)
    expect(same('background: transparent; border: medium', 'border: medium')).toBe(false)
    expect(same('padding: 8px 12px', 'padding: 8px')).toBe(false)
  })
})

describe('normalizeDom style attribute', () => {
  const styled = (style: string): HTMLElement =>
    container((root) => {
      const el = h('div', ['x'])
      el.setAttribute('style', style)
      root.append(el)
    })

  it('reads a style written as text the way the CSSOM records the same properties', () => {
    const viaCssom = container((root) => {
      const el = h('div', ['x'])
      el.style.flex = '1'
      el.style.border = 'none'
      el.style.padding = '6px 6px 6px 0'
      el.style.color = '#d4a017'
      el.style.minWidth = '0'
      root.append(el)
    })
    const written = styled(
      'flex: 1; border: none; padding: 6px 6px 6px 0; color: #d4a017; min-width: 0',
    )
    expect(norm(written)).toBe(norm(viaCssom))
    expect(norm(written)).toContain('flex-grow: 1')
    expect(norm(written)).toContain('flex-basis: 0%')
    expect(norm(written)).not.toBe(
      norm(styled('flex: 2; border: none; padding: 6px; color: #d4a017')),
    )
  })

  it('keeps a declaration the CSSOM does not read, as written', () => {
    expect(norm(styled('width: nonsense; opacity: 0.5'))).toContain('width: nonsense')
    expect(norm(styled('width: nonsense; opacity: 0.5'))).not.toBe(norm(styled('opacity: 0.5')))
  })

  it('keeps a semicolon inside a quoted url() in its declaration', () => {
    const url = 'url("data:image/svg+xml;base64,PHN2Zy8+")'
    const out = norm(styled(`background-image: ${url}; opacity: 0.5`))
    expect(out).toContain('base64,PHN2Zy8+')
    expect(out).toContain('opacity: 0.5')
  })

  it("reads Vue's -webkit-filter as the filter a browser serializes", () => {
    expect(norm(styled('-webkit-filter: grayscale(0.6); opacity: 0.5'))).toBe(
      norm(styled('filter: grayscale(0.6); opacity: 0.5')),
    )
    expect(norm(styled('-webkit-filter: grayscale(0.6)'))).toContain(
      'style="filter: grayscale(0.6)"',
    )
  })

  it('keeps a different filter and other vendor names apart', () => {
    expect(norm(styled('-webkit-filter: grayscale(0.6)'))).not.toBe(
      norm(styled('filter: grayscale(0.5)')),
    )
    expect(norm(styled('-webkit-backdrop-filter: blur(2px)'))).toContain('-webkit-backdrop-filter')
  })
})

describe('normalizeDom var() styles', () => {
  /** An element whose style attribute is written as text, as Solid's template HTML holds it. */
  const written = (style: string): HTMLElement =>
    container((root) => {
      const el = document.createElement('div')
      el.setAttribute('style', style)
      root.append(el)
    })
  /** An element styled one property at a time through the CSSOM, as React sets a style object. */
  const viaCssom = (properties: [string, string][]): HTMLElement =>
    container((root) => {
      const el = document.createElement('div')
      for (const [name, value] of properties) el.style.setProperty(name, value)
      root.append(el)
    })
  // Each row: two styles and whether they must compare equal. A var() longhand reads '' until
  // the variable is substituted, which a normalizer reading longhands alone would drop.
  const rows: [string, HTMLElement, HTMLElement, boolean][] = [
    [
      'a var() shorthand keeps its value',
      written('background: var(--a)'),
      written('background: var(--b)'),
      false,
    ],
    [
      'var() shorthands, text vs CSSOM',
      written('background: var(--a); border: 1px solid var(--b); height: 8px'),
      viaCssom([
        ['background', 'var(--a)'],
        ['border', '1px solid var(--b)'],
        ['height', '8px'],
      ]),
      true,
    ],
    [
      'a var() shorthand then one of its longhands, text vs CSSOM',
      written('background: var(--a); background-image: none'),
      viaCssom([
        ['background', 'var(--a)'],
        ['background-image', 'none'],
      ]),
      true,
    ],
    [
      'a var() shorthand then one of its longhands differs from the shorthand alone',
      written('background: var(--a); background-image: none'),
      written('background: var(--a)'),
      false,
    ],
    [
      'a longhand then a var() shorthand is the shorthand alone',
      written('margin-top: 2px; margin: var(--m)'),
      written('margin: var(--m)'),
      true,
    ],
    [
      'two overlapping var() shorthands keep their order',
      written('border-color: var(--c); border-top: var(--t)'),
      written('border-top: var(--t); border-color: var(--c)'),
      false,
    ],
    [
      'a var() shorthand replaced by a plain one is the plain one',
      written('border: 1px solid var(--b); border: 2px solid red'),
      written('border: 2px solid red'),
      true,
    ],
    [
      'min-width and min-height through the CSSOM are the same two as text',
      viaCssom([
        ['min-width', '36px'],
        ['min-height', '36px'],
      ]),
      written('min-width: 36px; min-height: 36px'),
      true,
    ],
    [
      'min-width and min-height through the CSSOM are not min-height: auto',
      viaCssom([
        ['min-width', '36px'],
        ['min-height', '36px'],
      ]),
      written('min-width: 36px; min-height: auto'),
      false,
    ],
    [
      'a longhand after a var() shorthand was seen is still listed',
      written('background-color: red; background-image: none'),
      written('background-color: red'),
      false,
    ],
    [
      'an !important shorthand beats a later plain longhand',
      written('margin: 1px !important; margin-top: 2px'),
      written('margin: 1px !important'),
      true,
    ],
    ['!important counts', written('color: red !important'), written('color: red'), false],
    [
      'animation then its delay differs from the reverse',
      written('animation: spin 1s; animation-delay: 150ms'),
      written('animation-delay: 150ms; animation: spin 1s'),
      false,
    ],
    [
      'animation and its delay, CSSOM vs text',
      viaCssom([
        ['animation', 'spin 1s'],
        ['animation-delay', '150ms'],
      ]),
      written('animation: spin 1s; animation-delay: 150ms'),
      true,
    ],
    [
      'font: inherit then a weight differs from font: inherit',
      written('font: inherit; font-weight: 600'),
      written('font: inherit'),
      false,
    ],
    [
      'gap with both its longhands cleared differs from gap',
      viaCssom([
        ['gap', '6px'],
        ['column-gap', ''],
        ['row-gap', ''],
      ]),
      written('gap: 6px'),
      false,
    ],
  ]
  for (const [name, a, b, equal] of rows) {
    it(`${equal ? 'equal' : 'differ'}: ${name}`, () => {
      if (equal) expect(norm(a)).toBe(norm(b))
      else expect(norm(a)).not.toBe(norm(b))
    })
  }

  it('reads a Tooltip arrow written as text with its var() shorthands', () => {
    expect(
      norm(
        written(
          'background: var(--color-surface); border: 1px solid var(--color-border); height: 8px',
        ),
      ),
    ).toContain(
      'style="background: var(--color-surface); border: 1px solid var(--color-border); height: 8px"',
    )
  })

  it('names the declarations whose var() text the CSSOM lost, for a recording to refuse', () => {
    const broken = norm(
      viaCssom([
        ['background', 'var(--a)'],
        ['background-image', 'none'],
      ]),
    )
    expect(lostStyleValues(broken)).toContain('<div> background-color')
    expect(lostStyleValues(norm(written('background: var(--a); height: 8px')))).toEqual([])
    expect(lostStyleValues(norm(written('background: var(--a)')))).toEqual([])
    expect(lostStyleValues('<a title="x > y" style="color: red; margin-top: ">')).toEqual([
      '<a> margin-top',
    ])
  })

  it('refuses a reference snapshot with a lost var() value, naming the case and the fix', () => {
    const broken = norm(
      viaCssom([
        ['background', 'var(--a)'],
        ['background-image', 'none'],
      ]),
    )
    expect(() => assertNoLostStyleValues([broken], 'Tooltip / arrow')).toThrow(
      /^Tooltip \/ arrow: <div> background-attachment, .*<div> background-color, .*Write the shorthand's longhands/,
    )
    expect(() =>
      assertNoLostStyleValues([norm(written('background: var(--a)'))], 'Tooltip / arrow'),
    ).not.toThrow()
  })
})

describe('normalizeDom id references', () => {
  it('renumbers ids and the references that resolve to them', () => {
    const render = (prefix: string): HTMLElement =>
      container((root) => {
        const label = h('label')
        label.setAttribute('for', `${prefix}-input`)
        const input = h('input')
        input.id = `${prefix}-input`
        root.append(label, input)
      })
    expect(norm(render(':r1:'))).toBe(norm(render('v-0')))
    expect(norm(render('v-0'))).toContain('for="#id0"')
  })

  it('renumbers references to ids no element carries, apart from resolved ones', () => {
    const tabs = (inactive: string[]): HTMLElement =>
      container((root) => {
        const panel = h('div')
        panel.id = 'live-panel'
        root.append(panel)
        for (const id of ['live-panel', ...inactive]) {
          const tab = h('button')
          tab.setAttribute('aria-controls', id)
          root.append(tab)
        }
      })
    const react = norm(tabs(['_r_d1_', '_r_d2_']))
    expect(react).toBe(norm(tabs(['s-4', 's-5'])))
    expect(react).toContain('aria-controls="#id0"')
    expect(react).toContain('aria-controls="#ref0"')
    expect(react).toContain('aria-controls="#ref1"')
  })

  it('keeps a repeated dangling reference on one token', () => {
    const root = container((r) => {
      for (const id of ['gone', 'other', 'gone']) {
        const el = h('span')
        el.setAttribute('aria-describedby', id)
        r.append(el)
      }
    })
    expect(norm(root).match(/#ref\d/g)).toEqual(['#ref0', '#ref1', '#ref0'])
  })

  it('keeps a dangling reference the caller wrote itself verbatim', () => {
    const label = (forId: string): HTMLElement =>
      container((root) => {
        const el = h('label')
        el.setAttribute('for', forId)
        el.setAttribute('aria-describedby', `existing-note ${forId}-gen`)
        root.append(el)
      })
    const keepReferences = new Set(['email-field', 'existing-note'])
    const out = norm(label('email-field'), { keepReferences })
    expect(out).toContain('for="email-field"')
    expect(out).toContain('aria-describedby="existing-note #ref0"')
    expect(out).not.toBe(norm(label('email'), { keepReferences }))
  })

  it('renumbers generated radio group names, keeping the grouping and a name the case wrote', () => {
    const radios = (names: string[], extra: Record<string, string> = {}): HTMLElement =>
      container((root) => {
        for (const name of names) {
          const el = h('input')
          el.setAttribute('type', 'radio')
          el.setAttribute('name', name)
          root.append(el)
        }
        for (const [name, type] of Object.entries(extra)) {
          const el = h('input')
          el.setAttribute('type', type)
          el.setAttribute('name', name)
          root.append(el)
        }
      })
    const keepReferences = new Set(['flavor'])
    const react = norm(radios(['_r_1it_', '_r_1it_', '_r_1iu_', 'flavor'], { email: 'text' }), {
      keepReferences,
    })
    const port = norm(radios(['v-3', 'v-3', 'v-4', 'flavor'], { email: 'text' }), {
      keepReferences,
    })
    expect(react).toBe(port)
    expect(react.match(/name="[^"]*"/g)).toEqual([
      'name="radio0"',
      'name="radio0"',
      'name="radio1"',
      'name="flavor"',
      'name="email"',
    ])
    // Two radios in one group are not two radios in two groups.
    expect(norm(radios(['a', 'b']))).not.toBe(norm(radios(['a', 'a'])))
  })

  it('tells a dangling reference from a resolved one', () => {
    const render = (targetId: string): HTMLElement =>
      container((root) => {
        const target = h('div')
        target.id = targetId
        const ref = h('span')
        ref.setAttribute('aria-labelledby', 'title')
        root.append(target, ref)
      })
    expect(norm(render('title'))).not.toBe(norm(render('elsewhere')))
  })

  it('renumbers the url(#id) paint references an SVG carries', () => {
    const star = (gradientId: string, dangling: string): HTMLElement =>
      container((root) => {
        const gradient = h('lineargradient')
        gradient.id = gradientId
        const filled = h('path')
        filled.setAttribute('fill', `url(#${gradientId})`)
        const masked = h('path')
        masked.setAttribute('mask', `url(#${dangling})`)
        root.append(gradient, filled, masked)
      })
    const react = norm(star('_r_3_', '_r_9_'))
    expect(react).toBe(norm(star('v-0', 'v-7')))
    expect(react).toContain('fill="url(#id0)"')
    expect(react).toContain('mask="url(#ref0)"')
    expect(react).not.toContain('url(##')
  })
})

describe('caseStrings', () => {
  it('collects every string a case supplies, and each token of it', () => {
    const testCase: UICase = {
      name: 'htmlFor',
      props: { htmlFor: 'email-field', 'aria-describedby': 'note-a note-b' },
      children: ['Email'],
      interactions: [{ type: 'props', props: { htmlFor: 'other-field' } }],
    }
    const strings = caseStrings(testCase)
    for (const value of [
      'email-field',
      'note-a',
      'note-b',
      'note-a note-b',
      'other-field',
      'Email',
    ])
      expect(strings.has(value)).toBe(true)
  })
})

describe('referenceStyles', () => {
  it('attaches the stylesheet only inside the scope', () => {
    const el = container((r) => r.append(h('div', [], getClassMap().flex())))
    const target = el.firstElementChild as Element
    expect(getComputedStyle(target).display).toBe('block')
    const styles = referenceStyles(document)
    expect(styles.computedStyle(target)?.display).toBe('flex')
    styles.detach()
    expect(document.head.querySelector('[data-parity-reference-stylesheet]')).toBeNull()
    expect(getComputedStyle(target).display).toBe('block')
  })

  it('reads computed style only when a text run has whitespace at an element edge', () => {
    const asked: string[] = []
    const computedStyle = (el: Element): CSSStyleDeclaration => {
      asked.push(el.tagName.toLowerCase())
      return getComputedStyle(el)
    }
    normalizeDom(
      container((r) => r.append(h('p', ['plain', h('b', ['bold'])]))),
      { computedStyle },
    )
    expect(asked).toEqual([])
    normalizeDom(
      container((r) => r.append(h('p', ['spaced ', h('b', ['bold'])]))),
      { computedStyle },
    )
    expect(asked).toContain('b')
  })
})

describe('hashSnapshotClasses', () => {
  it('turns a readable snapshot into the hashed one the same DOM records', () => {
    const cm = getClassMap()
    const el = container((r) => {
      // A class token with '&' (escaped in the attribute), a sibling attribute whose value has a
      // double space, and text that spells a class attribute (text escapes its '<').
      const header = h('div', ['<b class="x">'], `${cm.tableHeader} ${cm.flex()}`)
      header.setAttribute('aria-label', 'Clip  starting at 2.00s')
      header.setAttribute('data-note', ' class="not-this"')
      r.append(header, h('p', ['plain'], cm.alertDescription))
    })
    const hashed = norm(el, { hashClasses: true })
    expect(hashSnapshotClasses(norm(el))).toBe(hashed)
    expect(hashed).not.toBe(norm(el))
  })
})

describe('currentReadable', () => {
  const cm = getClassMap()
  const snapshot = (text: string): string =>
    norm(container((r) => r.append(h('p', [text], cm.alertDescription))))
  const golden = [snapshot('one'), snapshot('two')].map(hashSnapshotClasses)

  it('uses a readable copy that hashes to the golden', () => {
    const cached = [snapshot('one'), snapshot('two')]
    expect(currentReadable(cached, golden)).toBe(cached)
  })

  it('ignores a copy recorded before a re-record, or one with a different step count', () => {
    expect(currentReadable([snapshot('one'), snapshot('old')], golden)).toBeUndefined()
    expect(currentReadable([snapshot('one')], golden)).toBeUndefined()
    expect(currentReadable(undefined, golden)).toBeUndefined()
  })
})
