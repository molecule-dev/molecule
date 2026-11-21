import { type Component, For } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AppShellBottomNavProps } from './types.js'

/**
 * Mobile/tablet bottom tab bar — typically 3–5 primary nav destinations.
 * Each item shows icon + short label. On desktop layouts this is usually
 * hidden via parent-level responsive chrome.
 *
 * This is the Solid counterpart of `@molecule/app-nav-chrome-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link AppShellBottomNavProps}).
 * @returns The rendered bottom navigation.
 */
export const AppShellBottomNav: Component<AppShellBottomNavProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()
  const items = (): AppShellBottomNavProps['items'] => props.items ?? []
  /** The nav region's accessible name (locale-reactive). */
  const navLabel = (): string => t('navChrome.aria.bottom', undefined, { defaultValue: 'Bottom' })

  return (
    <nav aria-label={navLabel()} class={cm.cn(cm.flex({ align: 'stretch' }), props.className)}>
      <For each={items()}>
        {(it) => (
          <button
            type="button"
            onClick={() => props.onItemClick?.(it)}
            disabled={it.disabled}
            aria-current={it.id === props.activeId ? 'page' : undefined}
            class={cm.cn(
              cm.flex1,
              cm.flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' }),
              cm.sp('py', 2),
              cm.textSize('xs'),
              it.id === props.activeId ? cm.fontWeight('semibold') : cm.fontWeight('medium'),
            )}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        )}
      </For>
    </nav>
  )
}
