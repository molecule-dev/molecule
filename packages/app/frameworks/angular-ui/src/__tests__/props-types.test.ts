/**
 * Type-level parity: every component input that carries a React prop is
 * declared with that prop's type from the exported `*Props` interface, so the
 * interface and the component cannot drift apart.
 *
 * The imports are `import type`, so this file costs nothing at runtime — it is
 * the TypeScript compiler (`scripts/typecheck-tests.mjs`) that runs it. A
 * change to either side of a pair fails the type-check instead of silently
 * shipping a component whose input accepts something its interface forbids.
 *
 * @module
 */
import { describe, expectTypeOf, it } from 'vitest'

import type { AuthGuard, AuthGuardProps } from '../components/auth-guard.component.js'
import type { ConfirmButton, ConfirmButtonProps } from '../components/confirm-button.component.js'
import type { ConfirmDialog, ConfirmDialogProps } from '../components/confirm-dialog.component.js'
import type { Form, ReactFormProps } from '../components/form.component.js'
import type { Icon, IconProps } from '../components/icon.component.js'
import type {
  LanguagePicker,
  LanguagePickerProps,
} from '../components/language-picker.component.js'
import type {
  LoadErrorBanner,
  LoadErrorBannerProps,
} from '../components/load-error-banner.component.js'
import type {
  OptimisticToggleButton,
  OptimisticToggleButtonProps,
} from '../components/optimistic-toggle-button.component.js'
import type {
  PanelCloseProvider,
  PanelCloseProviderProps,
} from '../components/panel-close.component.js'
import type { Progress, ProgressProps } from '../components/progress.component.js'
import type { PromptDialog, PromptDialogProps } from '../components/prompt-dialog.component.js'
import type {
  ResponsiveAppShell,
  ResponsiveAppShellContent,
  ResponsiveAppShellContentProps,
  ResponsiveAppShellDrawer,
  ResponsiveAppShellDrawerProps,
  ResponsiveAppShellProps,
  ResponsiveAppShellSidebar,
  ResponsiveAppShellSidebarProps,
  ResponsiveAppShellTopBar,
  ResponsiveAppShellTopBarProps,
} from '../components/responsive-app-shell.component.js'
import type { Separator, SeparatorProps } from '../components/separator.component.js'
import type {
  SidebarUserCard,
  SidebarUserCardProps,
} from '../components/sidebar-user-card.component.js'
import type { ThemeToggle, ThemeToggleProps } from '../components/theme-toggle.component.js'
import type { UserMenu, UserMenuProps } from '../components/user-menu.component.js'
import type {
  UserMenuPopover,
  UserMenuPopoverPanel,
  UserMenuPopoverPanelProps,
  UserMenuPopoverProps,
  UserMenuPopoverSignOut,
  UserMenuPopoverSignOutProps,
  UserMenuPopoverTrigger,
  UserMenuPopoverTriggerProps,
} from '../components/user-menu-popover.component.js'

/** The prop type the component makes optional (defaulted) but React requires. */
type Prop<T, K extends keyof T> = NonNullable<T[K]>

describe('AuthGuard props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<AuthGuard['loadingFallback']>().toEqualTypeOf<AuthGuardProps['loadingFallback']>()
    expectTypeOf<AuthGuard['loadingKey']>().toEqualTypeOf<AuthGuardProps['loadingKey']>()
    expectTypeOf<AuthGuard['loadingDefault']>().toEqualTypeOf<AuthGuardProps['loadingDefault']>()
    expectTypeOf<AuthGuard['loginPath']>().toEqualTypeOf<AuthGuardProps['loginPath']>()
    expectTypeOf<AuthGuard['onAuthenticated']>().toEqualTypeOf<AuthGuardProps['onAuthenticated']>()
  })
})

