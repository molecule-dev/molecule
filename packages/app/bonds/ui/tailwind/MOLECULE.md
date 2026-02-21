# @molecule/app-ui-tailwind

Tailwind CSS UI components for molecule.dev.

Provides pre-built, accessible UI components using Tailwind CSS classes.
These are framework-agnostic class strings that can be used with any
rendering library (React, Vue, Svelte, etc.).

## Type
`provider`

## Installation
```bash
npm install @molecule/app-ui-tailwind
```

## API

### Interfaces

#### `CVAConfig`

Configuration for class variance authority ({@link cva}).

```typescript
interface CVAConfig<T extends Record<string, Record<string, string>>> {
    variants?: T;
    defaultVariants?: {
        [K in keyof T]?: keyof T[K];
    };
    compoundVariants?: Array<{
        [K in keyof T]?: keyof T[K];
    } & {
        class: string;
    }>;
}
```

### Types

#### `ClassValue`

Class name value types accepted by {@link cn}.

```typescript
type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, boolean | undefined | null>;
```

### Constants

#### `accordion`

Accordion component classes.

```typescript
const accordion: "w-full"
```

#### `accordionChevron`

Accordion chevron icon classes (rotates on open).

```typescript
const accordionChevron: "h-4 w-4 shrink-0 transition-transform duration-200"
```

#### `accordionContent`

Accordion content wrapper classes with collapse animation.

```typescript
const accordionContent: "overflow-hidden text-sm transition-all data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
```

#### `accordionContentInner`

The accordion content inner.

```typescript
const accordionContentInner: "pb-4 pt-0"
```

#### `accordionItem`

The accordion item.

```typescript
const accordionItem: "border-b"
```

#### `accordionTrigger`

The accordion trigger.

```typescript
const accordionTrigger: (props?: ({ variant?: "default" | "bordered" | undefined; } & { class?: string; }) | undefined) => string
```

#### `accordionTriggerBase`

The accordion trigger base.

```typescript
const accordionTriggerBase: "w-full text-left"
```

#### `actionSheet`

Action sheet: bottom-anchored panel for pickers and action menus.

```typescript
const actionSheet: "fixed bottom-0 left-0 right-0 z-modal bg-surface rounded-t-2xl max-h-[50vh] overflow-hidden"
```

#### `actionSheetHeader`

Action sheet header with bottom border.

```typescript
const actionSheetHeader: "flex-shrink-0 px-4 py-3 border-b border-border"
```

#### `alert`

Alert component classes with variant support (default, info, success, warning, error).

```typescript
const alert: (props?: ({ variant?: "default" | "success" | "error" | "warning" | "info" | undefined; } & { class?: string; }) | undefined) => string
```

#### `alertContent`

The alert content.

```typescript
const alertContent: "flex-1"
```

#### `alertDescription`

The alert description.

```typescript
const alertDescription: "text-sm [&_p]:leading-relaxed"
```

#### `alertDismiss`

The alert dismiss.

```typescript
const alertDismiss: "flex-shrink-0 ml-2 p-1 rounded hover:bg-black/5 transition-colors"
```

#### `alertIconWrapper`

Alert icon wrapper classes.

```typescript
const alertIconWrapper: "flex-shrink-0"
```

#### `alertTitle`

The alert title.

```typescript
const alertTitle: "mb-1 font-medium leading-none tracking-tight"
```

#### `appLayout`

Main app layout classes (min-height, padding for fixed header/footer).

```typescript
const appLayout: "min-h-screen pt-[55px] px-[15px] pb-[55px]"
```

#### `authAfterSubmit`

The auth after submit.

```typescript
const authAfterSubmit: "mt-[15px]"
```

#### `authArrowIcon`

The auth arrow icon.

```typescript
const authArrowIcon: "ml-[2.5px]"
```

#### `authBackButton`

The auth back button.

```typescript
const authBackButton: "w-[45px] mr-[10px]"
```

#### `authButtonRow`

Auth button row (flex container).

```typescript
const authButtonRow: "flex"
```

