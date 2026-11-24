import type { Component, JSX } from 'solid-js'
import { For, Show, useContext } from 'solid-js'
import { Dynamic } from 'solid-js/web'

import { I18nContext, Link, ResolveNode, ThemeContext } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Flex, ThemeToggle } from '@molecule/app-ui-solid'

import type { AppHeaderProps } from './types.js'

/**
 * Resilient default for the {@link AppHeader} `themeToggle` slot.
 *
 * `<ThemeToggle />` reads `useTheme()` + `useTranslation()`, both of which
 * THROW when `@molecule/app-solid`'s theme / i18n services are not wired
 * above the header. This wrapper probes those contexts with `useContext`
 * — which returns `undefined` (rather than throwing) when a provider is
 * absent — and renders the real toggle only when BOTH are present. Without
 * them the slot is silently omitted, so `<AppHeader appName="…" />` renders
 * out of the box even before an app has wired theme/i18n. Once both
 * providers exist, the toggle appears automatically with no extra prop.
 *
 * @returns The theme toggle, or null when theme/i18n are not both wired.
 */
function DefaultThemeToggle(): JSX.Element | null {
  const themeProvider = useContext(ThemeContext)
  const i18nProvider = useContext(I18nContext)
  if (!themeProvider || !i18nProvider) {
    return null
  }
  return <ThemeToggle />
}

/**
 * Sticky top app-shell header — logo + appName on the left, slotted actions
 * on the right. All visual styling routes through ClassMap tokens
 * (`cm.headerBar`, `cm.headerFixed`, `cm.headerInner`, `cm.logoText`) so the
 * bonded styling layer controls the visual treatment.
 *
 * This is the Solid counterpart of `@molecule/app-header-react`: the same
 * props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link AppHeaderProps}).
 * @returns The rendered header.
 */
export const AppHeader: Component<AppHeaderProps> = (props) => {
  const cm = getClassMap()
  const logoSrc = (): string => props.logoSrc ?? '/logo.svg'
  const logoSize = (): number => props.logoSize ?? 30
  const brandTo = (): string => props.brandTo ?? '/'
  const fixed = (): boolean => props.fixed ?? true
  /** The brand+actions bar is a `nav` landmark only when destinations are declared. */
  const Inner = (): 'nav' | 'div' => (props.navigation ? 'nav' : 'div')

  return (
    <header
      class={cm.cn(cm.headerBar, fixed() ? cm.headerFixed : '', props.className)}
      data-mol-id={props.dataMolId}
    >
      <Dynamic
        component={Inner()}
        class={
          props.navigation?.className
            ? cm.cn(cm.headerInner, props.navigation.className)
            : cm.headerInner
        }
        aria-label={props.navigation?.label}
      >
        <Flex align="center" justify="between" className={cm.h('full')}>
          <Link to={brandTo()} class={props.brandClassName}>
            <Flex align="center" gap="xs">
              <img src={logoSrc()} width={logoSize()} height={logoSize()} alt="" />
              <span class={cm.logoText}>{props.appName}</span>
            </Flex>
          </Link>
          <Flex align="center" gap="sm">
            {props.navigation && (
              <ul class={props.navigation.listClassName}>
                <For each={Object.entries(props.navigation.links)}>
                  {([to, { className, ...link }]) => (
                    <li class={props.navigation?.itemClassName}>
                      <Link class={className} {...link} to={to} />
                    </li>
                  )}
                </For>
              </ul>
            )}
            {/* React's default parameter: an omitted slot falls back to the
                resilient default toggle; an explicit `null` force-hides it. */}
            {/* React's `slot(themeToggle) ?? default`, read once: an explicit `null` resolves to
                `null`, so the fallback reads it from the same resolution. */}
            <ResolveNode node={props.themeToggle}>
              {(themeToggle, present) => (
                <Show
                  when={present()}
                  fallback={themeToggle() === null ? null : <DefaultThemeToggle />}
                >
                  {themeToggle()}
                </Show>
              )}
            </ResolveNode>
            {props.extraActions}
            {props.userMenu}
          </Flex>
        </Flex>
      </Dynamic>
    </header>
  )
}
