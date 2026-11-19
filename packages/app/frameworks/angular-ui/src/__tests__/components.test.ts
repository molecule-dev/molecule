/**
 * Tests for Angular component definitions, mirroring
 * `@molecule/app-ui-react/src/__tests__/components.test.tsx`.
 *
 * Each React assertion is translated to the mechanism Angular forces:
 *
 * - a component's `displayName` (React's runtime identity property) is the
 *   class's own name in Angular — the identity the framework reports;
 * - "a valid forwardRef component (object with `$$typeof`)" is a class Angular
 *   carries a component definition for (`reflectComponentType`), the renderable
 *   component Angular can instantiate where React renders through `$$typeof`;
 * - React's function component `ToastProvider` is an Angular component class,
 *   which is a function in both packages.
 *
 * `@molecule/app-ui` + `@molecule/app-icons` are stubbed so module evaluation
 * stays self-contained (the same stubs the package's other definition tests
 * use); no component is mounted, so no ClassMap is resolved.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads —
// evaluating the decorators otherwise throws "needs the JIT compiler".
import '@angular/compiler'
import { reflectComponentType, type Type } from '@angular/core'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
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

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

const {
  Accordion,
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Container,
  Dropdown,
  DropdownLabel,
  DropdownSeparator,
  Flex,
  Form,
  FormField,
  Grid,
  Input,
  Label,
  Modal,
  Pagination,
  Progress,
  RadioGroup,
  Select,
  Separator,
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  Spacer,
  Spinner,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toast,
  ToastContainer,
  ToastProvider,
  Tooltip,
} = await import('../index.js')

/**
 * Asserts a module export is a renderable Angular component: a class the
 * framework decorates with a component definition it can instantiate. This is
 * what React's `forwardRef` object (`$$typeof`) is for a React component, and
 * what a plain function component is for `ToastProvider`.
 *
 * @param component - The module export to check.
 */
const expectAngularComponent = (component: Type<unknown>): void => {
  expect(typeof component).toBe('function')
  expect(reflectComponentType(component)).not.toBeNull()
}

// =============================================================================
// Display Name Tests
// =============================================================================

describe('component display names', () => {
  // React attaches `displayName` to each component at runtime; Angular's
  // components are classes, whose own name is the identity the framework
  // reports for them.
  const componentsWithDisplayNames: [string, Type<unknown>][] = [
    ['Button', Button],
    ['Input', Input],
    ['Textarea', Textarea],
    ['Select', Select],
    ['Checkbox', Checkbox],
    ['RadioGroup', RadioGroup],
    ['Switch', Switch],
    ['Modal', Modal],
    ['Spinner', Spinner],
    ['Avatar', Avatar],
    ['Badge', Badge],
    ['Alert', Alert],
    ['Card', Card],
    ['CardHeader', CardHeader],
    ['CardTitle', CardTitle],
    ['CardDescription', CardDescription],
    ['CardContent', CardContent],
    ['CardFooter', CardFooter],
    ['Tabs', Tabs],
    ['Table', Table],
    ['Tooltip', Tooltip],
    ['Progress', Progress],
    ['Skeleton', Skeleton],
    ['SkeletonText', SkeletonText],
    ['SkeletonCircle', SkeletonCircle],
    ['Separator', Separator],
    ['Container', Container],
    ['Flex', Flex],
    ['Grid', Grid],
    ['Spacer', Spacer],
    ['Form', Form],
    ['FormField', FormField],
    ['Label', Label],
    ['Toast', Toast],
    ['ToastContainer', ToastContainer],
    ['Accordion', Accordion],
    ['Pagination', Pagination],
    ['Dropdown', Dropdown],
    ['DropdownLabel', DropdownLabel],
    ['DropdownSeparator', DropdownSeparator],
  ]

  for (const [name, component] of componentsWithDisplayNames) {
    it(`${name} should have displayName set to "${name}"`, () => {
      expect(component.name).toBe(name)
    })
  }
})

