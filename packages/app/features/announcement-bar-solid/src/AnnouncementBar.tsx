import type { Component, JSX } from 'solid-js'
import { createSignal, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { AnnouncementBarProps } from './types.js'

/**
 * Persistent announcement banner — product updates, promos, outage
 * notices, feature callouts. Different from `<Toast>` in being
 * long-lived and prominent (top-of-page), and from `<Alert>` in
 * including an action slot + dismiss.
 *
 * Dismissal is uncontrolled by default (internal state) — pass `visible` to
 * control it. `kind` is exposed as `data-kind` only; it does not change the
 * bar's colors by itself.
 *
 * This is the Solid counterpart of `@molecule/app-announcement-bar-react`: the
 * same props (React names), the same ClassMap tokens, the same i18n keys, and
 * the same DOM for the same input.
 *
 * @param props - Component props (see {@link AnnouncementBarProps}).
 * @returns The rendered announcement bar, or nothing while hidden.
 */
export const AnnouncementBar: Component<AnnouncementBarProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [internalVisible, setInternalVisible] = createSignal(true)

  /** React's `visible ?? internalVisible`. */
  const isVisible = (): boolean => props.visible ?? internalVisible()
  /** React's `dismissible = true` default. */
  const dismissible = (): boolean => props.dismissible ?? true
  /** The action's shared class list. */
  const actionClasses = (): string => cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link)
  /** The inner rows' class (`cm.flex({ align: 'center', gap: 'sm' })`). */
  const rowClasses = (): string => cm.flex({ align: 'center', gap: 'sm' })

  /** Hides the bar (internal state) and fires the onDismiss callback. */
  const dismiss = (): void => {
    if (props.visible === undefined) setInternalVisible(false)
    props.onDismiss?.()
  }

  /** The action node: a link when it has an `href`, a button otherwise. */
  const actionNode = (): JSX.Element => {
    const action = props.action
    if (!action) return null
    return action.href ? (
      <a href={action.href} class={actionClasses()}>
        {action.label}
      </a>
    ) : (
      <button type="button" onClick={action.onClick} class={actionClasses()}>
        {action.label}
      </button>
    )
  }

  return (
    <Show when={isVisible()}>
      <div
        role="status"
        data-mol-id={props.dataMolId}
        data-kind={props.kind ?? 'info'}
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
          cm.sp('px', 4),
          cm.sp('py', 2),
          props.className,
        )}
      >
        <div class={rowClasses()}>
          {props.icon}
          <span class={cm.textSize('sm')}>{props.children}</span>
        </div>
        <div class={rowClasses()}>
          {actionNode()}
          <Show when={dismissible()}>
            <button
              type="button"
              onClick={dismiss}
              aria-label={t('announcement.dismiss', {}, { defaultValue: 'Dismiss' })}
              class={cm.cn(cm.w(6), cm.h(6), cm.flex({ align: 'center', justify: 'center' }))}
            >
              ×
            </button>
          </Show>
        </div>
      </div>
    </Show>
  )
}
