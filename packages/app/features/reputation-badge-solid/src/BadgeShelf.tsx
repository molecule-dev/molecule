/**
 * Solid earned-badges shelf.
 *
 * Solid counterpart of `@molecule/app-reputation-badge-react`'s `BadgeShelf` —
 * the same props (React names), the same ClassMap tokens, the same i18n keys
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { For, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { Badge, BadgeShelfProps } from './types.js'

/**
 * Horizontal row of small badge icons earned by a user — used alongside
 * `<ReputationBadge>` to surface community achievements on profile headers,
 * post bylines, and detail pages.
 *
 * Each icon shows its name in a native `title` tooltip for low-friction
 * accessibility. Clicking a badge invokes `onClick(badge)`; clicking the
 * trailing `+N` chip invokes `onClick(null)` so the host page can expand a
 * full list.
 *
 * @param props - Component props (see `BadgeShelfProps`).
 * @returns The rendered shelf, or `null` if no badges are supplied.
 */
export const BadgeShelf: Component<BadgeShelfProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const visible = (): Badge[] => (props.badges ?? []).slice(0, props.limit ?? 5)
  const overflow = (): number => Math.max(0, (props.badges?.length ?? 0) - visible().length)
  const interactive = (): boolean => typeof props.onClick === 'function'
  const tooltip = (badge: Badge): string =>
    badge.description ? `${badge.name} — ${badge.description}` : badge.name
  const overflowLabel = (): string =>
    t(
      'badgeShelf.overflow.aria',
      { count: overflow() },
      { defaultValue: 'Show {{count}} more badges' },
    )

  return (
    <Show when={(props.badges?.length ?? 0) > 0}>
      <ul
        class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), props.className)}
        data-mol-id="badge-shelf"
        aria-label={t(
          'badgeShelf.aria',
          { count: props.badges?.length ?? 0 },
          { defaultValue: '{{count}} badges earned' },
        )}
      >
        <For each={visible()}>
          {(badge) => (
            <li
              class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
              data-mol-id="badge-shelf-item"
              data-badge-id={badge.id}
            >
              {interactive() ? (
                <button
                  type="button"
                  class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
                  onClick={() => props.onClick?.(badge)}
                  title={tooltip(badge)}
                  aria-label={badge.name}
                  data-mol-id="badge-shelf-button"
                >
                  {badge.iconSrc ? (
                    <img
                      src={badge.iconSrc}
                      alt=""
                      class={cm.cn(cm.shrink0)}
                      style={{ width: '24px', height: '24px' }}
                      data-mol-id="badge-shelf-icon-img"
                    />
                  ) : (
                    <span aria-hidden="true" data-mol-id="badge-shelf-icon-glyph">
                      {badge.icon ?? '*'}
                    </span>
                  )}
                </button>
              ) : (
                <span title={tooltip(badge)} aria-label={badge.name} role="img">
                  {badge.iconSrc ? (
                    <img
                      src={badge.iconSrc}
                      alt=""
                      class={cm.cn(cm.shrink0)}
                      style={{ width: '24px', height: '24px' }}
                      data-mol-id="badge-shelf-icon-img"
                    />
                  ) : (
                    <span aria-hidden="true" data-mol-id="badge-shelf-icon-glyph">
                      {badge.icon ?? '*'}
                    </span>
                  )}
                </span>
              )}
            </li>
          )}
        </For>
        <Show when={overflow() > 0}>
          <li
            class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
            data-mol-id="badge-shelf-overflow"
          >
            <Show
              when={interactive()}
              fallback={
                <span
                  class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
                  aria-label={overflowLabel()}
                >
                  +{overflow()}
                </span>
              }
            >
              <button
                type="button"
                class={cm.cn(
                  cm.flex({ align: 'center', justify: 'center' }),
                  cm.roundedFull,
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                )}
                onClick={() => props.onClick?.(null)}
                aria-label={overflowLabel()}
                data-mol-id="badge-shelf-overflow-button"
              >
                +{overflow()}
              </button>
            </Show>
          </li>
        </Show>
      </ul>
    </Show>
  )
}
