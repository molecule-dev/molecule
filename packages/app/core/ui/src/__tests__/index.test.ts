import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  AccordionItem,
  AccordionProps,
  AlertProps,
  AvatarProps,
  BadgeProps,
  BaseProps,
  ButtonProps,
  ButtonVariant,
  CardProps,
  CheckboxProps,
  ColorVariant,
  ContainerProps,
  FlexProps,
  FormFieldProps,
  FormProps,
  GridProps,
  InputProps,
  InputType,
  ModalProps,
  ModalSize,
  PaginationProps,
  RadioGroupProps,
  RadioOption,
  SelectOption,
  SelectProps,
  Size,
  SkeletonProps,
  SpacerProps,
  SpinnerProps,
  SwitchProps,
  TabItem,
  TableColumn,
  TableProps,
  TabsProps,
  TextareaProps,
  ToastProps,
  TooltipPlacement,
  TooltipProps,
  UIProvider,
} from '../index.js'
import type { UIClassMap } from '../index.js'
import {
  getClassMap,
  getProvider,
  hasClassMap,
  hasProvider,
  setClassMap,
  setProvider,
} from '../index.js'

describe('@molecule/app-ui', () => {
  describe('Types compile correctly', () => {
    it('should compile BaseProps type', () => {
      const props: BaseProps = {
        className: 'test-class',
        style: { color: 'red' },
        testId: 'test-id',
        disabled: false,
      }
      expect(props.className).toBe('test-class')
    })

    it('should compile Size type', () => {
      const sizes: Size[] = ['xs', 'sm', 'md', 'lg', 'xl']
      expect(sizes).toHaveLength(5)
    })

    it('should compile ColorVariant type', () => {
      const colors: ColorVariant[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
      expect(colors).toHaveLength(6)
    })

    it('should compile ButtonVariant type', () => {
      const variants: ButtonVariant[] = ['solid', 'outline', 'ghost', 'link']
      expect(variants).toHaveLength(4)
    })

    it('should compile ButtonProps type', () => {
      const props: ButtonProps = {
        variant: 'solid',
        color: 'primary',
        size: 'md',
        loading: false,
        loadingText: 'Loading...',
        fullWidth: true,
      }
      expect(props.variant).toBe('solid')
    })

    it('should compile InputType type', () => {
      const types: InputType[] = [
        'text',
        'email',
        'password',
        'number',
        'tel',
        'url',
        'search',
        'date',
        'time',
        'datetime-local',
      ]
      expect(types).toHaveLength(10)
    })

    it('should compile InputProps type', () => {
      const props: InputProps = {
        type: 'email',
        size: 'md',
        label: 'Email',
        placeholder: 'Enter email',
        error: undefined,
        hint: 'We will not share your email',
        required: true,
        clearable: true,
      }
      expect(props.type).toBe('email')
    })

    it('should compile TextareaProps type', () => {
      const props: TextareaProps = {
        label: 'Description',
        placeholder: 'Enter description',
        autoResize: true,
        minRows: 3,
        maxRows: 10,
      }
      expect(props.minRows).toBe(3)
    })

    it('should compile SelectOption type', () => {
      const option: SelectOption<string> = {
        value: 'option1',
        label: 'Option 1',
        disabled: false,
        group: 'Group A',
      }
      expect(option.value).toBe('option1')
    })

    it('should compile SelectProps type', () => {
      const props: SelectProps<string> = {
        options: [{ value: '1', label: 'One' }],
        value: '1',
        size: 'md',
        label: 'Select',
        clearable: true,
      }
      expect(props.options).toHaveLength(1)
    })

    it('should compile CheckboxProps type', () => {
      const props: CheckboxProps = {
        checked: true,
        indeterminate: false,
        size: 'md',
      }
      expect(props.checked).toBe(true)
    })

    it('should compile RadioOption type', () => {
      const option: RadioOption<string> = {
        value: 'option1',
        label: 'Option 1',
        disabled: false,
      }
      expect(option.value).toBe('option1')
    })

    it('should compile RadioGroupProps type', () => {
      const props: RadioGroupProps<string> = {
        options: [{ value: '1', label: 'One' }],
        value: '1',
        size: 'md',
        direction: 'horizontal',
      }
      expect(props.direction).toBe('horizontal')
    })

    it('should compile SwitchProps type', () => {
      const props: SwitchProps = {
        checked: true,
        size: 'md',
        color: 'primary',
      }
      expect(props.checked).toBe(true)
    })

    it('should compile ModalSize type', () => {
      const sizes: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full']
      expect(sizes).toHaveLength(5)
    })

    it('should compile ModalProps type', () => {
      const props: ModalProps = {
        open: true,
        onClose: () => {},
        size: 'md',
        showCloseButton: true,
        closeOnOverlayClick: true,
        closeOnEscape: true,
        centered: true,
        preventScroll: true,
      }
      expect(props.open).toBe(true)
    })

    it('should compile SpinnerProps type', () => {
      const props: SpinnerProps = {
        size: 'md',
        color: 'primary',
        label: 'Loading...',
        thickness: 2,
      }
      expect(props.thickness).toBe(2)
    })

    it('should compile AvatarProps type', () => {
      const props: AvatarProps = {
        src: 'https://example.com/avatar.jpg',
        alt: 'User Avatar',
        name: 'John Doe',
        size: 'md',
        rounded: true,
      }
      expect(props.rounded).toBe(true)
    })

    it('should compile BadgeProps type', () => {
      const props: BadgeProps = {
        color: 'success',
        variant: 'solid',
        size: 'sm',
        rounded: true,
      }
      expect(props.variant).toBe('solid')
    })

    it('should compile TooltipPlacement type', () => {
      const placements: TooltipPlacement[] = [
        'top',
        'bottom',
        'left',
        'right',
        'top-start',
        'top-end',
        'bottom-start',
        'bottom-end',
      ]
      expect(placements).toHaveLength(8)
    })

    it('should compile TooltipProps type', () => {
      const props: TooltipProps = {
        content: 'Tooltip content',
        children: null,
        placement: 'top',
        delay: 200,
        disabled: false,
        hasArrow: true,
      }
      expect(props.placement).toBe('top')
    })

    it('should compile CardProps type', () => {
      const props: CardProps = {
        variant: 'elevated',
        interactive: true,
        padding: 'md',
      }
      expect(props.variant).toBe('elevated')
    })

    it('should compile ContainerProps type', () => {
      const props: ContainerProps = {
        maxWidth: 'lg',
        centered: true,
        paddingX: 'md',
      }
      expect(props.centered).toBe(true)
    })

    it('should compile FlexProps type', () => {
      const props: FlexProps = {
        direction: 'row',
        justify: 'center',
        align: 'center',
        wrap: 'wrap',
        gap: 'md',
      }
      expect(props.direction).toBe('row')
    })

    it('should compile GridProps type', () => {
      const props: GridProps = {
        columns: 3,
        rows: 2,
        gap: 'md',
        columnGap: 'sm',
        rowGap: 'lg',
      }
      expect(props.columns).toBe(3)
    })

    it('should compile SpacerProps type', () => {
      const props: SpacerProps = {
        size: 'md',
        horizontal: false,
      }
      expect(props.horizontal).toBe(false)
    })

    it('should compile FormProps type', () => {
      const props: FormProps = {
        onSubmit: async () => {},
        submitting: false,
      }
      expect(props.submitting).toBe(false)
    })

    it('should compile FormFieldProps type', () => {
      const props: FormFieldProps = {
        label: 'Field Label',
        name: 'fieldName',
        error: undefined,
        hint: 'Helpful hint',
        required: true,
      }
      expect(props.required).toBe(true)
    })

    it('should compile AlertProps type', () => {
      const props: AlertProps = {
        title: 'Alert Title',
        status: 'info',
        variant: 'subtle',
        dismissible: true,
      }
      expect(props.status).toBe('info')
    })

    it('should compile ToastProps type', () => {
      const props: ToastProps = {
        title: 'Toast Title',
        description: 'Toast description',
        status: 'success',
        duration: 5000,
        dismissible: true,
        position: 'top-right',
      }
      expect(props.position).toBe('top-right')
    })

    it('should compile TabItem type', () => {
      const item: TabItem<string> = {
        value: 'tab1',
        label: 'Tab 1',
        disabled: false,
      }
      expect(item.value).toBe('tab1')
    })

    it('should compile TabsProps type', () => {
      const props: TabsProps<string> = {
        items: [{ value: 'tab1', label: 'Tab 1' }],
        value: 'tab1',
        variant: 'line',
        size: 'md',
        fitted: true,
      }
      expect(props.fitted).toBe(true)
    })

    it('should compile AccordionItem type', () => {
      const item: AccordionItem<string> = {
        value: 'item1',
        header: 'Header 1',
        content: 'Content 1',
        disabled: false,
      }
      expect(item.value).toBe('item1')
    })

    it('should compile AccordionProps type', () => {
      const props: AccordionProps<string> = {
        items: [{ value: 'item1', header: 'Header', content: 'Content' }],
        value: 'item1',
        multiple: false,
        collapsible: true,
      }
      expect(props.collapsible).toBe(true)
    })

    it('should compile TableColumn type', () => {
      interface Row {
        id: string
        name: string
      }
      const column: TableColumn<Row> = {
        key: 'name',
        header: 'Name',
        width: 200,
        sortable: true,
        align: 'left',
      }
      expect(column.sortable).toBe(true)
    })

    it('should compile TableProps type', () => {
      interface Row {
        id: string
        name: string
      }
      const props: TableProps<Row> = {
        data: [{ id: '1', name: 'Item 1' }],
        columns: [{ key: 'name', header: 'Name' }],
        rowKey: 'id',
        bordered: true,
        striped: true,
        hoverable: true,
        size: 'md',
        loading: false,
      }
      expect(props.bordered).toBe(true)
    })

    it('should compile PaginationProps type', () => {
      const props: PaginationProps = {
        page: 1,
        totalPages: 10,
        onChange: () => {},
        siblings: 1,
        boundaries: 1,
        size: 'md',
        showFirstLast: true,
        showPrevNext: true,
      }
      expect(props.totalPages).toBe(10)
    })

    it('should compile SkeletonProps type', () => {
      const props: SkeletonProps = {
        width: 200,
        height: 20,
        circle: false,
        borderRadius: 4,
        animation: 'pulse',
      }
      expect(props.animation).toBe('pulse')
    })
  })

  describe('BaseProps - optional properties', () => {
    it('should compile with minimal props (empty object)', () => {
      const props: BaseProps = {}
      expect(props.className).toBeUndefined()
      expect(props.style).toBeUndefined()
      expect(props.testId).toBeUndefined()
      expect(props.disabled).toBeUndefined()
    })

    it('should compile with only className', () => {
      const props: BaseProps = { className: 'single-class' }
      expect(props.className).toBe('single-class')
    })

    it('should compile with complex CSSProperties', () => {
      const props: BaseProps = {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff',
          padding: '16px',
          margin: 0,
        },
      }
      expect(props.style?.display).toBe('flex')
      expect(props.style?.padding).toBe('16px')
    })
  })

  describe('ButtonProps - comprehensive tests', () => {
    it('should compile with icons (ReactNode)', () => {
      const props: ButtonProps = {
        leftIcon: 'icon-left',
        rightIcon: 'icon-right',
        children: 'Click me',
      }
      expect(props.leftIcon).toBe('icon-left')
      expect(props.rightIcon).toBe('icon-right')
    })

    it('should compile with all button variants', () => {
      const solidButton: ButtonProps = { variant: 'solid' }
      const outlineButton: ButtonProps = { variant: 'outline' }
      const ghostButton: ButtonProps = { variant: 'ghost' }
      const linkButton: ButtonProps = { variant: 'link' }

      expect(solidButton.variant).toBe('solid')
      expect(outlineButton.variant).toBe('outline')
      expect(ghostButton.variant).toBe('ghost')
      expect(linkButton.variant).toBe('link')
    })

    it('should compile with all color variants', () => {
      const colors: ColorVariant[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
      colors.forEach((color) => {
        const props: ButtonProps = { color }
        expect(props.color).toBe(color)
      })
    })

    it('should compile with all sizes', () => {
      const sizes: Size[] = ['xs', 'sm', 'md', 'lg', 'xl']
      sizes.forEach((size) => {
        const props: ButtonProps = { size }
        expect(props.size).toBe(size)
      })
    })

    it('should compile with loading state', () => {
      const props: ButtonProps = {
        loading: true,
        loadingText: 'Submitting...',
        disabled: true,
      }
      expect(props.loading).toBe(true)
      expect(props.loadingText).toBe('Submitting...')
    })

    it('should inherit ButtonHTMLAttributes', () => {
      const onClick = vi.fn()
      const props: ButtonProps = {
        type: 'submit',
        onClick,
        name: 'submit-btn',
        'aria-label': 'Submit form',
      }
      expect(props.type).toBe('submit')
      expect(props.onClick).toBe(onClick)
      expect(props.name).toBe('submit-btn')
    })
  })

  describe('InputProps - comprehensive tests', () => {
    it('should compile with all input types', () => {
      const types: InputType[] = [
        'text',
        'email',
        'password',
        'number',
        'tel',
        'url',
        'search',
        'date',
        'time',
        'datetime-local',
      ]
      types.forEach((type) => {
        const props: InputProps = { type }
        expect(props.type).toBe(type)
      })
    })

    it('should compile with left and right elements', () => {
      const props: InputProps = {
        leftElement: '$',
        rightElement: '.00',
        type: 'number',
      }
      expect(props.leftElement).toBe('$')
      expect(props.rightElement).toBe('.00')
    })

    it('should compile with clearable and onClear', () => {
      const onClear = vi.fn()
      const props: InputProps = {
        clearable: true,
        onClear,
        value: 'test',
      }
      expect(props.clearable).toBe(true)
      expect(props.onClear).toBe(onClear)
    })

    it('should compile with error and hint states', () => {
      const errorProps: InputProps = {
        error: 'This field is required',
        required: true,
      }
      const hintProps: InputProps = {
        hint: 'Enter your full name',
        label: 'Name',
      }
      expect(errorProps.error).toBe('This field is required')
      expect(hintProps.hint).toBe('Enter your full name')
    })

    it('should inherit InputHTMLAttributes', () => {
      const onChange = vi.fn()
      const props: InputProps = {
        name: 'email-input',
        id: 'email-field',
        autoComplete: 'email',
        autoFocus: true,
        maxLength: 100,
        minLength: 5,
        pattern: '[a-z]+',
        onChange,
        'aria-describedby': 'email-hint',
      }
      expect(props.name).toBe('email-input')
      expect(props.autoComplete).toBe('email')
      expect(props.maxLength).toBe(100)
    })
  })

  describe('TextareaProps - comprehensive tests', () => {
    it('should compile with auto-resize configuration', () => {
      const props: TextareaProps = {
        autoResize: true,
        minRows: 2,
        maxRows: 10,
      }
      expect(props.autoResize).toBe(true)
      expect(props.minRows).toBe(2)
      expect(props.maxRows).toBe(10)
    })

    it('should inherit TextareaHTMLAttributes', () => {
      const onChange = vi.fn()
      const props: TextareaProps = {
        name: 'description',
        rows: 5,
        cols: 50,
        wrap: 'soft',
        onChange,
      }
      expect(props.rows).toBe(5)
      expect(props.cols).toBe(50)
      expect(props.wrap).toBe('soft')
    })
  })

  describe('SelectProps - generic type tests', () => {
    it('should compile with string values', () => {
      const props: SelectProps<string> = {
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
        value: 'a',
        onChange: (val) => {
          const _check: string = val
          expect(typeof _check).toBe('string')
        },
      }
      expect(props.options).toHaveLength(2)
    })

    it('should compile with number values', () => {
      const props: SelectProps<number> = {
        options: [
          { value: 1, label: 'One' },
          { value: 2, label: 'Two' },
        ],
        value: 1,
        onChange: (val) => {
          const _check: number = val
          expect(typeof _check).toBe('number')
        },
      }
      expect(props.value).toBe(1)
    })

    it('should compile with grouped options', () => {
      const props: SelectProps<string> = {
        options: [
          { value: 'apple', label: 'Apple', group: 'Fruits' },
          { value: 'banana', label: 'Banana', group: 'Fruits' },
          { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
        ],
      }
      expect(props.options[0].group).toBe('Fruits')
      expect(props.options[2].group).toBe('Vegetables')
    })

    it('should compile with disabled options', () => {
      const props: SelectProps<string> = {
        options: [
          { value: 'active', label: 'Active Option' },
          { value: 'disabled', label: 'Disabled Option', disabled: true },
        ],
      }
      expect(props.options[1].disabled).toBe(true)
    })
  })

  describe('RadioGroupProps - generic type tests', () => {
    it('should compile with custom value types', () => {
      interface CustomValue {
        id: number
        code: string
      }
      const val1: CustomValue = { id: 1, code: 'A' }
      const val2: CustomValue = { id: 2, code: 'B' }

      const props: RadioGroupProps<CustomValue> = {
        options: [
          { value: val1, label: 'Option A' },
          { value: val2, label: 'Option B' },
        ],
        value: val1,
        onChange: (val) => {
          expect(val.id).toBeDefined()
          expect(val.code).toBeDefined()
        },
      }
      expect(props.options).toHaveLength(2)
    })

    it('should compile with vertical and horizontal directions', () => {
      const horizontal: RadioGroupProps<string> = {
        options: [{ value: 'a', label: 'A' }],
        direction: 'horizontal',
      }
      const vertical: RadioGroupProps<string> = {
        options: [{ value: 'a', label: 'A' }],
        direction: 'vertical',
      }
      expect(horizontal.direction).toBe('horizontal')
      expect(vertical.direction).toBe('vertical')
    })
  })

  describe('ModalProps - comprehensive tests', () => {
    it('should compile with all modal sizes', () => {
      const sizes: ModalSize[] = ['sm', 'md', 'lg', 'xl', 'full']
      sizes.forEach((size) => {
        const props: ModalProps = {
          open: true,
          onClose: vi.fn(),
          size,
        }
        expect(props.size).toBe(size)
      })
    })

    it('should compile with all close behaviors', () => {
      const onClose = vi.fn()
      const props: ModalProps = {
        open: true,
        onClose,
        showCloseButton: true,
        closeOnOverlayClick: false,
        closeOnEscape: true,
      }
      expect(props.closeOnOverlayClick).toBe(false)
      expect(props.closeOnEscape).toBe(true)
    })

    it('should compile with footer content', () => {
      const props: ModalProps = {
        open: true,
        onClose: vi.fn(),
        title: 'Confirm Action',
        footer: 'Footer buttons here',
        children: 'Modal body content',
      }
      expect(props.footer).toBe('Footer buttons here')
      expect(props.children).toBe('Modal body content')
    })
  })

  describe('SpinnerProps - comprehensive tests', () => {
    it('should compile with ColorVariant color', () => {
      const props: SpinnerProps = {
        color: 'primary',
        size: 'md',
      }
      expect(props.color).toBe('primary')
    })

    it('should compile with custom string color', () => {
      const props: SpinnerProps = {
        color: '#ff0000',
        size: 'lg',
      }
      expect(props.color).toBe('#ff0000')
    })

    it('should compile with accessibility label', () => {
      const props: SpinnerProps = {
        label: 'Loading content...',
      }
      expect(props.label).toBe('Loading content...')
    })
  })

  describe('AvatarProps - comprehensive tests', () => {
    it('should compile with Size enum', () => {
      const props: AvatarProps = {
        size: 'lg',
        name: 'John Doe',
      }
      expect(props.size).toBe('lg')
    })

    it('should compile with numeric size', () => {
      const props: AvatarProps = {
        size: 64,
        name: 'John Doe',
      }
      expect(props.size).toBe(64)
    })

    it('should compile with fallback and onError', () => {
      const onError = vi.fn()
      const props: AvatarProps = {
        src: 'https://example.com/broken.jpg',
        fallback: 'FB',
        onError,
      }
      expect(props.fallback).toBe('FB')
      expect(props.onError).toBe(onError)
    })
  })

  describe('TooltipProps - comprehensive tests', () => {
    it('should compile with all placement options', () => {
      const placements: TooltipPlacement[] = [
        'top',
        'bottom',
        'left',
        'right',
        'top-start',
        'top-end',
        'bottom-start',
        'bottom-end',
      ]
      placements.forEach((placement) => {
        const props: TooltipProps = {
          content: 'Tooltip',
          children: 'Trigger',
          placement,
        }
        expect(props.placement).toBe(placement)
      })
    })

    it('should compile with delay and arrow configuration', () => {
      const props: TooltipProps = {
        content: 'Tooltip with delay',
        children: 'Hover me',
        delay: 500,
        hasArrow: false,
      }
      expect(props.delay).toBe(500)
      expect(props.hasArrow).toBe(false)
    })
  })

  describe('Layout components - comprehensive tests', () => {
    it('FlexProps should compile with all justify options', () => {
      const options: FlexProps['justify'][] = [
        'start',
        'end',
        'center',
        'between',
        'around',
        'evenly',
      ]
      options.forEach((justify) => {
        const props: FlexProps = { justify }
        expect(props.justify).toBe(justify)
      })
    })

    it('FlexProps should compile with all align options', () => {
      const options: FlexProps['align'][] = ['start', 'end', 'center', 'baseline', 'stretch']
      options.forEach((align) => {
        const props: FlexProps = { align }
        expect(props.align).toBe(align)
      })
    })

    it('FlexProps should compile with numeric gap', () => {
      const props: FlexProps = { gap: 16 }
      expect(props.gap).toBe(16)
    })

    it('FlexProps should compile with string gap', () => {
      const props: FlexProps = { gap: '1rem' }
      expect(props.gap).toBe('1rem')
    })

    it('GridProps should compile with string columns/rows', () => {
      const props: GridProps = {
        columns: 'repeat(auto-fill, minmax(200px, 1fr))',
        rows: 'auto 1fr auto',
      }
      expect(props.columns).toBe('repeat(auto-fill, minmax(200px, 1fr))')
    })

    it('GridProps should compile with separate column and row gaps', () => {
      const props: GridProps = {
        columnGap: 'md',
        rowGap: 'lg',
      }
      expect(props.columnGap).toBe('md')
      expect(props.rowGap).toBe('lg')
    })

    it('ContainerProps should compile with custom maxWidth string', () => {
      const props: ContainerProps = {
        maxWidth: '1400px',
        paddingX: '2rem',
      }
      expect(props.maxWidth).toBe('1400px')
      expect(props.paddingX).toBe('2rem')
    })

    it('SpacerProps should compile with numeric size', () => {
      const props: SpacerProps = {
        size: 32,
        horizontal: true,
      }
      expect(props.size).toBe(32)
      expect(props.horizontal).toBe(true)
    })
  })

  describe('CardProps - comprehensive tests', () => {
    it('should compile with all variants', () => {
      const variants: CardProps['variant'][] = ['elevated', 'outlined', 'filled']
      variants.forEach((variant) => {
        const props: CardProps = { variant }
        expect(props.variant).toBe(variant)
      })
    })

    it('should compile with padding options', () => {
      const sizes: (Size | 'none')[] = ['xs', 'sm', 'md', 'lg', 'xl', 'none']
      sizes.forEach((padding) => {
        const props: CardProps = { padding }
        expect(props.padding).toBe(padding)
      })
    })

    it('should inherit HTMLAttributes', () => {
      const onClick = vi.fn()
      const props: CardProps = {
        interactive: true,
        onClick,
        role: 'button',
        tabIndex: 0,
      }
      expect(props.onClick).toBe(onClick)
      expect(props.role).toBe('button')
    })
  })

  describe('AlertProps - comprehensive tests', () => {
    it('should compile with all alert variants', () => {
      const variants: AlertProps['variant'][] = ['solid', 'subtle', 'outline', 'left-accent']
      variants.forEach((variant) => {
        const props: AlertProps = { variant }
        expect(props.variant).toBe(variant)
      })
    })

    it('should compile with dismissible configuration', () => {
      const onDismiss = vi.fn()
      const props: AlertProps = {
        dismissible: true,
        onDismiss,
        title: 'Dismissible Alert',
        children: 'This alert can be dismissed',
      }
      expect(props.dismissible).toBe(true)
      expect(props.onDismiss).toBe(onDismiss)
    })

    it('should compile with custom icon', () => {
      const props: AlertProps = {
        status: 'warning',
        icon: 'custom-icon-element',
      }
      expect(props.icon).toBe('custom-icon-element')
    })
  })

  describe('ToastProps - comprehensive tests', () => {
    it('should compile with all position options', () => {
      const positions: ToastProps['position'][] = [
        'top',
        'top-right',
        'top-left',
        'bottom',
        'bottom-right',
        'bottom-left',
      ]
      positions.forEach((position) => {
        const props: ToastProps = { position }
        expect(props.position).toBe(position)
      })
    })

    it('should compile with persistent toast (duration 0)', () => {
      const props: ToastProps = {
        title: 'Persistent Toast',
        duration: 0,
        dismissible: true,
      }
      expect(props.duration).toBe(0)
    })
  })

  describe('TabsProps - generic type tests', () => {
    it('should compile with number tab values', () => {
      const props: TabsProps<number> = {
        items: [
          { value: 1, label: 'Tab 1', content: 'Content 1' },
          { value: 2, label: 'Tab 2', content: 'Content 2' },
        ],
        value: 1,
        onChange: (val) => {
          const _check: number = val
          expect(typeof _check).toBe('number')
        },
      }
      expect(props.value).toBe(1)
    })

    it('should compile with all tab variants', () => {
      const variants: TabsProps<string>['variant'][] = [
        'line',
        'enclosed',
        'soft-rounded',
        'solid-rounded',
      ]
      variants.forEach((variant) => {
        const props: TabsProps<string> = {
          items: [{ value: 'tab', label: 'Tab' }],
          variant,
        }
        expect(props.variant).toBe(variant)
      })
    })

    it('should compile with defaultValue', () => {
      const props: TabsProps<string> = {
        items: [
          { value: 'tab1', label: 'Tab 1' },
          { value: 'tab2', label: 'Tab 2' },
        ],
        defaultValue: 'tab1',
      }
      expect(props.defaultValue).toBe('tab1')
    })

    it('should compile with disabled tabs', () => {
      const props: TabsProps<string> = {
        items: [
          { value: 'active', label: 'Active' },
          { value: 'disabled', label: 'Disabled', disabled: true },
        ],
      }
      expect(props.items[1].disabled).toBe(true)
    })
  })

  describe('AccordionProps - generic type tests', () => {
    it('should compile with multiple expanded items', () => {
      const props: AccordionProps<string> = {
        items: [
          { value: 'item1', header: 'Header 1', content: 'Content 1' },
          { value: 'item2', header: 'Header 2', content: 'Content 2' },
        ],
        value: ['item1', 'item2'],
        multiple: true,
        onChange: (val) => {
          expect(Array.isArray(val)).toBe(true)
        },
      }
      expect(props.multiple).toBe(true)
    })

    it('should compile with single expanded item', () => {
      const props: AccordionProps<string> = {
        items: [{ value: 'item1', header: 'Header 1', content: 'Content 1' }],
        value: 'item1',
        multiple: false,
      }
      expect(props.value).toBe('item1')
    })

    it('should compile with defaultValue', () => {
      const props: AccordionProps<string> = {
        items: [{ value: 'item1', header: 'Header 1', content: 'Content 1' }],
        defaultValue: 'item1',
      }
      expect(props.defaultValue).toBe('item1')
    })
  })

  describe('TableProps - comprehensive tests', () => {
    interface TestRow {
      id: string
      name: string
      age: number
      email: string
    }

    it('should compile with rowKey as function', () => {
      const props: TableProps<TestRow> = {
        data: [{ id: '1', name: 'John', age: 30, email: 'john@example.com' }],
        columns: [{ key: 'name', header: 'Name' }],
        rowKey: (row) => `row-${row.id}`,
      }
      expect(typeof props.rowKey).toBe('function')
    })

    it('should compile with custom render function', () => {
      const render = vi.fn()
      const props: TableProps<TestRow> = {
        data: [],
        columns: [
          {
            key: 'name',
            header: 'Name',
            render: (value, row, index) => {
              render(value, row, index)
              return `Custom: ${value}`
            },
          },
        ],
      }
      expect(props.columns[0].render).toBeDefined()
    })

    it('should compile with sort configuration', () => {
      const onSort = vi.fn()
      const props: TableProps<TestRow> = {
        data: [],
        columns: [
          { key: 'name', header: 'Name', sortable: true },
          { key: 'age', header: 'Age', sortable: true },
        ],
        sort: { key: 'name', direction: 'asc' },
        onSort,
      }
      expect(props.sort?.key).toBe('name')
      expect(props.sort?.direction).toBe('asc')
    })

    it('should compile with row click handler', () => {
      const onRowClick = vi.fn()
      const props: TableProps<TestRow> = {
        data: [{ id: '1', name: 'John', age: 30, email: 'john@example.com' }],
        columns: [{ key: 'name', header: 'Name' }],
        onRowClick,
        hoverable: true,
      }
      expect(props.onRowClick).toBe(onRowClick)
    })

    it('should compile with all table styling options', () => {
      const props: TableProps<TestRow> = {
        data: [],
        columns: [{ key: 'name', header: 'Name' }],
        bordered: true,
        striped: true,
        hoverable: true,
        size: 'sm',
      }
      expect(props.bordered).toBe(true)
      expect(props.striped).toBe(true)
      expect(props.hoverable).toBe(true)
    })

    it('should compile with empty state content', () => {
      const props: TableProps<TestRow> = {
        data: [],
        columns: [{ key: 'name', header: 'Name' }],
        emptyContent: 'No data available',
      }
      expect(props.emptyContent).toBe('No data available')
    })

    it('should compile with column alignment options', () => {
      const props: TableProps<TestRow> = {
        data: [],
        columns: [
          { key: 'name', header: 'Name', align: 'left' },
          { key: 'age', header: 'Age', align: 'center' },
          { key: 'email', header: 'Email', align: 'right' },
        ],
      }
      expect(props.columns[0].align).toBe('left')
      expect(props.columns[1].align).toBe('center')
      expect(props.columns[2].align).toBe('right')
    })
  })

  describe('PaginationProps - comprehensive tests', () => {
    it('should compile with minimal required props', () => {
      const onChange = vi.fn()
      const props: PaginationProps = {
        page: 1,
        totalPages: 10,
        onChange,
      }
      expect(props.page).toBe(1)
      expect(props.totalPages).toBe(10)
    })

    it('should call onChange with correct page number', () => {
      const onChange = vi.fn()
      const props: PaginationProps = {
        page: 1,
        totalPages: 10,
        onChange,
      }
      props.onChange(5)
      expect(onChange).toHaveBeenCalledWith(5)
    })

    it('should compile with sibling and boundary configuration', () => {
      const props: PaginationProps = {
        page: 5,
        totalPages: 20,
        onChange: vi.fn(),
        siblings: 2,
        boundaries: 2,
      }
      expect(props.siblings).toBe(2)
      expect(props.boundaries).toBe(2)
    })

    it('should compile with navigation button configuration', () => {
      const props: PaginationProps = {
        page: 1,
        totalPages: 10,
        onChange: vi.fn(),
        showFirstLast: false,
        showPrevNext: true,
      }
      expect(props.showFirstLast).toBe(false)
      expect(props.showPrevNext).toBe(true)
    })
  })

  describe('SkeletonProps - comprehensive tests', () => {
    it('should compile with string dimensions', () => {
      const props: SkeletonProps = {
        width: '100%',
        height: '20px',
      }
      expect(props.width).toBe('100%')
      expect(props.height).toBe('20px')
    })

    it('should compile with numeric dimensions', () => {
      const props: SkeletonProps = {
        width: 200,
        height: 40,
      }
      expect(props.width).toBe(200)
      expect(props.height).toBe(40)
    })

    it('should compile with all animation types', () => {
      const animations: SkeletonProps['animation'][] = ['pulse', 'wave', 'none']
      animations.forEach((animation) => {
        const props: SkeletonProps = { animation }
        expect(props.animation).toBe(animation)
      })
    })

    it('should compile with circle configuration', () => {
      const props: SkeletonProps = {
        circle: true,
        width: 50,
        height: 50,
      }
      expect(props.circle).toBe(true)
    })

    it('should compile with custom border radius', () => {
      const stringRadius: SkeletonProps = { borderRadius: '8px' }
      const numericRadius: SkeletonProps = { borderRadius: 8 }
      expect(stringRadius.borderRadius).toBe('8px')
      expect(numericRadius.borderRadius).toBe(8)
    })
  })

  describe('FormProps - comprehensive tests', () => {
    it('should compile with sync onSubmit handler', () => {
      const onSubmit = vi.fn()
      const props: FormProps = {
        onSubmit: (data) => {
          onSubmit(data)
        },
      }
      expect(props.onSubmit).toBeDefined()
    })

    it('should compile with async onSubmit handler', () => {
      const props: FormProps = {
        onSubmit: async (data) => {
          await Promise.resolve(data)
        },
        submitting: true,
      }
      expect(props.submitting).toBe(true)
    })

    it('should inherit FormHTMLAttributes', () => {
      const props: FormProps = {
        action: '/api/submit',
        method: 'POST',
        encType: 'multipart/form-data',
        autoComplete: 'off',
        noValidate: true,
      }
      expect(props.action).toBe('/api/submit')
      expect(props.method).toBe('POST')
    })
  })

  describe('CheckboxProps - comprehensive tests', () => {
    it('should compile with indeterminate state', () => {
      const props: CheckboxProps = {
        checked: false,
        indeterminate: true,
      }
      expect(props.indeterminate).toBe(true)
    })

    it('should compile with ReactNode label', () => {
      const props: CheckboxProps = {
        label: 'I agree to terms',
      }
      expect(props.label).toBe('I agree to terms')
    })

    it('should inherit InputHTMLAttributes', () => {
      const onChange = vi.fn()
      const props: CheckboxProps = {
        name: 'agree',
        value: 'yes',
        onChange,
        'aria-label': 'Agree to terms',
      }
      expect(props.name).toBe('agree')
      expect(props.value).toBe('yes')
    })
  })

  describe('SwitchProps - comprehensive tests', () => {
    it('should compile with all color variants', () => {
      const colors: ColorVariant[] = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
      colors.forEach((color) => {
        const props: SwitchProps = { color }
        expect(props.color).toBe(color)
      })
    })

    it('should compile with ReactNode label', () => {
      const props: SwitchProps = {
        label: 'Enable notifications',
        checked: true,
      }
      expect(props.label).toBe('Enable notifications')
    })

    it('should inherit InputHTMLAttributes', () => {
      const onChange = vi.fn()
      const props: SwitchProps = {
        name: 'notifications',
        onChange,
        'aria-label': 'Toggle notifications',
      }
      expect(props.name).toBe('notifications')
    })
  })

  describe('Provider management', () => {
    beforeEach(() => {
      // Reset provider state by setting undefined
      setProvider(undefined as unknown as UIProvider)
    })

    it('should return undefined when no provider is set', () => {
      expect(getProvider()).toBeUndefined()
    })

    it('should return false when no provider is set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should set and get a provider', () => {
      const provider: UIProvider = { name: 'test-provider' }
      setProvider(provider)
      expect(getProvider()).toBe(provider)
      expect(hasProvider()).toBe(true)
    })

    it('should allow replacing the provider', () => {
      const provider1: UIProvider = { name: 'provider1' }
      const provider2: UIProvider = { name: 'provider2' }

      setProvider(provider1)
      expect(getProvider()?.name).toBe('provider1')

      setProvider(provider2)
      expect(getProvider()?.name).toBe('provider2')
    })

    it('should maintain provider reference identity', () => {
      const provider: UIProvider = { name: 'reference-test' }
      setProvider(provider)
      expect(getProvider()).toBe(provider)
      expect(getProvider() === provider).toBe(true)
    })

    it('should handle provider with additional properties', () => {
      interface ExtendedProvider extends UIProvider {
        version: string
        config: { theme: string }
      }
      const extendedProvider: ExtendedProvider = {
        name: 'extended-provider',
        version: '1.0.0',
        config: { theme: 'dark' },
      }
      setProvider(extendedProvider)
      const retrieved = getProvider() as ExtendedProvider
      expect(retrieved.name).toBe('extended-provider')
      expect(retrieved.version).toBe('1.0.0')
      expect(retrieved.config.theme).toBe('dark')
    })
  })

  describe('ClassMap management', () => {
    beforeEach(() => {
      // Reset classMap state
      setClassMap(undefined as unknown as UIClassMap)
    })

    it('should return false when no classMap is set', () => {
      expect(hasClassMap()).toBe(false)
    })

    it('should throw when getClassMap is called without setting', () => {
      expect(() => getClassMap()).toThrow('No UIClassMap has been set')
    })

    it('should set and get a classMap', () => {
      const mockClassMap = {
        cn: (...args: unknown[]) => String(args.filter(Boolean).join(' ')),
        button: () => 'btn',
        input: () => 'input',
        textarea: () => 'textarea',
        select: () => 'select',
        checkbox: () => 'checkbox',
        radio: () => 'radio',
        switchBase: () => 'switch',
        switchThumb: () => 'switch-thumb',
        label: () => 'label',
        card: () => 'card',
        badge: () => 'badge',
        alert: () => 'alert',
        avatar: () => 'avatar',
        modal: () => 'modal',
        spinner: () => 'spinner',
        toast: () => 'toast',
        separator: () => 'separator',
        accordion: () => 'accordion',
        pagination: () => 'pagination',
        tooltip: () => 'tooltip',
        progress: () => 'progress',
        progressBar: () => 'progress-bar',
        skeleton: () => 'skeleton',
        container: () => 'container',
        flex: () => 'flex',
        grid: () => 'grid',
        formError: 'form-error',
        formHint: 'form-hint',
        cardHeader: 'card-header',
        cardTitle: 'card-title',
        cardDescription: 'card-desc',
        cardContent: 'card-content',
        cardFooter: 'card-footer',
        alertTitle: 'alert-title',
        alertDescription: 'alert-desc',
        avatarImage: 'avatar-image',
        avatarFallback: 'avatar-fallback',
        dialogOverlay: 'dialog-overlay',
        dialogHeader: 'dialog-header',
        dialogFooter: 'dialog-footer',
        dialogTitle: 'dialog-title',
        dialogDescription: 'dialog-desc',
        dialogClose: 'dialog-close',
        dropdownContent: 'dropdown-content',
        dropdownItem: 'dropdown-item',
        dropdownSeparator: 'dropdown-separator',
        dropdownLabel: 'dropdown-label',
        table: 'table',
        tableHeader: 'table-header',
        tableBody: 'table-body',
        tableFooter: 'table-footer',
        tableRow: 'table-row',
        tableHead: 'table-head',
        tableCell: 'table-cell',
        tableCaption: 'table-caption',
        tabsList: 'tabs-list',
        tabsTrigger: 'tabs-trigger',
        tabsContent: 'tabs-content',
        tooltipContent: 'tooltip-content',
        toastViewport: 'toast-viewport',
        toastTitle: 'toast-title',
        toastDescription: 'toast-desc',
        toastClose: 'toast-close',
        toastAction: 'toast-action',
        accordionRoot: 'accordion-root',
        accordionItem: 'accordion-item',
        accordionContent: 'accordion-content',
        accordionContentInner: 'accordion-content-inner',
        paginationRoot: 'pagination-root',
        paginationContent: 'pagination-content',
        paginationLink: 'pagination-link',
        paginationPrevious: 'pagination-previous',
        paginationNext: 'pagination-next',
        paginationEllipsis: 'pagination-ellipsis',
        center: 'center',
        srOnly: 'sr-only',
        notSrOnly: 'not-sr-only',
      } as UIClassMap
      setClassMap(mockClassMap)
      expect(getClassMap()).toBe(mockClassMap)
      expect(hasClassMap()).toBe(true)
    })

    it('should allow replacing the classMap', () => {
      const cm1 = { button: () => 'btn-1' } as unknown as UIClassMap
      const cm2 = { button: () => 'btn-2' } as unknown as UIClassMap
      setClassMap(cm1)
      expect(getClassMap()).toBe(cm1)
      setClassMap(cm2)
      expect(getClassMap()).toBe(cm2)
    })

    it('should maintain classMap reference identity', () => {
      const cm = { button: () => 'btn' } as unknown as UIClassMap
      setClassMap(cm)
      expect(getClassMap() === cm).toBe(true)
    })
  })
})