#### `authField`

The auth field.

```typescript
const authField: "mb-[15px]"
```

#### `authFormError`

Auth form error message classes.

```typescript
const authFormError: "text-error mt-[15px]"
```

#### `authFormWrapper`

The auth form wrapper.

```typescript
const authFormWrapper: "w-max min-w-[330px] max-w-[90vw] py-[30px] mx-auto text-center"
```

#### `authHeaderInner`

Auth page header inner container classes.

```typescript
const authHeaderInner: "w-full h-10 p-[5px]"
```

#### `authHidden`

The auth hidden.

```typescript
const authHidden: "hidden"
```

#### `authLoginSignup`

The auth login signup.

```typescript
const authLoginSignup: "grow whitespace-nowrap mr-[10px]"
```

#### `authLoginSubmit`

The auth login submit.

```typescript
const authLoginSubmit: "grow whitespace-nowrap"
```

#### `authLoginSubmitFull`

The auth login submit full.

```typescript
const authLoginSubmitFull: "w-full whitespace-nowrap"
```

#### `authPageBody`

The auth page body.

```typescript
const authPageBody: "flex flex-col flex-1 items-center justify-center px-4 pb-[30px]"
```

#### `authSubmitButton`

The auth submit button.

```typescript
const authSubmitButton: "grow whitespace-nowrap"
```

#### `avatar`

Avatar component classes.

```typescript
const avatar: (props?: ({ size?: "sm" | "md" | "lg" | "xl" | undefined; } & { class?: string; }) | undefined) => string
```

#### `avatarFallback`

Avatar fallback container classes (centered, rounded, secondary background).

```typescript
const avatarFallback: "flex h-full w-full items-center justify-center rounded-full bg-surface-secondary text-foreground-secondary"
```

#### `avatarFallbackIcon`

The avatar fallback icon.

```typescript
const avatarFallbackIcon: "h-1/2 w-1/2"
```

#### `avatarImage`

The avatar image.

```typescript
const avatarImage: "aspect-square h-full w-full object-cover"
```

#### `avatarInitials`

Avatar initials text classes.

```typescript
const avatarInitials: "text-sm font-medium"
```

#### `avatarSquare`

The avatar square.

```typescript
const avatarSquare: "rounded-md"
```

#### `badge`

Badge component classes with variant support.

```typescript
const badge: (props?: ({ variant?: "default" | "secondary" | "success" | "outline" | "error" | "warning" | undefined; } & { class?: string; }) | undefined) => string
```

#### `badgeSquare`

Badge with square (rounded-md) corners.

```typescript
const badgeSquare: "rounded-md"
```

#### `bgBorder`

Tailwind class for a background matching the theme border color.

```typescript
const bgBorder: "bg-border"
```

#### `bgErrorSubtle`

Subtle error background utility class.

```typescript
const bgErrorSubtle: "bg-error-light"
```

#### `borderAll`

The border all.

```typescript
const borderAll: "border border-border"
```

#### `borderB`

Bottom border with theme border color.

```typescript
const borderB: "border-b border-border"
```

#### `borderBPrimary`

The border b primary.

```typescript
const borderBPrimary: "border-b-2 border-b-primary"
```

#### `borderR`

Tailwind classes for a right border with the theme border color.

```typescript
const borderR: "border-r border-border"
```

#### `borderT`

Tailwind classes for a top border with the theme border color.

```typescript
const borderT: "border-t border-border"
```

#### `button`

Button component classes.

```typescript
const button: (props?: ({ variant?: "default" | "secondary" | "success" | "outline" | "ghost" | "link" | "danger" | undefined; size?: "sm" | "md" | "lg" | "icon" | undefined; } & { class?: string; }) | undefined) => string
```

#### `buttonIconLeft`

Button left icon spacing classes.

```typescript
const buttonIconLeft: "mr-2"
```

#### `buttonIconRight`

The button icon right.

```typescript
const buttonIconRight: "ml-2"
```

#### `buttonSpinner`

The button spinner.

