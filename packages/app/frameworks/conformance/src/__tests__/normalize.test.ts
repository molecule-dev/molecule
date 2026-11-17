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
  currentReadable,
  hashSnapshotClasses,
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
    expect(norm(root)).toBe('<div style="white-space: pre-wrap">\na   b\n c\n</div>')
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