// =============================================================================
// Component Type Tests (all should be Angular component classes)
// =============================================================================

describe('component types', () => {
  it('Button should be a valid React component (object with render or $$typeof)', () => {
    // Angular's renderable component is a decorated class, where React's
    // forwardRef component is an object carrying `$$typeof`.
    expectAngularComponent(Button)
  })

  it('Input should be a valid React forwardRef component', () => {
    expectAngularComponent(Input)
  })

  it('Textarea should be a valid React forwardRef component', () => {
    expectAngularComponent(Textarea)
  })

  it('Select should be a valid React forwardRef component', () => {
    expectAngularComponent(Select)
  })

  it('Checkbox should be a valid React forwardRef component', () => {
    expectAngularComponent(Checkbox)
  })

  it('RadioGroup should be a valid React forwardRef component', () => {
    expectAngularComponent(RadioGroup)
  })

  it('Switch should be a valid React forwardRef component', () => {
    expectAngularComponent(Switch)
  })

  it('Modal should be a valid React forwardRef component', () => {
    expectAngularComponent(Modal)
  })

  it('Spinner should be a valid React forwardRef component', () => {
    expectAngularComponent(Spinner)
  })

  it('Avatar should be a valid React forwardRef component', () => {
    expectAngularComponent(Avatar)
  })

  it('Badge should be a valid React forwardRef component', () => {
    expectAngularComponent(Badge)
  })

  it('Alert should be a valid React forwardRef component', () => {
    expectAngularComponent(Alert)
  })

  it('Card should be a valid React forwardRef component', () => {
    expectAngularComponent(Card)
  })

  it('Tabs should be a valid React forwardRef component', () => {
    expectAngularComponent(Tabs)
  })

  it('Table should be a valid React forwardRef component', () => {
    expectAngularComponent(Table)
  })

  it('Tooltip should be a valid React forwardRef component', () => {
    expectAngularComponent(Tooltip)
  })

  it('Progress should be a valid React forwardRef component', () => {
    expectAngularComponent(Progress)
  })

  it('Skeleton should be a valid React forwardRef component', () => {
    expectAngularComponent(Skeleton)
  })

  it('Separator should be a valid React forwardRef component', () => {
    expectAngularComponent(Separator)
  })

  it('Container should be a valid React forwardRef component', () => {
    expectAngularComponent(Container)
  })

  it('Flex should be a valid React forwardRef component', () => {
    expectAngularComponent(Flex)
  })

  it('Grid should be a valid React forwardRef component', () => {
    expectAngularComponent(Grid)
  })

  it('Spacer should be a valid React forwardRef component', () => {
    expectAngularComponent(Spacer)
  })

  it('Form should be a valid React forwardRef component', () => {
    expectAngularComponent(Form)
  })

  it('FormField should be a valid React forwardRef component', () => {
    expectAngularComponent(FormField)
  })

  it('Label should be a valid React forwardRef component', () => {
    expectAngularComponent(Label)
  })

  it('Toast should be a valid React forwardRef component', () => {
    expectAngularComponent(Toast)
  })

  it('ToastContainer should be a valid React forwardRef component', () => {
    expectAngularComponent(ToastContainer)
  })

  it('Accordion should be a valid React forwardRef component', () => {
    expectAngularComponent(Accordion)
  })

  it('Pagination should be a valid React forwardRef component', () => {
    expectAngularComponent(Pagination)
  })

  it('Dropdown should be a valid React forwardRef component', () => {
    expectAngularComponent(Dropdown)
  })

  it('DropdownLabel should be a valid React forwardRef component', () => {
    expectAngularComponent(DropdownLabel)
  })

  it('DropdownSeparator should be a valid React forwardRef component', () => {
    expectAngularComponent(DropdownSeparator)
  })

  it('ToastProvider should be a function (React FC)', () => {
    // Angular's provider is a component class — a function, the role React's
    // function component plays, mounted once around the tree.
    expect(typeof ToastProvider).toBe('function')
    expectAngularComponent(ToastProvider)
  })
})
