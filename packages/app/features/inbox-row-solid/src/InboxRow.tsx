/**
 * Solid inbox / message-list row: selection slot + star toggle + avatar +
 * sender/labels + subject/preview + attachment/unread/timestamp.
 *
 * Solid counterpart of `@molecule/app-inbox-row-react`'s `InboxRow` — the same
 * props (React names), the same DOM for the same input, and the same i18n keys.
 *
 * @module
 */

import {
  type Accessor,
  type Component,
  createUniqueId,
  type JSX,
  type ResolvedChildren,
} from 'solid-js'

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { InboxRowProps } from './types.js'

/**
 * Inbox / email message list row — sender + subject + preview + timestamp +
 * unread/star indicators. Generalizes beyond email to any "message list" UI
 * (chat lists, notification archives, ticket queues).
 *
 * @param props - Component props (see {@link InboxRowProps}).
 * @returns The rendered inbox row.
 */
export const InboxRow: Component<InboxRowProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  /** Base of the two ids that name the open button (Solid's `createUniqueId`). */
  const nameId = createUniqueId()

  /** The star button's fixed inline style (React's object, in CSS terms). */
  const starStyle = (): Record<string, string> => ({
    background: 'none',
    border: 'none',
    'font-size': '16px',
  })

  /**
   * The unread dot's box inline style (its colour is the ClassMap's info
   * tone). Read through a call so the DOM style runtime applies it through
   * the CSSOM, exactly as React does: a static style object is serialized
   * into the attribute at compile time, which would leave values React
   * normalizes (a hex colour is serialized in its expanded form) unnormalized.
   */
  const dotStyle = (): Record<string, string> => ({
    width: '8px',
    height: '8px',
    'border-radius': '50%',
  })

  /**
   * The star toggle. It paints above the open button in its positioned
   * wrapper (see `starControl`) and keeps its own clicks.
   */
  const starButton = (): JSX.Element => (
    <button
      type="button"
      // Raised above the open button in its positioned wrapper (see the
      // selection slot), so its click cannot reach the row's open action.
      onClick={() => props.onToggleStar?.()}
      aria-pressed={props.starred}
      data-mol-id="inbox-row-star"
      aria-label={
        props.starred
          ? t('inboxRow.unstar', undefined, { defaultValue: 'Unstar' })
          : t('inboxRow.star', undefined, { defaultValue: 'Star' })
      }
      class={cm.cn(
        cm.cursorPointer,
        cm.touchTarget,
        props.starred ? cm.textTone('warning') : cm.textMuted,
      )}
      style={starStyle()}
    >
      ★
    </button>
  )

  /**
   * The star toggle as React renders it: inside a positioned wrapper while
   * the open button exists (the wrapper paints above it, so a click lands on
   * the toggle and never reaches the open button), bare otherwise.
   */
  const starControl = (): JSX.Element =>
    props.onClick ? (
      <span class={cm.cn(cm.position('relative'))}>{starButton()}</span>
    ) : (
      starButton()
    )

  /**
   * The open button's native resets. Read through a call so the DOM style
   * runtime applies it through the CSSOM, exactly as React does (see
   * {@link dotStyle}).
   */
  const openStyle = (): Record<string, string> => ({
    background: 'transparent',
    border: 'none',
    padding: '0px',
  })

  /**
   * The row's open action: an empty, transparent native button covering the
   * whole row (Enter / Space activate it natively), named by the sender and
   * the subject. A sibling of the row's other controls, not their wrapper, so
   * a button may carry it.
   */
  const openButton = (): JSX.Element => (
    <button
      type="button"
      aria-labelledby={`${nameId}-sender ${nameId}-subject`}
      data-mol-id="inbox-row-open"
      onClick={() => props.onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style={openStyle()}
    />
  )

  /**
   * The row's label text: sender + labels, subject + preview. The sender and
   * the subject carry the two ids that name the open button.
   *
   * @param sender - The sender node, resolved once by the caller.
   * @returns The label rows.
   */
  const labelRows = (sender: Accessor<ResolvedChildren>): JSX.Element => (
    <>
      <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <span id={props.onClick ? `${nameId}-sender` : undefined} class={cm.textSize('sm')}>
          {sender()}
        </span>
        <PresentWhileNode node={props.labels}>
          {(labels) => (
            <span
              class={cm.cn(
                cm.flex({ align: 'center', gap: 'xs' }),
                props.onClick ? cm.position('relative') : undefined,
              )}
            >
              {labels()}
            </span>
          )}
        </PresentWhileNode>
      </div>
      <div style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}>
        <span id={props.onClick ? `${nameId}-subject` : undefined} class={cm.textSize('sm')}>
          {props.subject}
        </span>
        <PresentWhileNode node={props.preview}>
          {(preview) => (
            <span class={cm.cn(cm.textSize('sm'), cm.sp('ml', 2))} style={{ opacity: '0.6' }}>
              — {preview()}
            </span>
          )}
        </PresentWhileNode>
      </div>
    </>
  )

  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
      style={props.unread ? { 'font-weight': '600' } : undefined}
    >
      {props.onClick ? openButton() : undefined}
      {/* The selection slot: inside a positioned wrapper while the open button exists (the
          wrapper paints above it, so a click lands on the slot and never reaches the open
          button), bare otherwise. Read inside JSX, so the wrapper follows `onClick` and the slot
          follows what it renders. */}
      <PresentWhileNode node={props.selectionSlot}>
        {(selection) => (
          <>
            {props.onClick ? (
              <span class={cm.cn(cm.position('relative'))}>{selection()}</span>
            ) : (
              selection()
            )}
          </>
        )}
      </PresentWhileNode>
      {props.onToggleStar !== undefined ? starControl() : undefined}
      {/* React's `typeof sender === 'string'` avatar name and the rendered sender share one read. */}
      <ResolveNode node={props.sender}>
        {(sender) => {
          const senderName = (): string =>
            typeof sender() === 'string'
              ? (sender() as string)
              : t('inboxRow.sender', undefined, { defaultValue: 'Sender' })
          return (
            <>
              <Avatar
                src={props.senderAvatarSrc}
                alt={senderName()}
                name={senderName()}
                size="sm"
              />
              <div class={cm.cn(cm.flex1, cm.stack(0))} style={{ 'min-width': '0px' }}>
                {labelRows(sender)}
              </div>
            </>
          )
        }}
      </ResolveNode>
      {props.hasAttachment ? (
        <span
          aria-label={t('inboxRow.hasAttachment', undefined, { defaultValue: 'Has attachment' })}
        >
          📎
        </span>
      ) : undefined}
      {props.unread ? (
        <span aria-hidden="true" class={cm.bgTone('info')} style={dotStyle()} />
      ) : undefined}
      <PresentWhileNode node={props.timestamp}>
        {(timestamp) => <span class={cm.cn(cm.textSize('xs'), cm.shrink0)}>{timestamp()}</span>}
      </PresentWhileNode>
    </div>
  )
}