```typescript
const buttonSpinner: "mr-2"
```

#### `card`

Card component classes.

```typescript
const card: (props?: ({ variant?: "default" | "outline" | "ghost" | "elevated" | undefined; } & { class?: string; }) | undefined) => string
```

#### `cardContent`

The card content.

```typescript
const cardContent: "p-6 pt-0"
```

#### `cardDescription`

The card description.

```typescript
const cardDescription: "text-sm text-foreground-secondary"
```

#### `cardFooter`

The card footer.

```typescript
const cardFooter: "flex items-center p-6 pt-0"
```

#### `cardHeader`

The card header.

```typescript
const cardHeader: "flex flex-col space-y-1.5 p-6"
```

#### `cardInteractive`

Interactive card classes (hover shadow effect).

```typescript
const cardInteractive: "cursor-pointer hover:shadow-md transition-shadow"
```

#### `cardTitle`

The card title.

```typescript
const cardTitle: "text-lg font-semibold leading-none tracking-tight"
```

#### `center`

Center layout classes.

```typescript
const center: "flex items-center justify-center"
```

#### `checkbox`

Checkbox component classes.

```typescript
const checkbox: (props?: ({ variant?: "default" | "error" | undefined; } & { class?: string; }) | undefined) => string
```

#### `classMap`

Tailwind CSS UIClassMap implementation.

Wire at app startup:
```typescript
import { setClassMap } from '`@molecule/app-ui`'
import { classMap } from '`@molecule/app-ui-tailwind`'
setClassMap(classMap)
```

```typescript
const classMap: UIClassMap
```

#### `cn`

Merges class names, filtering out falsy values. Supports strings,
numbers, conditional objects, and nested arrays.

```typescript
const cn: (...classes: ClassValue[]) => string
```

#### `container`

Container component classes.

```typescript
const container: (props?: ({ size?: "sm" | "md" | "lg" | "xl" | "full" | "2xl" | undefined; } & { class?: string; }) | undefined) => string
```

#### `controlContainer`

The control container.

```typescript
const controlContainer: "flex items-center"
```

#### `controlDisabled`

The control disabled.

```typescript
const controlDisabled: "opacity-50 cursor-not-allowed"
```

#### `controlLabel`

Control (checkbox/switch/radio) label wrapper classes.

```typescript
const controlLabel: "flex items-center gap-2 cursor-pointer"
```

#### `controlText`

The control text.

```typescript
const controlText: "text-sm"
```

#### `cursorPointer`

The cursor pointer.

```typescript
const cursorPointer: "cursor-pointer"
```

#### `cva`

Creates a class variance authority (CVA) function for component variants.
Given a base class and variant configuration, returns a function that
resolves the final class string based on selected variants.

```typescript
const cva: <T extends Record<string, Record<string, string>>>(base: string, config?: CVAConfig<T>) => (props?: { [K in keyof T]?: keyof T[K]; } & { class?: string; }) => string
```

#### `dialogBody`

The dialog body.

```typescript
const dialogBody: "flex-1 min-h-0 overflow-y-auto pl-6 py-6 *:pr-6"
```

#### `dialogClose`

Dialog close button classes.

```typescript
const dialogClose: "flex-shrink-0 ml-4 -mr-6 p-1.5 cursor-pointer text-foreground-secondary hover:text-foreground transition-colors focus:outline-none"
```

#### `dialogContent`

The dialog content.

```typescript
const dialogContent: (props?: ({ size?: "sm" | "md" | "lg" | "xl" | "full" | undefined; } & { class?: string; }) | undefined) => string
```

#### `dialogDescription`

The dialog description.

```typescript
const dialogDescription: "text-sm text-foreground-secondary"
```

#### `dialogFooter`

Dialog footer classes.

```typescript
const dialogFooter: "flex-shrink-0 flex flex-col-reverse px-6 py-4 border-t border-border sm:flex-row sm:justify-end sm:space-x-2"
```

#### `dialogHeader`

The dialog header.

```typescript
const dialogHeader: "flex-shrink-0 flex items-center justify-between px-6 py-2"
```

