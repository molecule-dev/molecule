// @vitest-environment jsdom
/**
 * Tests for the Solid component definitions.
 * Tests display names, component structure, and basic callable behavior.
 *
 * Solid counterpart of `@molecule/app-ui-react`'s `components.test.tsx`: the
 * same titles and the same values. Solid has no `forwardRef` — a component is
 * a plain function — so "is a valid component" is asserted as "is a function
 * component" rather than React's exotic-forwardRef object (`$$typeof`), which
 * Solid does not have.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import {
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
  Tooltip,
} from '../index.js'

// =============================================================================
// Display Name Tests
// =============================================================================

describe('component display names', () => {
  const componentsWithDisplayNames: [string, { displayName?: string }][] = [
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
      expect(component.displayName).toBe(name)
    })
  }
})

// =============================================================================
// Component Type Tests (every export is a component function)
// =============================================================================

describe('component types', () => {
  it('Button should be a valid React component (object with render or $$typeof)', () => {
    // Solid's component is a renderable function, where React's forwardRef
    // returns an exotic object (`$$typeof`); the observable rule is the same:
    // the export is a component a caller can render.
    expect(typeof Button).toBe('function')
  })

  it('Input should be a valid React forwardRef component', () => {
    expect(typeof Input).toBe('function')
  })

  it('Textarea should be a valid React forwardRef component', () => {
    expect(typeof Textarea).toBe('function')
  })

  it('Select should be a valid React forwardRef component', () => {
    expect(typeof Select).toBe('function')
  })

  it('Checkbox should be a valid React forwardRef component', () => {
    expect(typeof Checkbox).toBe('function')
  })

  it('RadioGroup should be a valid React forwardRef component', () => {
    expect(typeof RadioGroup).toBe('function')
  })

  it('Switch should be a valid React forwardRef component', () => {
    expect(typeof Switch).toBe('function')
  })

  it('Modal should be a valid React forwardRef component', () => {
    expect(typeof Modal).toBe('function')
  })

  it('Spinner should be a valid React forwardRef component', () => {
    expect(typeof Spinner).toBe('function')
  })

  it('Avatar should be a valid React forwardRef component', () => {
    expect(typeof Avatar).toBe('function')
  })

  it('Badge should be a valid React forwardRef component', () => {
    expect(typeof Badge).toBe('function')
  })

  it('Alert should be a valid React forwardRef component', () => {
    expect(typeof Alert).toBe('function')
  })

  it('Card should be a valid React forwardRef component', () => {
    expect(typeof Card).toBe('function')
  })

  it('Tabs should be a valid React forwardRef component', () => {
    expect(typeof Tabs).toBe('function')
  })

  it('Table should be a valid React forwardRef component', () => {
    expect(typeof Table).toBe('function')
  })

  it('Tooltip should be a valid React forwardRef component', () => {
    expect(typeof Tooltip).toBe('function')
  })

  it('Progress should be a valid React forwardRef component', () => {
    expect(typeof Progress).toBe('function')
  })

  it('Skeleton should be a valid React forwardRef component', () => {
    expect(typeof Skeleton).toBe('function')
  })

  it('Separator should be a valid React forwardRef component', () => {
    expect(typeof Separator).toBe('function')
  })

  it('Container should be a valid React forwardRef component', () => {
    expect(typeof Container).toBe('function')
  })

  it('Flex should be a valid React forwardRef component', () => {
    expect(typeof Flex).toBe('function')
  })

  it('Grid should be a valid React forwardRef component', () => {
    expect(typeof Grid).toBe('function')
  })

  it('Spacer should be a valid React forwardRef component', () => {
    expect(typeof Spacer).toBe('function')
  })

  it('Form should be a valid React forwardRef component', () => {
    expect(typeof Form).toBe('function')
  })

  it('FormField should be a valid React forwardRef component', () => {
    expect(typeof FormField).toBe('function')
  })

  it('Label should be a valid React forwardRef component', () => {
    expect(typeof Label).toBe('function')
  })

  it('Toast should be a valid React forwardRef component', () => {
    expect(typeof Toast).toBe('function')
  })

  it('ToastContainer should be a valid React forwardRef component', () => {
    expect(typeof ToastContainer).toBe('function')
  })

  it('Accordion should be a valid React forwardRef component', () => {
    expect(typeof Accordion).toBe('function')
  })

  it('Pagination should be a valid React forwardRef component', () => {
    expect(typeof Pagination).toBe('function')
  })

  it('Dropdown should be a valid React forwardRef component', () => {
    expect(typeof Dropdown).toBe('function')
  })

  it('DropdownLabel should be a valid React forwardRef component', () => {
    expect(typeof DropdownLabel).toBe('function')
  })

  it('DropdownSeparator should be a valid React forwardRef component', () => {
    expect(typeof DropdownSeparator).toBe('function')
  })

  it('ToastProvider should be a function (React FC)', async () => {
    // ToastProvider is a regular FC (a plain component function), not forwardRef.
    const { ToastProvider } = await import('../index.js')
    expect(typeof ToastProvider).toBe('function')
  })
})