describe('ConfirmButton props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ConfirmButton['variant']>().toEqualTypeOf<ConfirmButtonProps['variant']>()
    expectTypeOf<ConfirmButton['color']>().toEqualTypeOf<ConfirmButtonProps['color']>()
    expectTypeOf<ConfirmButton['size']>().toEqualTypeOf<ConfirmButtonProps['size']>()
    expectTypeOf<ConfirmButton['onConfirm']>().toEqualTypeOf<ConfirmButtonProps['onConfirm']>()
    expectTypeOf<ConfirmButton['label']>().toEqualTypeOf<ConfirmButtonProps['label']>()
    expectTypeOf<ConfirmButton['confirmLabel']>().toEqualTypeOf<
      ConfirmButtonProps['confirmLabel']
    >()
    expectTypeOf<ConfirmButton['pendingLabel']>().toEqualTypeOf<
      ConfirmButtonProps['pendingLabel']
    >()
    expectTypeOf<ConfirmButton['disarmSeconds']>().toEqualTypeOf<
      ConfirmButtonProps['disarmSeconds']
    >()
    expectTypeOf<ConfirmButton['disabled']>().toEqualTypeOf<ConfirmButtonProps['disabled']>()
    expectTypeOf<ConfirmButton['testId']>().toEqualTypeOf<ConfirmButtonProps['testId']>()
    expectTypeOf<ConfirmButton['className']>().toEqualTypeOf<ConfirmButtonProps['className']>()
    expectTypeOf<ConfirmButton['style']>().toEqualTypeOf<ConfirmButtonProps['style']>()
    expectTypeOf<ConfirmButton['automationId']>().toEqualTypeOf<
      ConfirmButtonProps['automationId']
    >()
  })
})

describe('ConfirmDialog props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ConfirmDialog['open']>().toEqualTypeOf<ConfirmDialogProps['open']>()
    expectTypeOf<ConfirmDialog['title']>().toEqualTypeOf<ConfirmDialogProps['title']>()
    expectTypeOf<ConfirmDialog['description']>().toEqualTypeOf<ConfirmDialogProps['description']>()
    expectTypeOf<ConfirmDialog['confirmLabel']>().toEqualTypeOf<
      ConfirmDialogProps['confirmLabel']
    >()
    expectTypeOf<ConfirmDialog['cancelLabel']>().toEqualTypeOf<ConfirmDialogProps['cancelLabel']>()
    expectTypeOf<ConfirmDialog['destructive']>().toEqualTypeOf<ConfirmDialogProps['destructive']>()
    expectTypeOf<ConfirmDialog['loading']>().toEqualTypeOf<ConfirmDialogProps['loading']>()
  })
})

describe('Form props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<Form['onFormSubmit']>().toEqualTypeOf<ReactFormProps['onFormSubmit']>()
    expectTypeOf<Form['onSubmit']>().toEqualTypeOf<ReactFormProps['onSubmit']>()
    expectTypeOf<Form['onReset']>().toEqualTypeOf<ReactFormProps['onReset']>()
    expectTypeOf<Form['submitting']>().toEqualTypeOf<ReactFormProps['submitting']>()
    expectTypeOf<Form['submitError']>().toEqualTypeOf<ReactFormProps['submitError']>()
    expectTypeOf<Form['action']>().toEqualTypeOf<ReactFormProps['action']>()
    expectTypeOf<Form['method']>().toEqualTypeOf<ReactFormProps['method']>()
    expectTypeOf<Form['noValidate']>().toEqualTypeOf<ReactFormProps['noValidate']>()
    expectTypeOf<Form['className']>().toEqualTypeOf<ReactFormProps['className']>()
    expectTypeOf<Form['style']>().toEqualTypeOf<ReactFormProps['style']>()
    expectTypeOf<Form['testId']>().toEqualTypeOf<ReactFormProps['testId']>()
    expectTypeOf<Form['automationId']>().toEqualTypeOf<ReactFormProps['automationId']>()
  })
})

describe('Icon props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<Icon['name']>().toEqualTypeOf<IconProps['name']>()
    expectTypeOf<Icon['size']>().toEqualTypeOf<IconProps['size']>()
    expectTypeOf<Icon['className']>().toEqualTypeOf<IconProps['className']>()
    expectTypeOf<Icon['ariaHidden']>().toEqualTypeOf<IconProps['aria-hidden']>()
  })
})

