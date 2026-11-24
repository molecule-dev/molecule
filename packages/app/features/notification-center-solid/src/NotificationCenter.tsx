/**
 * Solid notification dropdown panel.
 *
 * Solid counterpart of `@molecule/app-notification-center-react`'s
 * `NotificationCenter` — the same props (React names), the same ClassMap
 * tokens, the same i18n keys, and the same DOM for the same input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button } from '@molecule/app-ui-solid'

import type { NotificationCenterProps, NotificationItem } from './types.js'

/** The panel's fixed inline style (React's `minWidth: 320, maxHeight: 480, overflowY: 'auto'`). */
const panelStyle = 'min-width: 320px; max-height: 480px; overflow-y: auto;'
/** The unread dot's inline style (width/height/marginTop only — the colour is a ClassMap class). */
const dotStyle = 'width: 8px; height: 8px; margin-top: 6px;'

/**
 * Standalone notification panel — title + mark-all-read action + scrollable
 * item list + footer "View all". Drop inside a popover / dropdown / drawer to
 * make a full notification center.
 *
 * React keys each row by the item's `id` value, so a re-passed or re-ordered
 * array keeps the rendered rows per id. Solid's `For` keys by reference, so
 * the rows are keyed through stable per-id records: the record for an id is
 * created once and reused, while the row's content reads the CURRENT item for
 * that id reactively.
 *
 * @param props - Component props (see {@link NotificationCenterProps}).
 * @returns The notification center component.
 */
export const NotificationCenter: Component<NotificationCenterProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  /** Whether the list branch renders (React's `items.length > 0`). */
  const hasItems = (): boolean => props.items.length > 0

  /** One stable record per item id, created on first sight. */
  interface Row {
    id: string
  }
  const records = new Map<string, Row>()
  const keyedRows = (): Row[] => {
    const seen = new Set<string>()
    const rows = props.items.map((item) => {
      seen.add(item.id)
      let row = records.get(item.id)
      if (!row) {
        row = { id: item.id }
        records.set(item.id, row)
      }
      return row
    })
    for (const id of [...records.keys()]) if (!seen.has(id)) records.delete(id)
    return rows
  }
  const itemFor = (id: string): NotificationItem =>
    props.items.find((item) => item.id === id) as NotificationItem

  return (
    <div class={cm.cn(cm.stack(0 as const), props.className)} style={panelStyle}>
      <header
        class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), cm.sp('p', 3))}
      >
        <ResolveNode node={props.title}>
          {(title, hasTitle) => (
            <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {hasTitle()
                ? title()
                : t('notifications.title', {}, { defaultValue: 'Notifications' })}
            </h3>
          )}
        </ResolveNode>
        <Show when={props.onMarkAllRead && hasItems()}>
          <Button variant="ghost" size="sm" onClick={props.onMarkAllRead}>
            {t('notifications.markAllRead', {}, { defaultValue: 'Mark all as read' })}
          </Button>
        </Show>
      </header>
      <Show when={props.lastError}>
        <div class={cm.sp('px', 3)}>
          <Alert status="error">
            <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
              <span class={cm.textSize('sm')}>
                {t(
                  'notifications.loadError',
                  {},
                  {
                    defaultValue: 'Could not load notifications.',
                  },
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={props.onRetry}
                data-mol-id="notification-center-retry"
              >
                {t('notifications.retry', {}, { defaultValue: 'Retry' })}
              </Button>
            </div>
          </Alert>
        </div>
      </Show>
      <Show
        when={hasItems()}
        fallback={
          <ResolveNode node={props.emptyState}>
            {(empty, hasEmpty) => (
              <Show
                when={hasEmpty()}
                fallback={
                  <div class={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'))}>
                    {t('notifications.empty', {}, { defaultValue: 'No notifications' })}
                  </div>
                }
              >
                {empty()}
              </Show>
            )}
          </ResolveNode>
        }
      >
        <ul class={cm.stack(0 as const)}>
          <For each={keyedRows()}>
            {(row) => {
              const it = (): NotificationItem => itemFor(row.id)
              return (
                <li>
                  {/* A `li` cannot take button semantics, so the row is a
                    wrapper around its content: a button in the a11y tree (role
                    + tabindex + Enter / Space activation) while the item is
                    clickable, the plain row div otherwise. */}
                  <div
                    onClick={(event: MouseEvent): void => it().onClick?.(event)}
                    onKeyDown={(event: KeyboardEvent): void => {
                      if (!it().onClick) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        it().onClick?.()
                      }
                    }}
                    role={it().onClick ? 'button' : undefined}
                    tabindex={it().onClick ? 0 : undefined}
                    class={cm.cn(
                      cm.flex({ align: 'start', gap: 'sm' }),
                      cm.sp('px', 3),
                      cm.sp('py', 2),
                      it().onClick ? cm.cursorPointer : undefined,
                      it().read ? undefined : cm.bgPrimarySubtle,
                    )}
                  >
                    <Show when={it().leading}>
                      <div class={cm.shrink0}>{it().leading as JSX.Element}</div>
                    </Show>
                    <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
                      {/* The unread state is announced, not only shown: a screen
                        reader reads "Unread" before the title (WCAG 1.3.1). */}
                      <Show when={!it().read}>
                        <span class={cm.cn(cm.srOnly)}>
                          {t('notifications.unread', {}, { defaultValue: 'Unread' })}
                        </span>
                      </Show>
                      <span
                        class={cm.cn(
                          cm.textSize('sm'),
                          it().read ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                        )}
                      >
                        {it().title as JSX.Element}
                      </span>
                      <Show when={it().body}>
                        <span class={cm.textSize('xs')}>{it().body as JSX.Element}</span>
                      </Show>
                      <Show when={it().timestamp}>
                        <span class={cm.textSize('xs')}>{it().timestamp as JSX.Element}</span>
                      </Show>
                    </div>
                    <Show when={!it().read}>
                      <span
                        aria-hidden="true"
                        class={cm.cn(cm.bgPrimary, cm.roundedFull)}
                        style={dotStyle}
                      />
                    </Show>
                  </div>
                </li>
              )
            }}
          </For>
        </ul>
      </Show>
      <Show when={props.onViewAll && hasItems()}>
        <footer class={cm.cn(cm.sp('p', 2), cm.textCenter)}>
          <Button variant="ghost" size="sm" onClick={props.onViewAll}>
            {t('notifications.viewAll', {}, { defaultValue: 'View all' })}
          </Button>
        </footer>
      </Show>
    </div>
  )
}
