/**
 * Tailwind CSS UI component class definitions.
 *
 * Provides pre-built, accessible UI components using Tailwind CSS classes.
 * These are framework-agnostic class strings that can be used with any
 * rendering library (React, Vue, Svelte, etc.).
 *
 * @module
 */

import { cva } from './utilities.js'

/**
 * Button component classes.
 */
export const button = cva(
  'inline-flex items-center justify-center gap-1 rounded-[3px] text-[15px] font-normal uppercase border-0 cursor-pointer transition-all duration-250 ease-in-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active',
        secondary: 'bg-secondary text-white hover:bg-secondary-hover active:bg-secondary-active',
        success: 'bg-success text-white hover:bg-success-hover active:bg-success-active',
        outline: 'bg-transparent text-foreground hover:bg-surface-secondary',
        ghost: 'bg-transparent text-foreground hover:bg-surface-secondary',
        link: 'bg-transparent text-primary normal-case underline-offset-4 hover:underline',
        danger: 'bg-error text-white hover:bg-error-hover active:bg-error-active',
      },
      size: {
        sm: 'h-[26px] px-2.5 text-[13px]',
        md: 'h-[30px] px-2.5 text-[15px]',
        lg: 'h-10 px-2.5 text-[18px]',
        icon: 'h-[30px] w-[30px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

/**
 * Input component classes.
 */
export const input = cva(
  'flex w-full border border-transparent border-b-[rgba(170,170,170,0.33)] bg-transparent rounded-[1px] px-[3px] leading-none text-center text-foreground transition-all duration-250 ease-in-out file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:opacity-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'hover:border-b-[#909CB8] hover:bg-input-background hover:shadow-[0_0_1.5px_1.5px_rgba(0,0,0,0.025)] focus-visible:border-b-primary focus-visible:bg-input-background focus-visible:shadow-[0_0_1.5px_1.5px_rgba(0,0,0,0.025)]',
        error: 'border-b-error focus-visible:border-b-error',
      },
      size: {
        sm: 'h-[35px] pt-[18px] pb-[3px] text-[15px]',
        md: 'h-[45px] pt-[22px] pb-[5px] text-[18px]',
        lg: 'h-[55px] pt-[28px] pb-[5px] text-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

/**
 * Textarea component classes.
 */
export const textarea = cva(
  'flex min-h-[150px] w-full border border-transparent border-b-border-secondary bg-transparent rounded-[1px] px-[3px] py-[5px] text-[17px] leading-[1.25] font-inherit text-foreground transition-all duration-250 ease-in-out placeholder:opacity-0 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'hover:border-b-foreground-secondary/75 hover:bg-background-tertiary hover:shadow-[0_0_1.5px_1.5px_rgba(0,0,0,0.025)] focus-visible:border-b-primary focus-visible:bg-background-tertiary focus-visible:shadow-[0_0_1.5px_1.5px_rgba(0,0,0,0.025)]',
        error: 'border-b-error focus-visible:border-b-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * Select component classes.
 */
export const select = cva(
  'flex w-full border border-transparent border-b-border-secondary bg-transparent rounded-[1px] px-[3px] py-2 text-foreground transition-all duration-250 ease-in-out focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'hover:border-b-foreground-secondary/75 hover:bg-background-tertiary hover:shadow-[0_0_1.5px_1.5px_rgba(0,0,0,0.025)] focus-visible:border-b-primary focus-visible:bg-background-tertiary focus-visible:shadow-[0_0_1.5px_1.5px_rgba(0,0,0,0.025)]',
        error: 'border-b-error focus-visible:border-b-error',
      },
      size: {
        sm: 'h-[35px] text-[15px]',
        md: 'h-[45px] text-[18px]',
        lg: 'h-[55px] text-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

/**
 * Checkbox component classes.
 */
export const checkbox = cva(
  'peer h-4 w-4 shrink-0 rounded border shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-white focus-visible:ring-primary',
        error:
          'border-error data-[state=checked]:bg-error data-[state=checked]:border-error focus-visible:ring-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * Radio component classes.
 */
export const radio = cva(
  'aspect-square h-4 w-4 rounded-full border shadow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-border data-[state=checked]:border-primary focus-visible:ring-primary',
        error: 'border-error focus-visible:ring-error',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * Switch component classes.
 */
export const switchBase = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-secondary focus-visible:ring-primary',
      },
      size: {
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
        lg: 'h-7 w-14',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

/** Switch thumb (the sliding circle) classes. */
export const switchThumb = cva(
  'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
        md: 'h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        lg: 'h-6 w-6 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

/**
 * Label component classes.
 */
export const label = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      required: {
        true: "after:content-['*'] after:ml-0.5 after:text-error",
        false: '',
      },
    },
    defaultVariants: {
      required: 'false',
    },
  },
)

/**
 * Form error message classes.
 */
export const formError = 'text-sm text-error mt-1'

/**
 * Form hint message classes.
 */
export const formHint = 'text-sm text-foreground-secondary mt-1'

/**
 * Card component classes.
 */
export const card = cva('rounded-lg border bg-surface text-foreground', {
  variants: {
    variant: {
      default: 'border-border shadow-sm',
      elevated: 'border-transparent shadow-lg',
      outline: 'border-border shadow-none',
      ghost: 'border-transparent shadow-none bg-transparent',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

/**
 * The card header.
 */
export const cardHeader = 'flex flex-col space-y-1.5 p-6'
/**
 * The card title.
 */
export const cardTitle = 'text-lg font-semibold leading-none tracking-tight'
/**
 * The card description.
 */
export const cardDescription = 'text-sm text-foreground-secondary'
/**
 * The card content.
 */
export const cardContent = 'p-6 pt-0'
/**
 * The card footer.
 */
export const cardFooter = 'flex items-center p-6 pt-0'

/** Badge component classes with variant support. */
export const badge = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-white',
        secondary: 'border-transparent bg-secondary text-white',
        outline: 'text-foreground border-border',
        success: 'border-transparent bg-success text-white',
        warning: 'border-transparent bg-warning text-white',
        error: 'border-transparent bg-error text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/** Alert component classes with variant support (default, info, success, warning, error). */
export const alert = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground border-border',
        info: 'bg-info-light text-info border-info/20',
        success: 'bg-success-light text-success border-success/20',
        warning: 'bg-warning-light text-warning border-warning/20',
        error: 'bg-error-light text-error border-error/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * The alert title.
 */
export const alertTitle = 'mb-1 font-medium leading-none tracking-tight'
/**
 * The alert description.
 */
export const alertDescription = 'text-sm [&_p]:leading-relaxed'

/**
 * Avatar component classes.
 */
export const avatar = cva('relative flex shrink-0 overflow-hidden rounded-full', {
  variants: {
    size: {
      sm: 'h-8 w-8',
      md: 'h-10 w-10',
      lg: 'h-12 w-12',
      xl: 'h-16 w-16',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

/**
 * The avatar image.
 */
export const avatarImage = 'aspect-square h-full w-full object-cover'
/** Avatar fallback container classes (centered, rounded, secondary background). */
export const avatarFallback =
  'flex h-full w-full items-center justify-center rounded-full bg-surface-secondary text-foreground-secondary'

/** Modal/Dialog overlay classes. */
export const dialogOverlay =
  'fixed inset-0 z-modal bg-overlay backdrop-blur-[2px] pointer-events-none'

/**
 * The dialog content.
 */
export const dialogContent = cva(
  'relative w-full flex flex-col bg-surface shadow-[0_0_3px_3px_rgba(0,0,0,0.05)] overflow-hidden rounded-[3px] max-h-full backface-hidden',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-[calc(100%-2rem)]',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

/**
 * The dialog header.
 */
export const dialogHeader = 'flex-shrink-0 flex items-center justify-between px-6 py-2'
/** Dialog footer classes. */
export const dialogFooter =
  'flex-shrink-0 flex flex-col-reverse px-6 py-4 border-t border-border sm:flex-row sm:justify-end sm:space-x-2'
/**
 * The dialog title.
 */
export const dialogTitle = 'text-xl font-semibold leading-tight tracking-tight'
/**
 * The dialog description.
 */
export const dialogDescription = 'text-sm text-foreground-secondary'
/** Dialog close button classes. */
export const dialogClose =
  'flex-shrink-0 ml-4 -mr-6 p-1.5 cursor-pointer text-foreground-secondary hover:text-foreground transition-colors focus:outline-none'
/**
 * The dialog wrapper.
 */
export const dialogWrapper = 'fixed inset-0 z-modal flex items-center justify-center px-4 py-10'
/**
 * The dialog body.
 */
export const dialogBody = 'flex-1 min-h-0 overflow-y-auto pl-6 py-6 *:pr-6'

/** Action sheet: bottom-anchored panel for pickers and action menus. */
export const actionSheet =
  'fixed bottom-0 left-0 right-0 z-modal bg-surface rounded-t-2xl max-h-[50vh] overflow-hidden'
/** Action sheet header with bottom border. */
export const actionSheetHeader = 'flex-shrink-0 px-4 py-3 border-b border-border'

/** Dropdown menu content container classes. */
export const dropdownContent =
  'z-dropdown min-w-[8rem] overflow-hidden rounded-md border bg-surface p-1 text-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'

/** Dropdown menu item classes. */
export const dropdownItem =
  'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-surface-secondary focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'

/**
 * The dropdown separator.
 */
export const dropdownSeparator = '-mx-1 my-1 h-px bg-border'
/**
 * The dropdown label.
 */
export const dropdownLabel = 'px-2 py-1.5 text-sm font-semibold'

/** Table root classes. */
export const table = 'w-full caption-bottom text-sm'
/**
 * The table header.
 */
export const tableHeader = '[&_tr]:border-b'
/**
 * The table body.
 */
export const tableBody = '[&_tr:last-child]:border-0'
/**
 * The table footer.
 */
export const tableFooter = 'border-t bg-surface-secondary font-medium [&>tr]:last:border-b-0'
/** Table row classes. */
export const tableRow =
  'border-b transition-colors hover:bg-surface-secondary data-[state=selected]:bg-surface-secondary'
/** Table header cell classes. */
export const tableHead =
  'h-12 px-4 text-left align-middle font-medium text-foreground-secondary [&:has([role=checkbox])]:pr-0'
/**
 * The table cell.
 */
export const tableCell = 'p-4 align-middle [&:has([role=checkbox])]:pr-0'
/**
 * The table caption.
 */
export const tableCaption = 'mt-4 text-sm text-foreground-secondary'

/** Tabs list container classes. */
export const tabsList =
  'inline-flex h-10 items-center justify-center rounded-md bg-surface-secondary p-1 text-foreground-secondary'
/** Tabs trigger button classes. */
export const tabsTrigger =
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
/** Tabs content panel classes. */
export const tabsContent =
  'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

/** Tooltip content container classes. */
export const tooltipContent =
  'z-tooltip overflow-hidden rounded-md border bg-surface px-3 py-1.5 text-sm text-foreground shadow-md animate-in fade-in-0 zoom-in-95'

/**
 * Progress component classes.
 */
export const progress = 'relative h-2 w-full overflow-hidden rounded-full bg-surface-secondary'
/**
 * The progress indicator.
 */
export const progressIndicator = 'h-full w-full flex-1 bg-primary transition-all'

/**
 * Skeleton component classes.
 */
export const skeleton = 'animate-pulse rounded-md bg-surface-secondary'

/** Separator component classes with horizontal/vertical orientation. */
export const separator = cva('shrink-0 bg-border', {
  variants: {
    orientation: {
      horizontal: 'h-[1px] w-full',
      vertical: 'h-full w-[1px]',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
})

/** Spinner component classes with size variants. */
export const spinner = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  },
)

/** Toast viewport container classes (positioned fixed, stacked). */
export const toastViewport =
  'fixed top-0 z-toast flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]'

/**
 * Tailwind toast notification variant classes (default, success, error, warning).
 */
export const toast = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-surface text-foreground',
        success: 'border-success/50 bg-success-light text-success',
        warning: 'border-warning/50 bg-warning-light text-warning',
        error: 'border-error/50 bg-error-light text-error',
        info: 'border-info/50 bg-info-light text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/**
 * The toast title.
 */
export const toastTitle = 'text-sm font-semibold'
/**
 * The toast description.
 */
export const toastDescription = 'text-sm opacity-90'
/** Toast close button classes. */
export const toastClose =
  'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100'
/** Toast action button classes. */
export const toastAction =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 disabled:pointer-events-none disabled:opacity-50'

/**
 * Accordion component classes.
 */
export const accordion = 'w-full'
/**
 * The accordion item.
 */
export const accordionItem = 'border-b'

/**
 * The accordion trigger.
 */
export const accordionTrigger = cva(
  'flex flex-1 items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180',
  {
    variants: {
      variant: {
        default: '',
        bordered: 'px-4 first:rounded-t-lg last:rounded-b-lg border-x border-t last:border-b',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

/** Accordion content wrapper classes with collapse animation. */
export const accordionContent =
  'overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'
/**
 * The accordion content inner.
 */
export const accordionContentInner = 'pb-4 pt-0'

/**
 * Pagination component classes.
 */
export const pagination = 'mx-auto flex w-full justify-center'
/**
 * The pagination content.
 */
export const paginationContent = 'flex flex-row items-center gap-1'

/**
 * The pagination item.
 */
export const paginationItem = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'hover:bg-surface-secondary',
        active: 'border border-border bg-surface-secondary',
      },
      size: {
        sm: 'h-8 w-8',
        md: 'h-9 w-9',
        lg: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

/**
 * The pagination link.
 */
export const paginationLink = 'cursor-pointer'
/**
 * The pagination previous.
 */
export const paginationPrevious = 'gap-1 pl-2.5'
/**
 * The pagination next.
 */
export const paginationNext = 'gap-1 pr-2.5'
/**
 * The pagination ellipsis.
 */
export const paginationEllipsis = 'flex h-9 w-9 items-center justify-center'

/** Footer bar classes (fixed bottom, full-width). */
export const footerBar =
  'fixed bottom-0 left-0 right-0 w-full flex flex-wrap items-center justify-around p-[5px] bg-background text-[12px] text-foreground-secondary z-[1001]'
/** Footer link classes. */
export const footerLink =
  'p-[5px] text-[12px] text-foreground-secondary hover:text-foreground no-underline'
/** Footer button classes. */
export const footerButton =
  'inline-flex items-center gap-1 border-0 m-0 p-[5px] text-[12px] text-foreground-secondary hover:text-foreground bg-transparent cursor-pointer'

/** Language selector grid container classes. */
export const languageGrid =
  'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto p-2'
/** Language option (inactive) classes. */
export const languageOption =
  'px-3 py-2 rounded-md text-sm cursor-pointer text-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700'
/** Language option (active/selected) classes. */
export const languageActive =
  'px-3 py-2 rounded-md text-sm cursor-pointer text-center transition-colors bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-medium'

/** Theme toggle button classes. */
export const themeToggleButton =
  'w-[30px] h-[30px] p-0 border-0 bg-transparent text-foreground-secondary hover:text-foreground cursor-pointer flex items-center justify-center'

/** OAuth divider classes (horizontal line with text). */
export const oauthDivider =
  'relative mt-[45px] mb-[15px] text-[15px] text-center uppercase text-foreground-secondary'
/** OAuth divider horizontal line classes. */
export const oauthDividerLine =
  'absolute top-1/2 left-0 right-0 w-full h-[1px] border-t border-[rgba(170,170,170,0.33)]'
/**
 * The oauth divider text.
 */
export const oauthDividerText = 'relative px-[15px] bg-background'
/** OAuth provider button group container classes. */
export const oauthButtonGroup =
  'flex flex-wrap gap-[15px] w-full max-w-[330px] mx-auto justify-center items-center'
/** OAuth provider button classes. */
export const oauthButton =
  'group grow basis-[40px] flex flex-col justify-center items-center min-h-[60px] bg-surface border-0 rounded-[3px] cursor-pointer p-0 transition-all duration-250 hover:bg-surface-hover'
/** OAuth provider button icon classes. */
export const oauthButtonIcon =
  'opacity-75 group-hover:opacity-100 text-foreground transition-opacity'

/** Auth form error message classes. */
export const authFormError = 'text-error mt-[15px]'
/** Forgot password link classes. */
export const forgotPasswordLink =
  'border-0 p-0 m-0 bg-transparent text-foreground-secondary text-[12px] cursor-pointer hover:text-primary'

// ============================================================================
// SUB-COMPONENT TOKENS
// ============================================================================

/** Icon extra-small size classes (12×12). */
export const iconXs = 'h-3 w-3'
/**
 * Tailwind classes for small icons (16x16).
 */
export const iconSm = 'h-4 w-4'
/**
 * Tailwind classes for medium icons (20x20).
 */
export const iconMd = 'h-5 w-5'

/** Button left icon spacing classes. */
export const buttonIconLeft = 'mr-2'
/**
 * The button icon right.
 */
export const buttonIconRight = 'ml-2'
/**
 * The button spinner.
 */
export const buttonSpinner = 'mr-2'

/** Interactive card classes (hover shadow effect). */
export const cardInteractive = 'cursor-pointer hover:shadow-md transition-shadow'

/** Alert icon wrapper classes. */
export const alertIconWrapper = 'flex-shrink-0'
/**
 * The alert content.
 */
export const alertContent = 'flex-1'
/**
 * The alert dismiss.
 */
export const alertDismiss = 'flex-shrink-0 ml-2 p-1 rounded hover:bg-black/5 transition-colors'

/** Floating input wrapper classes (relative container). */
export const floatingInputWrapper = 'relative inline-block align-middle w-full'
/**
 * The floating input.
 */
export const floatingInput = 'peer'
/** Floating label classes (absolute positioned, animated on focus). */
export const floatingLabel =
  'absolute top-0 left-0 right-0 w-full p-[3px] text-[11px] leading-none whitespace-nowrap text-foreground uppercase pointer-events-none transition-all duration-250 peer-hover:bg-input-background peer-focus:text-primary peer-focus:[text-shadow:0_0_var(--color-primary)] peer-focus:bg-input-background'

/** Input wrapper classes. */
export const inputWrapper = 'w-full'
/**
 * The input inner.
 */
export const inputInner = 'relative'
/** Input left addon/icon container classes. */
export const inputLeftElement =
  'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-foreground-secondary'
/**
 * The input right element.
 */
export const inputRightElement = 'absolute inset-y-0 right-0 flex items-center pr-3'
/**
 * The input clear button.
 */
export const inputClearButton = 'text-foreground-secondary hover:text-foreground'
/**
 * The input pad left.
 */
export const inputPadLeft = 'pl-10'
/**
 * The input pad right.
 */
export const inputPadRight = 'pr-10'

/** Native select appearance reset classes. */
export const selectNative = 'appearance-none'

/** Block-level label classes. */
export const labelBlock = 'mb-1.5 block'
/**
 * The form fieldset.
 */
export const formFieldset = 'space-y-4'
/**
 * The form fieldset contents.
 */
export const formFieldsetContents = 'contents'
/**
 * The form field.
 */
export const formField = 'space-y-1.5'
/**
 * The form field wrapper.
 */
export const formFieldWrapper = 'flex flex-col'

/** Control (checkbox/switch/radio) label wrapper classes. */
export const controlLabel = 'flex items-center gap-2 cursor-pointer'
/**
 * The control container.
 */
export const controlContainer = 'flex items-center'
/**
 * The control text.
 */
export const controlText = 'text-sm'
/**
 * The control disabled.
 */
export const controlDisabled = 'opacity-50 cursor-not-allowed'

/** Radio group label classes. */
export const radioGroupLabel = 'text-sm font-medium mb-2 block'

/** Accordion chevron icon classes (rotates on open). */
export const accordionChevron = 'h-4 w-4 shrink-0 transition-transform duration-200'
/**
 * The accordion trigger base.
 */
export const accordionTriggerBase = 'w-full text-left'

/** Fitted (full-width) tabs container classes. */
export const tabsFitted = 'w-full'
/**
 * The tab trigger fitted.
 */
export const tabTriggerFitted = 'flex-1'
/**
 * The tab trigger icon.
 */
export const tabTriggerIcon = 'mr-2'

/** Pagination interactive item (cursor pointer). */
export const paginationInteractive = 'cursor-pointer'

/** Progress bar wrapper classes. */
export const progressWrapper = 'w-full'
/**
 * The progress label container.
 */
export const progressLabelContainer = 'flex justify-between mb-1 text-sm'
/**
 * The progress label text.
 */
export const progressLabelText = 'text-foreground-secondary'
/**
 * The progress indeterminate.
 */
export const progressIndeterminate = 'animate-indeterminate-progress'

/** Table wrapper classes (scrollable container). */
export const tableWrapper = 'relative w-full overflow-auto'
/** Table loading overlay classes (semi-transparent centered spinner container). */
export const tableLoadingOverlay =
  'absolute inset-0 bg-background/50 flex items-center justify-center z-10'
/**
 * The table empty cell.
 */
export const tableEmptyCell = 'py-10 text-center text-foreground-secondary'
/**
 * The table sort wrapper.
 */
export const tableSortWrapper = 'flex items-center gap-1'
/**
 * The table sort icon.
 */
export const tableSortIcon = 'ml-1'
/**
 * The table row striped.
 */
export const tableRowStriped = 'bg-surface-secondary/50'
/**
 * The table row hoverable.
 */
export const tableRowHoverable = 'hover:bg-surface-secondary'
/**
 * The table row clickable.
 */
export const tableRowClickable = 'cursor-pointer'
/**
 * The table head sortable.
 */
export const tableHeadSortable = 'cursor-pointer select-none hover:bg-surface-secondary'
/**
 * The table bordered.
 */
export const tableBordered = 'border'

/** Toast icon wrapper classes. */
export const toastIconWrapper = 'flex-shrink-0'
/**
 * The toast content wrapper.
 */
export const toastContentWrapper = 'flex-1 gap-1'

/** Dropdown trigger wrapper classes. */
export const dropdownTrigger = 'inline-block'
/**
 * The dropdown item icon.
 */
export const dropdownItemIcon = 'mr-2 flex-shrink-0'
/**
 * The dropdown item label.
 */
export const dropdownItemLabel = 'flex-1'
/**
 * The dropdown item shortcut.
 */
export const dropdownItemShortcut = 'ml-auto text-xs text-foreground-tertiary'
/**
 * The dropdown item disabled.
 */
export const dropdownItemDisabled = 'opacity-50 cursor-not-allowed'

/** Tooltip trigger wrapper classes. */
export const tooltipTrigger = 'inline-block'

/** Avatar initials text classes. */
export const avatarInitials = 'text-sm font-medium'
/**
 * The avatar fallback icon.
 */
export const avatarFallbackIcon = 'h-1/2 w-1/2'
/**
 * The avatar square.
 */
export const avatarSquare = 'rounded-md'

/** Badge with square (rounded-md) corners. */
export const badgeSquare = 'rounded-md'

/** Skeleton text placeholder container (vertical spacing). */
export const skeletonTextContainer = 'space-y-2'
/**
 * The skeleton circle.
 */
export const skeletonCircle = 'rounded-full'
/** Skeleton wave animation classes (shimmer gradient effect). */
export const skeletonWave =
  'animate-shimmer bg-gradient-to-r from-surface-secondary via-surface to-surface-secondary bg-[length:200%_100%]'
/**
 * The skeleton none.
 */
export const skeletonNone = 'animate-none'

/** Display block utility class. */
export const displayBlock = 'block'
/**
 * The display inline block.
 */
export const displayInlineBlock = 'inline-block'
/**
 * The display contents.
 */
export const displayContents = 'contents'

/** Horizontal auto-margin centering utility class. */
export const mxAuto = 'mx-auto'
/**
 * The cursor pointer.
 */
export const cursorPointer = 'cursor-pointer'
/**
 * The rounded full.
 */
export const roundedFull = 'rounded-full'

/** Text right-alignment utility class. */
export const textRight = 'text-right'

/** Logo text classes (lowercase, tracked, 26px). */
export const logoText = 'text-[26px] leading-[26px] tracking-[-1px] lowercase'
/**
 * Tailwind class for the logo icon color.
 */
export const logoIcon = 'text-primary'

/** Fixed header container classes (top, full-width, z-1001). */
export const headerFixed = 'fixed top-0 left-0 right-0 z-[1001]'
/**
 * The header inner.
 */
export const headerInner = 'w-full max-w-[1280px] mx-auto h-10 p-[5px]'

/** Auth page header inner container classes. */
export const authHeaderInner = 'w-full h-10 p-[5px]'
/**
 * The auth page body.
 */
export const authPageBody = 'flex flex-col flex-1 items-center justify-center px-4 pb-[30px]'
/**
 * The auth form wrapper.
 */
export const authFormWrapper = 'w-max min-w-[330px] max-w-[90vw] py-[30px] mx-auto text-center'
/**
 * The auth field.
 */
export const authField = 'mb-[15px]'
/**
 * The auth after submit.
 */
export const authAfterSubmit = 'mt-[15px]'

/** Auth button row (flex container). */
export const authButtonRow = 'flex'
/**
 * The auth back button.
 */
export const authBackButton = 'w-[45px] mr-[10px]'
/**
 * The auth submit button.
 */
export const authSubmitButton = 'grow whitespace-nowrap'
/**
 * The auth login signup.
 */
export const authLoginSignup = 'grow whitespace-nowrap mr-[10px]'
/**
 * The auth login submit.
 */
export const authLoginSubmit = 'grow whitespace-nowrap'
/**
 * The auth login submit full.
 */
export const authLoginSubmitFull = 'w-full whitespace-nowrap'
/**
 * The auth hidden.
 */
export const authHidden = 'hidden'
/**
 * The auth arrow icon.
 */
export const authArrowIcon = 'ml-[2.5px]'

/** Main app layout classes (min-height, padding for fixed header/footer). */
export const appLayout = 'min-h-screen pt-[55px] px-[15px] pb-[55px]'

/** Flex grow utility class (flex-1). */
export const flex1 = 'flex-1'

/** OAuth provider label (fallback when no icon). */
export const oauthProviderLabel = 'text-sm font-medium'

// ============================================================================
// GENERAL-PURPOSE TOKENS
// ============================================================================

/** Secondary surface background utility class. */
export const surfaceSecondary = 'bg-surface-secondary'

/** Primary text color utility class. */
export const textPrimary = 'text-primary'
/**
 * The text success.
 */
export const textSuccess = 'text-success'
/**
 * The text warning.
 */
export const textWarning = 'text-warning'

/** Bottom border with theme border color. */
export const borderB = 'border-b border-border'
/**
 * Tailwind classes for a top border with the theme border color.
 */
export const borderT = 'border-t border-border'
/**
 * Tailwind classes for a right border with the theme border color.
 */
export const borderR = 'border-r border-border'
/**
 * The border all.
 */
export const borderAll = 'border border-border'
/**
 * The border b primary.
 */
export const borderBPrimary = 'border-b-2 border-b-primary'

/** Subtle error background utility class. */
export const bgErrorSubtle = 'bg-error-light'
/**
 * Tailwind class for a background matching the theme border color.
 */
export const bgBorder = 'bg-border'