describe('LanguagePicker props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<LanguagePicker['labelKey']>().toEqualTypeOf<LanguagePickerProps['labelKey']>()
    expectTypeOf<LanguagePicker['labelDefault']>().toEqualTypeOf<
      LanguagePickerProps['labelDefault']
    >()
    expectTypeOf<LanguagePicker['modalTitleKey']>().toEqualTypeOf<
      LanguagePickerProps['modalTitleKey']
    >()
    expectTypeOf<LanguagePicker['modalTitleDefault']>().toEqualTypeOf<
      LanguagePickerProps['modalTitleDefault']
    >()
    expectTypeOf<LanguagePicker['icon']>().toEqualTypeOf<LanguagePickerProps['icon']>()
    expectTypeOf<LanguagePicker['iconSize']>().toEqualTypeOf<LanguagePickerProps['iconSize']>()
    expectTypeOf<LanguagePicker['display']>().toEqualTypeOf<LanguagePickerProps['display']>()
    expectTypeOf<LanguagePicker['className']>().toEqualTypeOf<LanguagePickerProps['className']>()
    expectTypeOf<LanguagePicker['style']>().toEqualTypeOf<LanguagePickerProps['style']>()
    expectTypeOf<LanguagePicker['renderTrigger']>().toEqualTypeOf<
      LanguagePickerProps['renderTrigger']
    >()
  })
})

describe('LoadErrorBanner props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<LoadErrorBanner['message']>().toEqualTypeOf<LoadErrorBannerProps['message']>()
    expectTypeOf<LoadErrorBanner['detail']>().toEqualTypeOf<LoadErrorBannerProps['detail']>()
    expectTypeOf<LoadErrorBanner['retryLabel']>().toEqualTypeOf<
      LoadErrorBannerProps['retryLabel']
    >()
    expectTypeOf<LoadErrorBanner['retryMolId']>().toEqualTypeOf<
      LoadErrorBannerProps['retryMolId']
    >()
    expectTypeOf<LoadErrorBanner['onRetry']>().toEqualTypeOf<LoadErrorBannerProps['onRetry']>()
    expectTypeOf<LoadErrorBanner['className']>().toEqualTypeOf<LoadErrorBannerProps['className']>()
  })
})

describe('OptimisticToggleButton props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<OptimisticToggleButton['value']>().toEqualTypeOf<
      OptimisticToggleButtonProps['value']
    >()
    expectTypeOf<Prop<OptimisticToggleButton, 'commit'>>().toEqualTypeOf<
      OptimisticToggleButtonProps['commit']
    >()
    expectTypeOf<OptimisticToggleButton['activeLabel']>().toEqualTypeOf<
      OptimisticToggleButtonProps['activeLabel']
    >()
    expectTypeOf<OptimisticToggleButton['inactiveLabel']>().toEqualTypeOf<
      OptimisticToggleButtonProps['inactiveLabel']
    >()
    expectTypeOf<OptimisticToggleButton['onError']>().toEqualTypeOf<
      OptimisticToggleButtonProps['onError']
    >()
    expectTypeOf<OptimisticToggleButton['variant']>().toEqualTypeOf<
      OptimisticToggleButtonProps['variant']
    >()
    expectTypeOf<OptimisticToggleButton['color']>().toEqualTypeOf<
      OptimisticToggleButtonProps['color']
    >()
    expectTypeOf<OptimisticToggleButton['size']>().toEqualTypeOf<
      OptimisticToggleButtonProps['size']
    >()
    expectTypeOf<OptimisticToggleButton['fullWidth']>().toEqualTypeOf<
      OptimisticToggleButtonProps['fullWidth']
    >()
    expectTypeOf<OptimisticToggleButton['leftIcon']>().toEqualTypeOf<
      OptimisticToggleButtonProps['leftIcon']
    >()
    expectTypeOf<OptimisticToggleButton['rightIcon']>().toEqualTypeOf<
      OptimisticToggleButtonProps['rightIcon']
    >()
    expectTypeOf<OptimisticToggleButton['className']>().toEqualTypeOf<
      OptimisticToggleButtonProps['className']
    >()
    expectTypeOf<OptimisticToggleButton['style']>().toEqualTypeOf<
      OptimisticToggleButtonProps['style']
    >()
    expectTypeOf<OptimisticToggleButton['testId']>().toEqualTypeOf<
      OptimisticToggleButtonProps['testId']
    >()
    expectTypeOf<OptimisticToggleButton['disabled']>().toEqualTypeOf<
      OptimisticToggleButtonProps['disabled']
    >()
    expectTypeOf<OptimisticToggleButton['automationId']>().toEqualTypeOf<
      OptimisticToggleButtonProps['automationId']
    >()
  })
})