#### `dialogOverlay`

Modal/Dialog overlay classes.

```typescript
const dialogOverlay: "fixed inset-0 z-modal bg-overlay backdrop-blur-[2px] pointer-events-none"
```

#### `dialogTitle`

The dialog title.

```typescript
const dialogTitle: "text-xl font-semibold leading-tight tracking-tight"
```

#### `dialogWrapper`

The dialog wrapper.

```typescript
const dialogWrapper: "fixed inset-0 z-modal flex items-center justify-center px-4 py-10"
```

#### `displayBlock`

Display block utility class.

```typescript
const displayBlock: "block"
```

#### `displayContents`

The display contents.

```typescript
const displayContents: "contents"
```

#### `displayInlineBlock`

The display inline block.

```typescript
const displayInlineBlock: "inline-block"
```

#### `dropdownContent`

Dropdown menu content container classes.

```typescript
const dropdownContent: "z-dropdown min-w-[8rem] overflow-hidden rounded-md border bg-surface p-1 text-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
```

#### `dropdownItem`

Dropdown menu item classes.

```typescript
const dropdownItem: "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-surface-secondary focus:text-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
```

#### `dropdownItemDisabled`

The dropdown item disabled.

```typescript
const dropdownItemDisabled: "opacity-50 cursor-not-allowed"
```

#### `dropdownItemIcon`

The dropdown item icon.

```typescript
const dropdownItemIcon: "mr-2 flex-shrink-0"
```

#### `dropdownItemLabel`

The dropdown item label.

```typescript
const dropdownItemLabel: "flex-1"
```

#### `dropdownItemShortcut`

The dropdown item shortcut.

```typescript
const dropdownItemShortcut: "ml-auto text-xs text-foreground-tertiary"
```

#### `dropdownLabel`

The dropdown label.

```typescript
const dropdownLabel: "px-2 py-1.5 text-sm font-semibold"
```

#### `dropdownSeparator`

The dropdown separator.

```typescript
const dropdownSeparator: "-mx-1 my-1 h-px bg-border"
```

#### `dropdownTrigger`

Dropdown trigger wrapper classes.

```typescript
const dropdownTrigger: "inline-block"
```

#### `flex`

Flex layout classes.

```typescript
const flex: (props?: ({ direction?: "row" | "row-reverse" | "col" | "col-reverse" | undefined; align?: "start" | "center" | "end" | "stretch" | "baseline" | undefined; justify?: "start" | "center" | "end" | "between" | "around" | "evenly" | undefined; wrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined; gap?: "sm" | "md" | "lg" | "xl" | "none" | "xs" | undefined; } & { class?: string; }) | undefined) => string
```

#### `flex1`

Flex grow utility class (flex-1).

```typescript
const flex1: "flex-1"
```

#### `floatingInput`

The floating input.

```typescript
const floatingInput: "peer"
```

#### `floatingInputWrapper`

Floating input wrapper classes (relative container).

```typescript
const floatingInputWrapper: "relative inline-block align-middle w-full"
```

#### `floatingLabel`

Floating label classes (absolute positioned, animated on focus).

```typescript
const floatingLabel: "absolute top-0 left-0 right-0 w-full p-[3px] text-[11px] leading-none whitespace-nowrap text-foreground uppercase pointer-events-none transition-all duration-250 peer-hover:bg-input-background peer-focus:text-primary peer-focus:[text-shadow:0_0_var(--color-primary)] peer-focus:bg-input-background"
```

#### `footerBar`

Footer bar classes (fixed bottom, full-width).

```typescript
const footerBar: "fixed bottom-0 left-0 right-0 w-full flex flex-wrap items-center justify-around p-[5px] bg-background text-[12px] text-foreground-secondary z-[1001]"
```

#### `footerButton`

Footer button classes.

```typescript
const footerButton: "inline-flex items-center gap-1 border-0 m-0 p-[5px] text-[12px] text-foreground-secondary hover:text-foreground bg-transparent cursor-pointer"
```

