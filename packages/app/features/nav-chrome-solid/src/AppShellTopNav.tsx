import { type Component, For } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AppShellTopNavProps } from './types.js'

/**
 * Top navigation shell — logo on the left, nav items in the centre,
 * app-level actions on the right. Fully slot-driven; apps decide what to
 * render in each position.
 *
 * This is the Solid counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link AppShellTopNavProps}).
 * @returns The rendered top navigation.
 */
export const AppShellTopNav: Component<AppShellTopNavProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const items = (): NonNullable<AppShellTopNavProps['items']> => props.items ?? []
  /** The centre nav region's accessible name (locale-reactive). */
  const navLabel = (): string => t('navChrome.aria.main', undefined, { defaultValue: 'Main' })

  return (
    <header
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 4),
        cm.sp('py', 3),
        props.className,
      )}
    >
      <div class={cm.flex({ align: 'center', gap: 'lg' })}>
        {props.logo}
        {items().length > 0 && (
          <nav class={cm.flex({ align: 'center', gap: 'sm' })} aria-label={navLabel()}>
            <For each={items()}>
              {(it) => (
                <button
                  type="button"
                  onClick={() => props.onItemClick?.(it)}
                  disabled={it.disabled}
                  aria-current={it.id === props.activeId ? 'page' : undefined}
                  class={cm.cn(
                    cm.flex({ align: 'center', gap: 'xs' }),
                    cm.sp('px', 2),
                    cm.sp('py', 1),
                    cm.textSize('sm'),
                    it.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
                  )}
                >
                  {it.icon}
                  <span>{it.label}</span>
                  {it.badge}
                </button>
              )}
            </For>
          </nav>
        )}
      </div>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>{props.right}</div>
    </header>
  )
}