describe('PanelCloseProvider props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<Prop<PanelCloseProvider, 'close'>>().toEqualTypeOf<
      PanelCloseProviderProps['close']
    >()
  })
})

describe('Progress props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<Progress['value']>().toEqualTypeOf<ProgressProps['value']>()
    expectTypeOf<Progress['max']>().toEqualTypeOf<ProgressProps['max']>()
    expectTypeOf<Progress['size']>().toEqualTypeOf<ProgressProps['size']>()
    expectTypeOf<Progress['color']>().toEqualTypeOf<ProgressProps['color']>()
    expectTypeOf<Progress['showValue']>().toEqualTypeOf<ProgressProps['showValue']>()
    expectTypeOf<Progress['label']>().toEqualTypeOf<ProgressProps['label']>()
    expectTypeOf<Progress['indeterminate']>().toEqualTypeOf<ProgressProps['indeterminate']>()
    expectTypeOf<Progress['className']>().toEqualTypeOf<ProgressProps['className']>()
    expectTypeOf<Progress['style']>().toEqualTypeOf<ProgressProps['style']>()
    expectTypeOf<Progress['testId']>().toEqualTypeOf<ProgressProps['testId']>()
    expectTypeOf<Progress['automationId']>().toEqualTypeOf<ProgressProps['automationId']>()
  })
})

describe('PromptDialog props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<PromptDialog['open']>().toEqualTypeOf<PromptDialogProps['open']>()
    expectTypeOf<PromptDialog['title']>().toEqualTypeOf<PromptDialogProps['title']>()
    expectTypeOf<PromptDialog['description']>().toEqualTypeOf<PromptDialogProps['description']>()
    expectTypeOf<PromptDialog['placeholder']>().toEqualTypeOf<PromptDialogProps['placeholder']>()
    expectTypeOf<PromptDialog['initialValue']>().toEqualTypeOf<PromptDialogProps['initialValue']>()
    expectTypeOf<Prop<PromptDialog, 'onSubmit'>>().toEqualTypeOf<PromptDialogProps['onSubmit']>()
    expectTypeOf<PromptDialog['confirmLabel']>().toEqualTypeOf<PromptDialogProps['confirmLabel']>()
    expectTypeOf<PromptDialog['cancelLabel']>().toEqualTypeOf<PromptDialogProps['cancelLabel']>()
    expectTypeOf<PromptDialog['destructive']>().toEqualTypeOf<PromptDialogProps['destructive']>()
    expectTypeOf<PromptDialog['inputMolId']>().toEqualTypeOf<PromptDialogProps['inputMolId']>()
    expectTypeOf<PromptDialog['confirmMolId']>().toEqualTypeOf<PromptDialogProps['confirmMolId']>()
    expectTypeOf<PromptDialog['cancelMolId']>().toEqualTypeOf<PromptDialogProps['cancelMolId']>()
  })
})

describe('ResponsiveAppShell props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ResponsiveAppShell['sidebarWidth']>().toEqualTypeOf<
      ResponsiveAppShellProps['sidebarWidth']
    >()
    expectTypeOf<ResponsiveAppShell['className']>().toEqualTypeOf<
      ResponsiveAppShellProps['className']
    >()
    expectTypeOf<ResponsiveAppShell['dataMolId']>().toEqualTypeOf<
      ResponsiveAppShellProps['dataMolId']
    >()
  })
})

describe('ResponsiveAppShellTopBar props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ResponsiveAppShellTopBar['brand']>().toEqualTypeOf<
      ResponsiveAppShellTopBarProps['brand']
    >()
    expectTypeOf<ResponsiveAppShellTopBar['actions']>().toEqualTypeOf<
      ResponsiveAppShellTopBarProps['actions']
    >()
    expectTypeOf<ResponsiveAppShellTopBar['mobileOnly']>().toEqualTypeOf<
      ResponsiveAppShellTopBarProps['mobileOnly']
    >()
    expectTypeOf<ResponsiveAppShellTopBar['className']>().toEqualTypeOf<
      ResponsiveAppShellTopBarProps['className']
    >()
    expectTypeOf<ResponsiveAppShellTopBar['dataMolId']>().toEqualTypeOf<
      ResponsiveAppShellTopBarProps['dataMolId']
    >()
    expectTypeOf<ResponsiveAppShellTopBar['testId']>().toEqualTypeOf<
      ResponsiveAppShellTopBarProps['testId']
    >()
  })
})

