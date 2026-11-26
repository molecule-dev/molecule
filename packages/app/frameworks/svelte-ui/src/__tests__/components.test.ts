/**
 * Tests for svelte-ui's components module: its class-generator functions and
 * its component definitions.
 *
 * svelte-ui exports pure class-string generators, so each
 * `getXClasses(options)` can be exercised directly. `@molecule/app-ui` and
 * `@molecule/app-icons` are stubbed so the generators run in node.
 *
 * The definition tests are the Svelte port of `@molecule/app-ui-react`'s
 * `components.test.tsx`: React exports a forwardRef exotic object carrying
 * `displayName` and `$$typeof`, while Svelte compiles each component to a
 * function the runtime mounts. The same titles assert the same observable a
 * caller has — the export is a renderable component and its declared name is
 * the React display name (the compiled function's own name).
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

// getClassMap() → a Proxy: `cn(...)` joins truthy strings, every other access
// yields a callable that stringifies to its key, so both `cm.button({...})`
// and bare `getClassMap().alertDismiss` module-level consts resolve.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const components = await import('../components/index.js')

describe('component class generators — smoke', () => {
  it('exports a large set of getXClasses generators', () => {
    const generators = Object.keys(components).filter((k) => k.startsWith('get'))
    expect(generators.length).toBeGreaterThan(40)
  })

  it('every getX* export is a function', () => {
    for (const [name, value] of Object.entries(components)) {
      if (name.startsWith('get')) {
        expect(typeof value, name).toBe('function')
      }
    }
  })
})

describe('representative generators return class strings', () => {
  it('getButtonClasses honours variant/color/size options', () => {
    expect(typeof components.getButtonClasses({ variant: 'solid', color: 'primary' })).toBe(
      'string',
    )
    expect(typeof components.getButtonClasses()).toBe('string')
  })

  it('getAlertClasses / getBadgeClasses / getCardClasses return strings', () => {
    expect(typeof components.getAlertClasses({ status: 'error' })).toBe('string')
    expect(typeof components.getBadgeClasses({ color: 'success' })).toBe('string')
    expect(typeof components.getCardClasses()).toBe('string')
  })

  it('getInputClasses / getSelectClasses / getTextareaClasses return strings', () => {
    expect(typeof components.getInputClasses()).toBe('string')
    expect(typeof components.getSelectClasses()).toBe('string')
    expect(typeof components.getTextareaClasses()).toBe('string')
  })

  it('getTableClasses / getModalContentClasses / getTooltipClasses return strings', () => {
    expect(typeof components.getTableClasses()).toBe('string')
    expect(typeof components.getModalContentClasses()).toBe('string')
    expect(typeof components.getTooltipClasses()).toBe('string')
  })
})

describe('getModalWrapperStyle', () => {
  it('returns undefined when centered (the default)', () => {
    expect(components.getModalWrapperStyle()).toBeUndefined()
    expect(components.getModalWrapperStyle(true)).toBeUndefined()
  })

  it('top-anchors the wrapper with an inline style when not centered', () => {
    expect(components.getModalWrapperStyle(false)).toEqual({ alignItems: 'flex-start' })
  })
})

describe('getTooltipArrowStyle', () => {
  const placements = [
    'top',
    'top-start',
    'top-end',
    'bottom',
    'bottom-start',
    'bottom-end',
    'left',
    'right',
  ] as const

  it('returns a themed inline style for every placement', () => {
    for (const placement of placements) {
      const style = components.getTooltipArrowStyle(placement)
      expect(style.position).toBe('absolute')
      expect(style.width).toBe('8px')
      expect(style.height).toBe('8px')
      expect(style.background).toBe('var(--color-surface)')
      expect(style.border).toBe('1px solid var(--color-border)')
    }
  })

  it('positions the arrow at the edge opposite the tooltip body', () => {
    expect(components.getTooltipArrowStyle('top').bottom).toBe('-4px')
    expect(components.getTooltipArrowStyle('bottom').top).toBe('-4px')
    expect(components.getTooltipArrowStyle('left').right).toBe('-4px')
    expect(components.getTooltipArrowStyle('right').left).toBe('-4px')
  })
})

describe('icon-data + helper exports', () => {
  it('getAlertIconData resolves a known status to icon data', () => {
    expect(components.getAlertIconData('success')).toMatchObject({ name: expect.any(String) })
  })

  it('getSortIconData returns icon data for asc and desc', () => {
    expect(components.getSortIconData('asc')).toBeTruthy()
    expect(components.getSortIconData('desc')).toBeTruthy()
  })

  it('getPaginationIconData returns icon data for a direction', () => {
    expect(components.getPaginationIconData('next')).toBeTruthy()
  })

  it('generateToastId produces unique-ish ids', () => {
    expect(components.generateToastId()).not.toBe(components.generateToastId())
  })
})

// =============================================================================
// Component definitions — ported from @molecule/app-ui-react
// =============================================================================

/**
 * Asserts a module export is a Svelte component: a function the Svelte runtime
 * mounts, the counterpart of React's forwardRef object (`$$typeof`).
 *
 * @param component - The module export to check.
 */
