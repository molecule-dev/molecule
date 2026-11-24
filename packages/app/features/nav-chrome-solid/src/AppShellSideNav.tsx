import { type Component, For, type JSX } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AppShellSideNavProps, NavItem } from './types.js'

/**
 * Vertical side nav shell. Pass either `items` for a flat list or `groups`
 * for a sectioned layout ("Main / Teams / Settings"). Header and footer
 * slots remain fixed while the middle scrolls.
 *
 * This is the Solid counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link AppShellSideNavProps}).
 * @returns The rendered side navigation.
 */
export const AppShellSideNav: Component<AppShellSideNavProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  /** The nav region's accessible name (locale-reactive). */
  const navLabel = (): string => t('navChrome.aria.sidebar', undefined, { defaultValue: 'Sidebar' })

  /**
   * React's `cm.sp('mt', 'auto')`. The spacing scale type omits `'auto'`,
   * but the bonded map renders the literal Tailwind class for it.
   * @returns The class string.
   */
  const mountClass = (): string => cm.cn(cm.sp('mt', 'auto' as never))

  /** Renders a single nav item as a button with icon, label, and optional badge. */
  const renderItem = (it: NavItem): JSX.Element => (
    <button
      type="button"
      onClick={() => props.onItemClick?.(it)}
      disabled={it.disabled}
      aria-current={it.id === props.activeId ? 'page' : undefined}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm', justify: 'between' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        cm.textSize('sm'),
        it.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
      )}
    >
      <span class={cm.flex({ align: 'center', gap: 'sm' })}>
        {it.icon}
        <span>{it.label}</span>
      </span>
      {it.badge}
    </button>
  )

  return (
    <aside class={cm.cn(cm.stack(4), props.className)}>
      {props.header}
      <nav aria-label={navLabel()} class={cm.stack(4)}>
        <For each={props.items ?? []}>{(it) => renderItem(it)}</For>
        <For each={props.groups ?? []}>
          {(g) => (
            <section class={cm.stack(1)}>
              {g.heading && (
                <h3 class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('px', 3))}>
                  {g.heading}
                </h3>
              )}
              <For each={g.items}>{(it) => renderItem(it)}</For>
            </section>
          )}
        </For>
      </nav>
      <PresentWhileNode node={props.footer}>
        {(footer) => <div class={mountClass()}>{footer()}</div>}
      </PresentWhileNode>
    </aside>
  )
}