describe('ResponsiveAppShellSidebar props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ResponsiveAppShellSidebar['navLabel']>().toEqualTypeOf<
      ResponsiveAppShellSidebarProps['navLabel']
    >()
    expectTypeOf<ResponsiveAppShellSidebar['footer']>().toEqualTypeOf<
      ResponsiveAppShellSidebarProps['footer']
    >()
    expectTypeOf<ResponsiveAppShellSidebar['className']>().toEqualTypeOf<
      ResponsiveAppShellSidebarProps['className']
    >()
    expectTypeOf<ResponsiveAppShellSidebar['dataMolId']>().toEqualTypeOf<
      ResponsiveAppShellSidebarProps['dataMolId']
    >()
    expectTypeOf<ResponsiveAppShellSidebar['testId']>().toEqualTypeOf<
      ResponsiveAppShellSidebarProps['testId']
    >()
  })
})

describe('ResponsiveAppShellDrawer props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ResponsiveAppShellDrawer['header']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['header']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['navLabel']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['navLabel']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['footer']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['footer']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['showCloseButton']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['showCloseButton']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['className']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['className']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['dataMolId']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['dataMolId']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['closeDataMolId']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['closeDataMolId']
    >()
    expectTypeOf<ResponsiveAppShellDrawer['testId']>().toEqualTypeOf<
      ResponsiveAppShellDrawerProps['testId']
    >()
  })
})

describe('ResponsiveAppShellContent props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ResponsiveAppShellContent['className']>().toEqualTypeOf<
      ResponsiveAppShellContentProps['className']
    >()
    expectTypeOf<ResponsiveAppShellContent['style']>().toEqualTypeOf<
      ResponsiveAppShellContentProps['style']
    >()
    expectTypeOf<ResponsiveAppShellContent['dataMolId']>().toEqualTypeOf<
      ResponsiveAppShellContentProps['dataMolId']
    >()
    expectTypeOf<ResponsiveAppShellContent['testId']>().toEqualTypeOf<
      ResponsiveAppShellContentProps['testId']
    >()
  })
})

describe('Separator props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<Separator['orientation']>().toEqualTypeOf<SeparatorProps['orientation']>()
    expectTypeOf<Separator['decorative']>().toEqualTypeOf<SeparatorProps['decorative']>()
    expectTypeOf<Separator['className']>().toEqualTypeOf<SeparatorProps['className']>()
    expectTypeOf<Separator['style']>().toEqualTypeOf<SeparatorProps['style']>()
    expectTypeOf<Separator['testId']>().toEqualTypeOf<SeparatorProps['testId']>()
    expectTypeOf<Separator['automationId']>().toEqualTypeOf<SeparatorProps['automationId']>()
  })
})

describe('SidebarUserCard props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<SidebarUserCard['name']>().toEqualTypeOf<SidebarUserCardProps['name']>()
    expectTypeOf<SidebarUserCard['secondaryLine']>().toEqualTypeOf<
      SidebarUserCardProps['secondaryLine']
    >()
    expectTypeOf<SidebarUserCard['avatarUrl']>().toEqualTypeOf<SidebarUserCardProps['avatarUrl']>()
    expectTypeOf<SidebarUserCard['ariaLabelKey']>().toEqualTypeOf<
      SidebarUserCardProps['ariaLabelKey']
    >()
    expectTypeOf<SidebarUserCard['ariaLabelDefault']>().toEqualTypeOf<
      SidebarUserCardProps['ariaLabelDefault']
    >()
    expectTypeOf<SidebarUserCard['dataMolId']>().toEqualTypeOf<SidebarUserCardProps['dataMolId']>()
    expectTypeOf<SidebarUserCard['className']>().toEqualTypeOf<SidebarUserCardProps['className']>()
  })
})