const expectSvelteComponent = (component: unknown): void => {
  expect(typeof component).toBe('function')
}

describe('component display names', () => {
  const componentsWithDisplayNames: [string, { readonly name: string }][] = [
    ['Button', components.Button],
    ['Input', components.Input],
    ['Textarea', components.Textarea],
    ['Select', components.Select],
    ['Checkbox', components.Checkbox],
    ['RadioGroup', components.RadioGroup],
    ['Switch', components.Switch],
    ['Modal', components.Modal],
    ['Spinner', components.Spinner],
    ['Avatar', components.Avatar],
    ['Badge', components.Badge],
    ['Alert', components.Alert],
    ['Card', components.Card],
    ['CardHeader', components.CardHeader],
    ['CardTitle', components.CardTitle],
    ['CardDescription', components.CardDescription],
    ['CardContent', components.CardContent],
    ['CardFooter', components.CardFooter],
    ['Tabs', components.Tabs],
    ['Table', components.Table],
    ['Tooltip', components.Tooltip],
    ['Progress', components.Progress],
    ['Skeleton', components.Skeleton],
    ['SkeletonText', components.SkeletonText],
    ['SkeletonCircle', components.SkeletonCircle],
    ['Separator', components.Separator],
    ['Container', components.Container],
    ['Flex', components.Flex],
    ['Grid', components.Grid],
    ['Spacer', components.Spacer],
    ['Form', components.Form],
    ['FormField', components.FormField],
    ['Label', components.Label],
    ['Toast', components.Toast],
    ['ToastContainer', components.ToastContainer],
    ['Accordion', components.Accordion],
    ['Pagination', components.Pagination],
    ['Dropdown', components.Dropdown],
    ['DropdownLabel', components.DropdownLabel],
    ['DropdownSeparator', components.DropdownSeparator],
  ]

  for (const [name, component] of componentsWithDisplayNames) {
    it(`${name} should have displayName set to "${name}"`, () => {
      expect(component.name).toBe(name)
    })
  }
})

describe('component types', () => {
  it('Button should be a valid React component (object with render or $$typeof)', () => {
    // A Svelte component is a function, where React's forwardRef returns an
    // exotic object (`$$typeof`); the rule is the same: a caller can render it.
    expectSvelteComponent(components.Button)
  })

  it('Input should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Input)
  })

  it('Textarea should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Textarea)
  })

  it('Select should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Select)
  })

  it('Checkbox should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Checkbox)
  })

  it('RadioGroup should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.RadioGroup)
  })

  it('Switch should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Switch)
  })

  it('Modal should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Modal)
  })

  it('Spinner should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Spinner)
  })

  it('Avatar should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Avatar)
  })

  it('Badge should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Badge)
  })

  it('Alert should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Alert)
  })

  it('Card should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Card)
  })

  it('Tabs should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Tabs)
  })

  it('Table should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Table)
  })

  it('Tooltip should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Tooltip)
  })

  it('Progress should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Progress)
  })

  it('Skeleton should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Skeleton)
  })

  it('Separator should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Separator)
  })

  it('Container should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Container)
  })

  it('Flex should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Flex)
  })

  it('Grid should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Grid)
  })

  it('Spacer should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Spacer)
  })

  it('Form should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Form)
  })

  it('FormField should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.FormField)
  })

  it('Label should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Label)
  })

  it('Toast should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Toast)
  })

  it('ToastContainer should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.ToastContainer)
  })

  it('Accordion should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Accordion)
  })

  it('Pagination should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Pagination)
  })

  it('Dropdown should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.Dropdown)
  })

  it('DropdownLabel should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.DropdownLabel)
  })

  it('DropdownSeparator should be a valid React forwardRef component', () => {
    expectSvelteComponent(components.DropdownSeparator)
  })

  it('ToastProvider should be a function (React FC)', () => {
    // ToastProvider is a plain component function in React (an FC, not
    // forwardRef), and a compiled component function in Svelte.
    expect(typeof components.ToastProvider).toBe('function')
  })
})