#### `footerLink`

Footer link classes.

```typescript
const footerLink: "p-[5px] text-[12px] text-foreground-secondary hover:text-foreground no-underline"
```

#### `forgotPasswordLink`

Forgot password link classes.

```typescript
const forgotPasswordLink: "border-0 p-0 m-0 bg-transparent text-foreground-secondary text-[12px] cursor-pointer hover:text-primary"
```

#### `formError`

Form error message classes.

```typescript
const formError: "text-sm text-error mt-1"
```

#### `formField`

The form field.

```typescript
const formField: "space-y-1.5"
```

#### `formFieldset`

The form fieldset.

```typescript
const formFieldset: "space-y-4"
```

#### `formFieldsetContents`

The form fieldset contents.

```typescript
const formFieldsetContents: "contents"
```

#### `formFieldWrapper`

The form field wrapper.

```typescript
const formFieldWrapper: "flex flex-col"
```

#### `formHint`

Form hint message classes.

```typescript
const formHint: "text-sm text-foreground-secondary mt-1"
```

#### `grid`

Grid layout classes.

```typescript
const grid: (props?: ({ cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12 | undefined; gap?: "sm" | "md" | "lg" | "xl" | "none" | "xs" | undefined; } & { class?: string; }) | undefined) => string
```

#### `headerFixed`

Fixed header container classes (top, full-width, z-1001).

```typescript
const headerFixed: "fixed top-0 left-0 right-0 z-[1001]"
```

#### `headerInner`

The header inner.

```typescript
const headerInner: "w-full max-w-[1280px] mx-auto h-10 p-[5px]"
```

#### `hstack`

HStack layout classes (horizontal flexbox).

```typescript
const hstack: (props?: ({ justify?: "start" | "center" | "end" | "between" | undefined; gap?: "sm" | "md" | "lg" | "xl" | "none" | "xs" | undefined; } & { class?: string; }) | undefined) => string
```

#### `iconMd`

Tailwind classes for medium icons (20x20).

```typescript
const iconMd: "h-5 w-5"
```

#### `iconSm`

Tailwind classes for small icons (16x16).

```typescript
const iconSm: "h-4 w-4"
```

#### `iconXs`

Icon extra-small size classes (12×12).

```typescript
const iconXs: "h-3 w-3"
```

#### `input`

Input component classes.

