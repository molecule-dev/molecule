/**
 * Tests for React component definitions.
 * Tests display names, forwardRef structure, and basic callable behavior.
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
// Component Type Tests (all should be objects from forwardRef or FC)
// =============================================================================

describe('component types', () => {
  it('Button should be a valid React component (object with render or $$typeof)', () => {
    // forwardRef components are objects with $$typeof
    expect(typeof Button).toBe('object')
    expect(Button).toHaveProperty('$$typeof')
  })

  it('Input should be a valid React forwardRef component', () => {
    expect(typeof Input).toBe('object')
    expect(Input).toHaveProperty('$$typeof')
  })

  it('Textarea should be a valid React forwardRef component', () => {
    expect(typeof Textarea).toBe('object')
    expect(Textarea).toHaveProperty('$$typeof')
  })

  it('Select should be a valid React forwardRef component', () => {
    expect(typeof Select).toBe('object')
    expect(Select).toHaveProperty('$$typeof')
  })

  it('Checkbox should be a valid React forwardRef component', () => {
    expect(typeof Checkbox).toBe('object')
    expect(Checkbox).toHaveProperty('$$typeof')
  })

  it('RadioGroup should be a valid React forwardRef component', () => {
    expect(typeof RadioGroup).toBe('object')
    expect(RadioGroup).toHaveProperty('$$typeof')
  })

  it('Switch should be a valid React forwardRef component', () => {
    expect(typeof Switch).toBe('object')
    expect(Switch).toHaveProperty('$$typeof')
  })

  it('Modal should be a valid React forwardRef component', () => {
    expect(typeof Modal).toBe('object')
    expect(Modal).toHaveProperty('$$typeof')
  })

  it('Spinner should be a valid React forwardRef component', () => {
    expect(typeof Spinner).toBe('object')
    expect(Spinner).toHaveProperty('$$typeof')
  })

  it('Avatar should be a valid React forwardRef component', () => {
    expect(typeof Avatar).toBe('object')
    expect(Avatar).toHaveProperty('$$typeof')
  })

  it('Badge should be a valid React forwardRef component', () => {
    expect(typeof Badge).toBe('object')
    expect(Badge).toHaveProperty('$$typeof')
  })

  it('Alert should be a valid React forwardRef component', () => {
    expect(typeof Alert).toBe('object')
    expect(Alert).toHaveProperty('$$typeof')
  })

  it('Card should be a valid React forwardRef component', () => {
    expect(typeof Card).toBe('object')
    expect(Card).toHaveProperty('$$typeof')
  })

  it('Tabs should be a valid React forwardRef component', () => {
    expect(typeof Tabs).toBe('object')
    expect(Tabs).toHaveProperty('$$typeof')
  })

  it('Table should be a valid React forwardRef component', () => {
    expect(typeof Table).toBe('object')
    expect(Table).toHaveProperty('$$typeof')
  })

  it('Tooltip should be a valid React forwardRef component', () => {
    expect(typeof Tooltip).toBe('object')
    expect(Tooltip).toHaveProperty('$$typeof')
  })

  it('Progress should be a valid React forwardRef component', () => {
    expect(typeof Progress).toBe('object')
    expect(Progress).toHaveProperty('$$typeof')
  })

  it('Skeleton should be a valid React forwardRef component', () => {
    expect(typeof Skeleton).toBe('object')
    expect(Skeleton).toHaveProperty('$$typeof')
  })

  it('Separator should be a valid React forwardRef component', () => {
    expect(typeof Separator).toBe('object')
    expect(Separator).toHaveProperty('$$typeof')
  })

  it('Container should be a valid React forwardRef component', () => {
    expect(typeof Container).toBe('object')
    expect(Container).toHaveProperty('$$typeof')
  })

  it('Flex should be a valid React forwardRef component', () => {
    expect(typeof Flex).toBe('object')
    expect(Flex).toHaveProperty('$$typeof')
  })

  it('Grid should be a valid React forwardRef component', () => {
    expect(typeof Grid).toBe('object')
    expect(Grid).toHaveProperty('$$typeof')
  })

  it('Spacer should be a valid React forwardRef component', () => {
    expect(typeof Spacer).toBe('object')
    expect(Spacer).toHaveProperty('$$typeof')
  })

  it('Form should be a valid React forwardRef component', () => {
    expect(typeof Form).toBe('object')
    expect(Form).toHaveProperty('$$typeof')
  })

  it('FormField should be a valid React forwardRef component', () => {
    expect(typeof FormField).toBe('object')
    expect(FormField).toHaveProperty('$$typeof')
  })

  it('Label should be a valid React forwardRef component', () => {
    expect(typeof Label).toBe('object')
    expect(Label).toHaveProperty('$$typeof')
  })

  it('Toast should be a valid React forwardRef component', () => {
    expect(typeof Toast).toBe('object')
    expect(Toast).toHaveProperty('$$typeof')
  })

  it('ToastContainer should be a valid React forwardRef component', () => {
    expect(typeof ToastContainer).toBe('object')
    expect(ToastContainer).toHaveProperty('$$typeof')
  })

  it('Accordion should be a valid React forwardRef component', () => {
    expect(typeof Accordion).toBe('object')
    expect(Accordion).toHaveProperty('$$typeof')
  })

  it('Pagination should be a valid React forwardRef component', () => {
    expect(typeof Pagination).toBe('object')
    expect(Pagination).toHaveProperty('$$typeof')
  })

  it('Dropdown should be a valid React forwardRef component', () => {
    expect(typeof Dropdown).toBe('object')
    expect(Dropdown).toHaveProperty('$$typeof')
  })

  it('DropdownLabel should be a valid React forwardRef component', () => {
    expect(typeof DropdownLabel).toBe('object')
    expect(DropdownLabel).toHaveProperty('$$typeof')
  })

  it('DropdownSeparator should be a valid React forwardRef component', () => {
    expect(typeof DropdownSeparator).toBe('object')
    expect(DropdownSeparator).toHaveProperty('$$typeof')
  })

  it('ToastProvider should be a function (React FC)', async () => {
    // ToastProvider is a regular FC, not forwardRef
    const { ToastProvider } = await import('../index.js')
    expect(typeof ToastProvider).toBe('function')
  })
})
