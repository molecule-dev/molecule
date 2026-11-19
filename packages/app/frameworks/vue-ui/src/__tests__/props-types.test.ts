/**
 * Compile-time contract of the props types the Vue kit exports for React's
 * name-for-name parity.
 *
 * `@molecule/app-ui-react` exports an interface per component; an app swaps
 * the React kit for this one by changing the import, so every props type has
 * to exist here under the same name with React's members in Vue's form.
 *
 * Each assertion pairs one interface with its component's PUBLIC props and
 * requires mutual assignability: a member added to one and not the other, or
 * a prop whose type drifts, stops compiling here.
 *
 * The component side is the instance's `$props` rather than
 * `ExtractPublicPropTypes<typeof Component.props>`: `defineComponent` types
 * the static `props` as `any` in Vue 3.5, while `$props` is the public props
 * shape (defaulted props optional, `required: true` props required) that a
 * template or `h()` is checked against — the same shape
 * `ExtractPublicPropTypes` derives from a props options object.
 *
 * Checked by `scripts/typecheck-tests.mjs`; `vitest run` runs the file to
 * prove the components still import.
 *
 * @module
 */

import { describe, expect, expectTypeOf, it } from 'vitest'

import type {
  AuthGuardProps,
  ConfirmButtonProps,
  ConfirmDialogProps,
  LanguagePickerProps,
  LoadErrorBannerProps,
  OptimisticToggleButtonProps,
  PanelCloseProviderProps,
  PromptDialogProps,
  ThemeToggleProps,
  UserMenuPopoverPanelProps,
  UserMenuPopoverProps,
  UserMenuPopoverSignOutProps,
  UserMenuPopoverTriggerProps,
} from '../index.js'
import {
  AuthGuard,
  ConfirmButton,
  ConfirmDialog,
  LanguagePicker,
  LoadErrorBanner,
  OptimisticToggleButton,
  PanelCloseProvider,
  PromptDialog,
  ThemeToggle,
  UserMenuPopover,
  UserMenuPopoverPanel,
  UserMenuPopoverSignOut,
  UserMenuPopoverTrigger,
} from '../index.js'

/** The public props of a component: the shape a template or `h()` checks against. */
type PublicProps<C> = C extends new (...args: never[]) => { $props: infer P } ? P : never

describe('exported props types', () => {
  it('keeps every interface mutually assignable with its component’s public props', () => {
    // AuthGuard
    expectTypeOf<PublicProps<typeof AuthGuard>>().toMatchTypeOf<AuthGuardProps>()
    expectTypeOf<AuthGuardProps>().toMatchTypeOf<PublicProps<typeof AuthGuard>>()

    // ConfirmButton
    expectTypeOf<PublicProps<typeof ConfirmButton>>().toMatchTypeOf<ConfirmButtonProps>()
    expectTypeOf<ConfirmButtonProps>().toMatchTypeOf<PublicProps<typeof ConfirmButton>>()

    // ConfirmDialog
    expectTypeOf<PublicProps<typeof ConfirmDialog>>().toMatchTypeOf<ConfirmDialogProps>()
    expectTypeOf<ConfirmDialogProps>().toMatchTypeOf<PublicProps<typeof ConfirmDialog>>()

    // LanguagePicker
    expectTypeOf<PublicProps<typeof LanguagePicker>>().toMatchTypeOf<LanguagePickerProps>()
    expectTypeOf<LanguagePickerProps>().toMatchTypeOf<PublicProps<typeof LanguagePicker>>()

    // LoadErrorBanner
    expectTypeOf<PublicProps<typeof LoadErrorBanner>>().toMatchTypeOf<LoadErrorBannerProps>()
    expectTypeOf<LoadErrorBannerProps>().toMatchTypeOf<PublicProps<typeof LoadErrorBanner>>()

    // OptimisticToggleButton
    expectTypeOf<
      PublicProps<typeof OptimisticToggleButton>
    >().toMatchTypeOf<OptimisticToggleButtonProps>()
    expectTypeOf<OptimisticToggleButtonProps>().toMatchTypeOf<
      PublicProps<typeof OptimisticToggleButton>
    >()

    // PanelCloseProvider
    expectTypeOf<PublicProps<typeof PanelCloseProvider>>().toMatchTypeOf<PanelCloseProviderProps>()
    expectTypeOf<PanelCloseProviderProps>().toMatchTypeOf<PublicProps<typeof PanelCloseProvider>>()

    // PromptDialog
    expectTypeOf<PublicProps<typeof PromptDialog>>().toMatchTypeOf<PromptDialogProps>()
    expectTypeOf<PromptDialogProps>().toMatchTypeOf<PublicProps<typeof PromptDialog>>()

    // ThemeToggle
    expectTypeOf<PublicProps<typeof ThemeToggle>>().toMatchTypeOf<ThemeToggleProps>()
    expectTypeOf<ThemeToggleProps>().toMatchTypeOf<PublicProps<typeof ThemeToggle>>()

    // UserMenuPopover
    expectTypeOf<PublicProps<typeof UserMenuPopover>>().toMatchTypeOf<UserMenuPopoverProps>()
    expectTypeOf<UserMenuPopoverProps>().toMatchTypeOf<PublicProps<typeof UserMenuPopover>>()

    // UserMenuPopoverTrigger
    expectTypeOf<
      PublicProps<typeof UserMenuPopoverTrigger>
    >().toMatchTypeOf<UserMenuPopoverTriggerProps>()
    expectTypeOf<UserMenuPopoverTriggerProps>().toMatchTypeOf<
      PublicProps<typeof UserMenuPopoverTrigger>
    >()

    // UserMenuPopoverPanel
    expectTypeOf<
      PublicProps<typeof UserMenuPopoverPanel>
    >().toMatchTypeOf<UserMenuPopoverPanelProps>()
    expectTypeOf<UserMenuPopoverPanelProps>().toMatchTypeOf<
      PublicProps<typeof UserMenuPopoverPanel>
    >()

    // UserMenuPopoverSignOut
    expectTypeOf<
      PublicProps<typeof UserMenuPopoverSignOut>
    >().toMatchTypeOf<UserMenuPopoverSignOutProps>()
    expectTypeOf<UserMenuPopoverSignOutProps>().toMatchTypeOf<
      PublicProps<typeof UserMenuPopoverSignOut>
    >()
  })

  it('exports each component the type describes from the package root', () => {
    const components = [
      AuthGuard,
      ConfirmButton,
      ConfirmDialog,
      LanguagePicker,
      LoadErrorBanner,
      OptimisticToggleButton,
      PanelCloseProvider,
      PromptDialog,
      ThemeToggle,
      UserMenuPopover,
      UserMenuPopoverPanel,
      UserMenuPopoverSignOut,
      UserMenuPopoverTrigger,
    ]
    for (const component of components) expect(component).toBeDefined()
  })
})