```typescript
const input: (props?: ({ variant?: "default" | "error" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `inputClearButton`

The input clear button.

```typescript
const inputClearButton: "text-foreground-secondary hover:text-foreground"
```

#### `inputInner`

The input inner.

```typescript
const inputInner: "relative"
```

#### `inputLeftElement`

Input left addon/icon container classes.

```typescript
const inputLeftElement: "absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-foreground-secondary"
```

#### `inputPadLeft`

The input pad left.

```typescript
const inputPadLeft: "pl-10"
```

#### `inputPadRight`

The input pad right.

```typescript
const inputPadRight: "pr-10"
```

#### `inputRightElement`

The input right element.

```typescript
const inputRightElement: "absolute inset-y-0 right-0 flex items-center pr-3"
```

#### `inputWrapper`

Input wrapper classes.

```typescript
const inputWrapper: "w-full"
```

#### `label`

Label component classes.

```typescript
const label: (props?: ({ required?: "true" | "false" | undefined; } & { class?: string; }) | undefined) => string
```

#### `labelBlock`

Block-level label classes.

```typescript
const labelBlock: "mb-1.5 block"
```

#### `languageActive`

Language option (active/selected) classes.

```typescript
const languageActive: "px-3 py-2 rounded-md text-sm cursor-pointer text-center transition-colors bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 font-medium"
```

#### `languageGrid`

Language selector grid container classes.

```typescript
const languageGrid: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto p-2"
```

#### `languageOption`

Language option (inactive) classes.

```typescript
const languageOption: "px-3 py-2 rounded-md text-sm cursor-pointer text-center transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
```

#### `logoIcon`

Tailwind class for the logo icon color.

```typescript
const logoIcon: "text-primary"
```

#### `logoText`

Logo text classes (lowercase, tracked, 26px).

```typescript
const logoText: "text-[26px] leading-[26px] tracking-[-1px] lowercase"
```

#### `mxAuto`

Horizontal auto-margin centering utility class.

```typescript
const mxAuto: "mx-auto"
```

#### `notSrOnly`

The not sr only.

```typescript
const notSrOnly: "not-sr-only"
```

#### `oauthButton`

OAuth provider button classes.

```typescript
const oauthButton: "group grow basis-[40px] flex flex-col justify-center items-center min-h-[60px] bg-surface border-0 rounded-[3px] cursor-pointer p-0 transition-all duration-250 hover:bg-surface-hover"
```

#### `oauthButtonGroup`

OAuth provider button group container classes.

```typescript
const oauthButtonGroup: "flex flex-wrap gap-[15px] w-full max-w-[330px] mx-auto justify-center items-center"
```

#### `oauthButtonIcon`

OAuth provider button icon classes.

```typescript
const oauthButtonIcon: "opacity-75 group-hover:opacity-100 text-foreground transition-opacity"
```

#### `oauthDivider`

OAuth divider classes (horizontal line with text).

```typescript
const oauthDivider: "relative mt-[45px] mb-[15px] text-[15px] text-center uppercase text-foreground-secondary"
```

#### `oauthDividerLine`

OAuth divider horizontal line classes.

```typescript
const oauthDividerLine: "absolute top-1/2 left-0 right-0 w-full h-[1px] border-t border-[rgba(170,170,170,0.33)]"
```

#### `oauthDividerText`

The oauth divider text.

```typescript
const oauthDividerText: "relative px-[15px] bg-background"
```

#### `oauthProviderLabel`

OAuth provider label (fallback when no icon).

```typescript
const oauthProviderLabel: "text-sm font-medium"
```

#### `pagination`

Pagination component classes.

```typescript
const pagination: "mx-auto flex w-full justify-center"
```

#### `paginationContent`

The pagination content.

```typescript
const paginationContent: "flex flex-row items-center gap-1"
```

#### `paginationEllipsis`

The pagination ellipsis.

```typescript
const paginationEllipsis: "flex h-9 w-9 items-center justify-center"
```

#### `paginationInteractive`

Pagination interactive item (cursor pointer).

```typescript
const paginationInteractive: "cursor-pointer"
```

#### `paginationItem`

The pagination item.

```typescript
const paginationItem: (props?: ({ variant?: "default" | "active" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `paginationLink`

The pagination link.

```typescript
const paginationLink: "cursor-pointer"
```

#### `paginationNext`

The pagination next.

```typescript
const paginationNext: "gap-1 pr-2.5"
```

#### `paginationPrevious`

The pagination previous.

```typescript
const paginationPrevious: "gap-1 pl-2.5"
```

#### `progress`

Progress component classes.

```typescript
const progress: "relative h-2 w-full overflow-hidden rounded-full bg-surface-secondary"
```

#### `progressIndeterminate`

The progress indeterminate.

```typescript
const progressIndeterminate: "animate-indeterminate-progress"
```

#### `progressIndicator`

The progress indicator.

```typescript
const progressIndicator: "h-full w-full flex-1 bg-primary transition-all"
```

#### `progressLabelContainer`

The progress label container.

```typescript
const progressLabelContainer: "flex justify-between mb-1 text-sm"
```

#### `progressLabelText`

The progress label text.

```typescript
const progressLabelText: "text-foreground-secondary"
```

#### `progressWrapper`

Progress bar wrapper classes.

```typescript
const progressWrapper: "w-full"
```

#### `radio`

Radio component classes.

```typescript
const radio: (props?: ({ variant?: "default" | "error" | undefined; } & { class?: string; }) | undefined) => string
```

#### `radioGroupLabel`

Radio group label classes.

```typescript
const radioGroupLabel: "text-sm font-medium mb-2 block"
```

#### `roundedFull`

The rounded full.

```typescript
const roundedFull: "rounded-full"
```

#### `select`

Select component classes.

```typescript
const select: (props?: ({ variant?: "default" | "error" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `selectNative`

Native select appearance reset classes.

```typescript
const selectNative: "appearance-none"
```

#### `separator`

Separator component classes with horizontal/vertical orientation.

```typescript
const separator: (props?: ({ orientation?: "horizontal" | "vertical" | undefined; } & { class?: string; }) | undefined) => string
```

#### `skeleton`

Skeleton component classes.

```typescript
const skeleton: "animate-pulse rounded-md bg-surface-secondary"
```

#### `skeletonCircle`

The skeleton circle.

```typescript
const skeletonCircle: "rounded-full"
```

#### `skeletonNone`

The skeleton none.

```typescript
const skeletonNone: "animate-none"
```

#### `skeletonTextContainer`

Skeleton text placeholder container (vertical spacing).

```typescript
const skeletonTextContainer: "space-y-2"
```

#### `skeletonWave`

Skeleton wave animation classes (shimmer gradient effect).

```typescript
const skeletonWave: "animate-shimmer bg-gradient-to-r from-surface-secondary via-surface to-surface-secondary bg-[length:200%_100%]"
```

#### `spinner`

Spinner component classes with size variants.

```typescript
const spinner: (props?: ({ size?: "sm" | "md" | "lg" | "xl" | undefined; } & { class?: string; }) | undefined) => string
```

#### `srOnly`

Screen reader only classes.

```typescript
const srOnly: "sr-only"
```

#### `stack`

Stack layout classes (vertical flexbox).

```typescript
const stack: (props?: ({ align?: "start" | "center" | "end" | "stretch" | undefined; gap?: "sm" | "md" | "lg" | "xl" | "none" | "xs" | undefined; } & { class?: string; }) | undefined) => string
```

#### `surfaceSecondary`

Secondary surface background utility class.

```typescript
const surfaceSecondary: "bg-surface-secondary"
```

#### `switchBase`

Switch component classes.

```typescript
const switchBase: (props?: ({ variant?: "default" | undefined; size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `switchThumb`

Switch thumb (the sliding circle) classes.

```typescript
const switchThumb: (props?: ({ size?: "sm" | "md" | "lg" | undefined; } & { class?: string; }) | undefined) => string
```

#### `table`

Table root classes.

```typescript
const table: "w-full caption-bottom text-sm"
```

#### `tableBody`

The table body.

```typescript
const tableBody: "[&_tr:last-child]:border-0"
```

#### `tableBordered`

The table bordered.

```typescript
const tableBordered: "border"
```

#### `tableCaption`

The table caption.

```typescript
const tableCaption: "mt-4 text-sm text-foreground-secondary"
```

#### `tableCell`

The table cell.

```typescript
const tableCell: "p-4 align-middle [&:has([role=checkbox])]:pr-0"
```

#### `tableEmptyCell`

The table empty cell.

```typescript
const tableEmptyCell: "py-10 text-center text-foreground-secondary"
```

#### `tableFooter`

The table footer.

```typescript
const tableFooter: "border-t bg-surface-secondary font-medium [&>tr]:last:border-b-0"
```

#### `tableHead`

Table header cell classes.

```typescript
const tableHead: "h-12 px-4 text-left align-middle font-medium text-foreground-secondary [&:has([role=checkbox])]:pr-0"
```

#### `tableHeader`

The table header.

```typescript
const tableHeader: "[&_tr]:border-b"
```

#### `tableHeadSortable`

The table head sortable.

```typescript
const tableHeadSortable: "cursor-pointer select-none hover:bg-surface-secondary"
```

#### `tableLoadingOverlay`

Table loading overlay classes (semi-transparent centered spinner container).

```typescript
const tableLoadingOverlay: "absolute inset-0 bg-background/50 flex items-center justify-center z-10"
```

#### `tableRow`

Table row classes.

```typescript
const tableRow: "border-b transition-colors hover:bg-surface-secondary data-[state=selected]:bg-surface-secondary"
```

#### `tableRowClickable`

The table row clickable.

```typescript
const tableRowClickable: "cursor-pointer"
```

#### `tableRowHoverable`

The table row hoverable.

```typescript
const tableRowHoverable: "hover:bg-surface-secondary"
```

#### `tableRowStriped`

The table row striped.

```typescript
const tableRowStriped: "bg-surface-secondary/50"
```

#### `tableSortIcon`

The table sort icon.

```typescript
const tableSortIcon: "ml-1"
```

#### `tableSortWrapper`

The table sort wrapper.

```typescript
const tableSortWrapper: "flex items-center gap-1"
```

#### `tableWrapper`

Table wrapper classes (scrollable container).

```typescript
const tableWrapper: "relative w-full overflow-auto"
```

#### `tabsContent`

Tabs content panel classes.

```typescript
const tabsContent: "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
```

#### `tabsFitted`

Fitted (full-width) tabs container classes.

```typescript
const tabsFitted: "w-full"
```

#### `tabsList`

Tabs list container classes.

```typescript
const tabsList: "inline-flex h-10 items-center justify-center rounded-md bg-surface-secondary p-1 text-foreground-secondary"
```

#### `tabsTrigger`

Tabs trigger button classes.

```typescript
const tabsTrigger: "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
```

#### `tabTriggerFitted`

The tab trigger fitted.

```typescript
const tabTriggerFitted: "flex-1"
```

#### `tabTriggerIcon`

The tab trigger icon.

```typescript
const tabTriggerIcon: "mr-2"
```

#### `textarea`

Textarea component classes.

```typescript
const textarea: (props?: ({ variant?: "default" | "error" | undefined; } & { class?: string; }) | undefined) => string
```

#### `textPrimary`

Primary text color utility class.

```typescript
const textPrimary: "text-primary"
```

#### `textRight`

Text right-alignment utility class.

```typescript
const textRight: "text-right"
```

#### `textSuccess`

The text success.

```typescript
const textSuccess: "text-success"
```

#### `textWarning`

The text warning.

```typescript
const textWarning: "text-warning"
```

#### `themeToggleButton`

Theme toggle button classes.

```typescript
const themeToggleButton: "w-[30px] h-[30px] p-0 border-0 bg-transparent text-foreground-secondary hover:text-foreground cursor-pointer flex items-center justify-center"
```

#### `toast`

Tailwind toast notification variant classes (default, success, error, warning).

```typescript
const toast: (props?: ({ variant?: "default" | "success" | "error" | "warning" | "info" | undefined; } & { class?: string; }) | undefined) => string
```

#### `toastAction`

Toast action button classes.

```typescript
const toastAction: "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 disabled:pointer-events-none disabled:opacity-50"
```

#### `toastClose`

Toast close button classes.

```typescript
const toastClose: "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
```

#### `toastContentWrapper`

The toast content wrapper.

```typescript
const toastContentWrapper: "flex-1 gap-1"
```

#### `toastDescription`

The toast description.

```typescript
const toastDescription: "text-sm opacity-90"
```

#### `toastIconWrapper`

Toast icon wrapper classes.

```typescript
const toastIconWrapper: "flex-shrink-0"
```

#### `toastTitle`

The toast title.

```typescript
const toastTitle: "text-sm font-semibold"
```

#### `toastViewport`

Toast viewport container classes (positioned fixed, stacked).

```typescript
const toastViewport: "fixed top-0 z-toast flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
```

#### `tooltipContent`

Tooltip content container classes.

```typescript
const tooltipContent: "z-tooltip overflow-hidden rounded-md border bg-surface px-3 py-1.5 text-sm text-foreground shadow-md animate-in fade-in-0 zoom-in-95"
```

#### `tooltipTrigger`

Tooltip trigger wrapper classes.

```typescript
const tooltipTrigger: "inline-block"
```

## Core Interface
Implements `@molecule/app-ui` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-styling` ^1.0.0
- `@molecule/app-ui` ^1.0.0