describe('ThemeToggle props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<ThemeToggle['ariaLabelKey']>().toEqualTypeOf<ThemeToggleProps['ariaLabelKey']>()
    expectTypeOf<ThemeToggle['ariaLabelDefault']>().toEqualTypeOf<
      ThemeToggleProps['ariaLabelDefault']
    >()
    expectTypeOf<ThemeToggle['darkIcon']>().toEqualTypeOf<ThemeToggleProps['darkIcon']>()
    expectTypeOf<ThemeToggle['lightIcon']>().toEqualTypeOf<ThemeToggleProps['lightIcon']>()
    expectTypeOf<ThemeToggle['iconSize']>().toEqualTypeOf<ThemeToggleProps['iconSize']>()
    expectTypeOf<ThemeToggle['className']>().toEqualTypeOf<ThemeToggleProps['className']>()
  })
})

describe('UserMenu props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<UserMenu['ariaLabelKey']>().toEqualTypeOf<UserMenuProps['ariaLabelKey']>()
    expectTypeOf<UserMenu['ariaLabelDefault']>().toEqualTypeOf<UserMenuProps['ariaLabelDefault']>()
    expectTypeOf<UserMenu['triggerIcon']>().toEqualTypeOf<UserMenuProps['triggerIcon']>()
    expectTypeOf<UserMenu['triggerIconSize']>().toEqualTypeOf<UserMenuProps['triggerIconSize']>()
    expectTypeOf<UserMenu['dataMolId']>().toEqualTypeOf<UserMenuProps['dataMolId']>()
    expectTypeOf<UserMenu['className']>().toEqualTypeOf<UserMenuProps['className']>()
    expectTypeOf<UserMenu['disabled']>().toEqualTypeOf<UserMenuProps['disabled']>()
    expectTypeOf<UserMenu['onClick']>().toEqualTypeOf<UserMenuProps['onClick']>()
    expectTypeOf<UserMenu['side']>().toEqualTypeOf<UserMenuProps['side']>()
  })
})

describe('UserMenuPopover props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<UserMenuPopover['guestName']>().toEqualTypeOf<UserMenuPopoverProps['guestName']>()
    expectTypeOf<UserMenuPopover['className']>().toEqualTypeOf<UserMenuPopoverProps['className']>()
  })
})

describe('UserMenuPopoverTrigger props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<UserMenuPopoverTrigger['ariaLabelKey']>().toEqualTypeOf<
      UserMenuPopoverTriggerProps['ariaLabelKey']
    >()
    expectTypeOf<UserMenuPopoverTrigger['ariaLabelDefault']>().toEqualTypeOf<
      UserMenuPopoverTriggerProps['ariaLabelDefault']
    >()
    expectTypeOf<UserMenuPopoverTrigger['dataMolId']>().toEqualTypeOf<
      UserMenuPopoverTriggerProps['dataMolId']
    >()
    expectTypeOf<UserMenuPopoverTrigger['className']>().toEqualTypeOf<
      UserMenuPopoverTriggerProps['className']
    >()
  })
})

describe('UserMenuPopoverPanel props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<UserMenuPopoverPanel['ariaLabelKey']>().toEqualTypeOf<
      UserMenuPopoverPanelProps['ariaLabelKey']
    >()
    expectTypeOf<UserMenuPopoverPanel['ariaLabelDefault']>().toEqualTypeOf<
      UserMenuPopoverPanelProps['ariaLabelDefault']
    >()
    expectTypeOf<UserMenuPopoverPanel['dataMolId']>().toEqualTypeOf<
      UserMenuPopoverPanelProps['dataMolId']
    >()
    expectTypeOf<UserMenuPopoverPanel['className']>().toEqualTypeOf<
      UserMenuPopoverPanelProps['className']
    >()
  })
})

describe('UserMenuPopoverSignOut props', () => {
  it('declares every input with its interface member type', () => {
    expectTypeOf<UserMenuPopoverSignOut['labelKey']>().toEqualTypeOf<
      UserMenuPopoverSignOutProps['labelKey']
    >()
    expectTypeOf<UserMenuPopoverSignOut['labelDefault']>().toEqualTypeOf<
      UserMenuPopoverSignOutProps['labelDefault']
    >()
    expectTypeOf<UserMenuPopoverSignOut['dataMolId']>().toEqualTypeOf<
      UserMenuPopoverSignOutProps['dataMolId']
    >()
    expectTypeOf<UserMenuPopoverSignOut['className']>().toEqualTypeOf<
      UserMenuPopoverSignOutProps['className']
    >()
  })
})
